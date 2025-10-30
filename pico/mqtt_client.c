/**
 * Copyright (c) 2022 Raspberry Pi (Trading) Ltd.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

#include "pico/stdlib.h"
#include "pico/cyw43_arch.h"
#include "pico/unique_id.h"
#include "hardware/gpio.h"
#include "hardware/irq.h"
#include "hardware/adc.h"
#include "lwip/apps/mqtt.h"
#include "lwip/apps/mqtt_priv.h"
#include "lwip/dns.h"

void mqtt_init();
void mqtt_poll();  // New function for non-blocking operation

// Temperature
#ifndef TEMPERATURE_UNITS
#define TEMPERATURE_UNITS 'C' // Set to 'F' for Fahrenheit
#endif

#ifndef MQTT_SERVER
#error Need to define MQTT_SERVER
#endif

#ifndef MQTT_TOPIC_LEN
#define MQTT_TOPIC_LEN 100
#endif

typedef struct {
    mqtt_client_t* mqtt_client_inst;
    struct mqtt_connect_client_info_t mqtt_client_info;
    char data[MQTT_OUTPUT_RINGBUF_SIZE];
    char topic[MQTT_TOPIC_LEN];
    uint32_t len;
    ip_addr_t mqtt_server_address;
    bool connect_done;
    int subscribe_count;
    bool stop_client;
} MQTT_CLIENT_DATA_T;

#ifndef DEBUG_printf
#ifndef NDEBUG
#define DEBUG_printf printf
#else
#define DEBUG_printf(...)
#endif
#endif

#ifndef INFO_printf
#define INFO_printf printf
#endif

#ifndef ERROR_printf
#define ERROR_printf printf
#endif

#ifndef WARN_printf
#define WARN_printf printf
#endif

// how often to measure our temperature
#define TEMP_WORKER_TIME_S 10

// keep alive in seconds
#define MQTT_KEEP_ALIVE_S 60

// qos passed to mqtt_subscribe
#define MQTT_SUBSCRIBE_QOS 1
#define MQTT_PUBLISH_QOS 1
#define MQTT_PUBLISH_RETAIN 0

// topic used for last will and testament
#define MQTT_WILL_TOPIC "/online"
#define MQTT_WILL_MSG "0"
#define MQTT_WILL_QOS 1

#ifndef MQTT_DEVICE_NAME
#define MQTT_DEVICE_NAME "pico"
#endif

// Set to 1 to add the client name to topics, to support multiple devices using the same server
#ifndef MQTT_UNIQUE_TOPIC
#define MQTT_UNIQUE_TOPIC 1
#endif

// Global state
static MQTT_CLIENT_DATA_T g_state;

static float read_onboard_temperature(const char unit) {
    const float conversionFactor = 3.3f / (1 << 12);
    float adc = (float)adc_read() * conversionFactor;
    float tempC = 27.0f - (adc - 0.706f) / 0.001721f;

    if (unit == 'C' || unit != 'F') {
        return tempC;
    } else if (unit == 'F') {
        return tempC * 9 / 5 + 32;
    }
    return -1.0f;
}

static void pub_request_cb(__unused void *arg, err_t err) {
    if (err != 0) {
        ERROR_printf("pub_request_cb failed %d\n", err);
    } else {
        DEBUG_printf("Publish successful\n");
    }
}

static const char *full_topic(MQTT_CLIENT_DATA_T *state, const char *name) {
#if MQTT_UNIQUE_TOPIC
    static char full_topic[MQTT_TOPIC_LEN];
    snprintf(full_topic, sizeof(full_topic), "/%s%s", state->mqtt_client_info.client_id, name);
    return full_topic;
#else
    return name;
#endif
}

static void control_led(MQTT_CLIENT_DATA_T *state, bool on) {
    const char* message = on ? "On" : "Off";
    INFO_printf("LED: %s\n", message);
    
    if (on)
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 1);
    else
        cyw43_arch_gpio_put(CYW43_WL_GPIO_LED_PIN, 0);

    mqtt_publish(state->mqtt_client_inst, full_topic(state, "/led/state"), 
                 message, strlen(message), MQTT_PUBLISH_QOS, MQTT_PUBLISH_RETAIN, 
                 pub_request_cb, state);
}

static void publish_temperature(MQTT_CLIENT_DATA_T *state) {
    static float old_temperature = 0;
    const char *temperature_key = full_topic(state, "/temperature");
    float temperature = read_onboard_temperature(TEMPERATURE_UNITS);
    
    if (temperature != old_temperature) {
        old_temperature = temperature;
        char temp_str[16];
        snprintf(temp_str, sizeof(temp_str), "%.2f", temperature);
        INFO_printf("Publishing temperature: %s°%c to %s\n", temp_str, TEMPERATURE_UNITS, temperature_key);
        mqtt_publish(state->mqtt_client_inst, temperature_key, temp_str, 
                    strlen(temp_str), MQTT_PUBLISH_QOS, MQTT_PUBLISH_RETAIN, 
                    pub_request_cb, state);
    }
}

static void sub_request_cb(void *arg, err_t err) {
    MQTT_CLIENT_DATA_T* state = (MQTT_CLIENT_DATA_T*)arg;
    if (err != 0) {
        ERROR_printf("Subscribe failed: %d\n", err);
        panic("subscribe request failed");
    }
    state->subscribe_count++;
    INFO_printf("Subscribed (count: %d)\n", state->subscribe_count);
}

static void unsub_request_cb(void *arg, err_t err) {
    MQTT_CLIENT_DATA_T* state = (MQTT_CLIENT_DATA_T*)arg;
    if (err != 0) {
        ERROR_printf("Unsubscribe failed: %d\n", err);
        panic("unsubscribe request failed");
    }
    state->subscribe_count--;
    INFO_printf("Unsubscribed (count: %d)\n", state->subscribe_count);
    assert(state->subscribe_count >= 0);

    if (state->subscribe_count <= 0 && state->stop_client) {
        INFO_printf("Disconnecting MQTT client\n");
        mqtt_disconnect(state->mqtt_client_inst);
    }
}

static void sub_unsub_topics(MQTT_CLIENT_DATA_T* state, bool sub) {
    INFO_printf("%s to topics\n", sub ? "Subscribing" : "Unsubscribing");
    mqtt_request_cb_t cb = sub ? sub_request_cb : unsub_request_cb;
    mqtt_sub_unsub(state->mqtt_client_inst, full_topic(state, "/led"), MQTT_SUBSCRIBE_QOS, cb, state, sub);
    mqtt_sub_unsub(state->mqtt_client_inst, full_topic(state, "/print"), MQTT_SUBSCRIBE_QOS, cb, state, sub);
    mqtt_sub_unsub(state->mqtt_client_inst, full_topic(state, "/ping"), MQTT_SUBSCRIBE_QOS, cb, state, sub);
    mqtt_sub_unsub(state->mqtt_client_inst, full_topic(state, "/exit"), MQTT_SUBSCRIBE_QOS, cb, state, sub);
}

static void mqtt_incoming_data_cb(void *arg, const u8_t *data, u16_t len, u8_t flags) {
    MQTT_CLIENT_DATA_T* state = (MQTT_CLIENT_DATA_T*)arg;
#if MQTT_UNIQUE_TOPIC
    const char *basic_topic = state->topic + strlen(state->mqtt_client_info.client_id) + 1;
#else
    const char *basic_topic = state->topic;
#endif
    strncpy(state->data, (const char *)data, len);
    state->len = len;
    state->data[len] = '\0';

    INFO_printf("Received: Topic='%s', Message='%s'\n", state->topic, state->data);
    
    if (strcmp(basic_topic, "/led") == 0) {
        if (lwip_stricmp(state->data, "On") == 0 || strcmp(state->data, "1") == 0)
            control_led(state, true);
        else if (lwip_stricmp(state->data, "Off") == 0 || strcmp(state->data, "0") == 0)
            control_led(state, false);
    } else if (strcmp(basic_topic, "/print") == 0) {
        INFO_printf("Print: %.*s\n", len, data);
    } else if (strcmp(basic_topic, "/ping") == 0) {
        char buf[11];
        snprintf(buf, sizeof(buf), "%u", to_ms_since_boot(get_absolute_time()) / 1000);
        INFO_printf("Ping received, sending uptime: %s seconds\n", buf);
        mqtt_publish(state->mqtt_client_inst, full_topic(state, "/uptime"), 
                    buf, strlen(buf), MQTT_PUBLISH_QOS, MQTT_PUBLISH_RETAIN, 
                    pub_request_cb, state);
    } else if (strcmp(basic_topic, "/exit") == 0) {
        INFO_printf("Exit command received\n");
        state->stop_client = true;
        sub_unsub_topics(state, false);
    }
}

static void mqtt_incoming_publish_cb(void *arg, const char *topic, u32_t tot_len) {
    MQTT_CLIENT_DATA_T* state = (MQTT_CLIENT_DATA_T*)arg;
    DEBUG_printf("Incoming publish: %s (%u bytes)\n", topic, tot_len);
    strncpy(state->topic, topic, sizeof(state->topic));
}

static void temperature_worker_fn(async_context_t *context, async_at_time_worker_t *worker) {
    MQTT_CLIENT_DATA_T* state = (MQTT_CLIENT_DATA_T*)worker->user_data;
    publish_temperature(state);
    async_context_add_at_time_worker_in_ms(context, worker, TEMP_WORKER_TIME_S * 1000);
}
static async_at_time_worker_t temperature_worker = { .do_work = temperature_worker_fn };

static void mqtt_connection_cb(mqtt_client_t *client, void *arg, mqtt_connection_status_t status) {
    MQTT_CLIENT_DATA_T* state = (MQTT_CLIENT_DATA_T*)arg;
    
    if (status == MQTT_CONNECT_ACCEPTED) {
        INFO_printf("✓ MQTT Connected!\n");
        state->connect_done = true;
        
        sub_unsub_topics(state, true);

        // Indicate online
        if (state->mqtt_client_info.will_topic) {
            mqtt_publish(state->mqtt_client_inst, state->mqtt_client_info.will_topic, 
                        "1", 1, MQTT_WILL_QOS, true, pub_request_cb, state);
        }

        // Start temperature publishing
        temperature_worker.user_data = state;
        async_context_add_at_time_worker_in_ms(cyw43_arch_async_context(), &temperature_worker, 0);
        
    } else if (status == MQTT_CONNECT_DISCONNECTED) {
        ERROR_printf("MQTT Disconnected\n");
        if (!state->connect_done) {
            panic("Failed to connect to MQTT server");
        }
    } else {
        ERROR_printf("MQTT Connection failed with status: %d\n", status);
        panic("MQTT connection error");
    }
}

static void start_client(MQTT_CLIENT_DATA_T *state) {
    INFO_printf("\n=== Starting MQTT Client ===\n");
    INFO_printf("Using non-TLS connection on port 1883\n");

    state->mqtt_client_inst = mqtt_client_new();
    if (!state->mqtt_client_inst) {
        panic("Failed to create MQTT client");
    }
    
    INFO_printf("Local IP: %s\n", ipaddr_ntoa(&(netif_list->ip_addr)));
    INFO_printf("Server IP: %s\n", ipaddr_ntoa(&state->mqtt_server_address));
    INFO_printf("Client ID: %s\n", state->mqtt_client_info.client_id);
    INFO_printf("Connecting to MQTT broker...\n");

    cyw43_arch_lwip_begin();
    err_t err = mqtt_client_connect(state->mqtt_client_inst, 
                                    &state->mqtt_server_address, 
                                    MQTT_PORT, 
                                    mqtt_connection_cb, 
                                    state, 
                                    &state->mqtt_client_info);
    if (err != ERR_OK) {
        ERROR_printf("mqtt_client_connect failed: %d\n", err);
        panic("MQTT connection error");
    }
    
    mqtt_set_inpub_callback(state->mqtt_client_inst, 
                           mqtt_incoming_publish_cb, 
                           mqtt_incoming_data_cb, 
                           state);
    cyw43_arch_lwip_end();
    INFO_printf("Waiting for connection...\n");
}

static void dns_found(const char *hostname, const ip_addr_t *ipaddr, void *arg) {
    MQTT_CLIENT_DATA_T *state = (MQTT_CLIENT_DATA_T*)arg;
    if (ipaddr) {
        INFO_printf("DNS resolved: %s -> %s\n", hostname, ipaddr_ntoa(ipaddr));
        state->mqtt_server_address = *ipaddr;
        start_client(state);
    } else {
        ERROR_printf("DNS lookup failed for %s\n", hostname);
        panic("DNS request failed");
    }
}

void mqtt_init(void) {
    
    sleep_ms(2000); // Wait for USB serial
    
    INFO_printf("\n\n=================================\n");
    INFO_printf("  Pico W MQTT Client (Local)\n");
    INFO_printf("=================================\n\n");

    adc_init();
    adc_set_temp_sensor_enabled(true);
    adc_select_input(4);

    if (cyw43_arch_init()) {
        panic("Failed to initialize CYW43");
    }

    // Generate unique device name
    char unique_id_buf[5];
    pico_get_unique_board_id_string(unique_id_buf, sizeof(unique_id_buf));
    for(int i = 0; i < sizeof(unique_id_buf) - 1; i++) {
        unique_id_buf[i] = tolower(unique_id_buf[i]);
    }

    static char client_id_buf[sizeof(MQTT_DEVICE_NAME) + sizeof(unique_id_buf) - 1];
    memcpy(&client_id_buf[0], MQTT_DEVICE_NAME, sizeof(MQTT_DEVICE_NAME) - 1);
    memcpy(&client_id_buf[sizeof(MQTT_DEVICE_NAME) - 1], unique_id_buf, sizeof(unique_id_buf) - 1);
    client_id_buf[sizeof(client_id_buf) - 1] = 0;
    
    INFO_printf("Device ID: %s\n", client_id_buf);

    // Configure MQTT client info
    g_state.mqtt_client_info.client_id = client_id_buf;
    g_state.mqtt_client_info.keep_alive = MQTT_KEEP_ALIVE_S;
    
#if defined(MQTT_USERNAME) && defined(MQTT_PASSWORD)
    g_state.mqtt_client_info.client_user = MQTT_USERNAME;
    g_state.mqtt_client_info.client_pass = MQTT_PASSWORD;
    INFO_printf("Auth: Username/Password configured\n");
#else
    g_state.mqtt_client_info.client_user = NULL;
    g_state.mqtt_client_info.client_pass = NULL;
    INFO_printf("Auth: Anonymous (no credentials)\n");
#endif

    static char will_topic[MQTT_TOPIC_LEN];
    strncpy(will_topic, full_topic(&g_state, MQTT_WILL_TOPIC), sizeof(will_topic));
    g_state.mqtt_client_info.will_topic = will_topic;
    g_state.mqtt_client_info.will_msg = MQTT_WILL_MSG;
    g_state.mqtt_client_info.will_qos = MQTT_WILL_QOS;
    g_state.mqtt_client_info.will_retain = true;

    // Connect to WiFi
    INFO_printf("\nConnecting to WiFi: %s\n", WIFI_SSID);
    cyw43_arch_enable_sta_mode();
    
    if (cyw43_arch_wifi_connect_timeout_ms(WIFI_SSID, WIFI_PASSWORD, CYW43_AUTH_WPA2_AES_PSK, 30000)) {
        panic("WiFi connection failed");
    }
    INFO_printf("✓ Connected to WiFi\n");

    // DNS lookup for MQTT server
    INFO_printf("\nResolving MQTT server: %s\n", MQTT_SERVER);
    cyw43_arch_lwip_begin();
    int err = dns_gethostbyname(MQTT_SERVER, &g_state.mqtt_server_address, dns_found, &g_state);
    cyw43_arch_lwip_end();

    if (err == ERR_OK) {
        INFO_printf("Using cached DNS result\n");
        start_client(&g_state);
    } else if (err != ERR_INPROGRESS) {
        panic("DNS request failed");
    }

    INFO_printf("\n=== MQTT initialization complete ===\n\n");
}

// Non-blocking poll function
void mqtt_poll(void) {
    if (!g_state.connect_done || mqtt_client_is_connected(g_state.mqtt_client_inst)) {
        cyw43_arch_poll();
    }
}