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
#include "ssd1306_i2c.h"
#include "globals.h"
#include "ws2812.h"
#include "Buzzer.h"
#include "led_mode.h"
#include "buzzer_mode.h"
#include "wifi_config.h"

#ifdef __cplusplus
extern "C"
{
#endif
    extern void set_pending_verification(bool state);
#ifdef __cplusplus
}
#endif

void mqtt_init();
void mqtt_poll();

#ifndef MQTT_SERVER
#error Need to define MQTT_SERVER
#endif

#ifndef MQTT_TOPIC_LEN
#define MQTT_TOPIC_LEN 100
#endif

typedef struct
{
    mqtt_client_t *mqtt_client_inst;
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

// keep alive in seconds
#define MQTT_KEEP_ALIVE_S 60

// qos passed to mqtt_subscribe
#define MQTT_SUBSCRIBE_QOS 1
#define MQTT_PUBLISH_QOS 1
#define MQTT_PUBLISH_RETAIN 0

#ifndef MQTT_DEVICE_NAME
#define MQTT_DEVICE_NAME "pico"
#endif

// Set to 1 to add the client name to topics, to support multiple devices using the same server
#ifndef MQTT_UNIQUE_TOPIC
#define MQTT_UNIQUE_TOPIC 1
#endif

// Global state
static MQTT_CLIENT_DATA_T g_state;
extern PIO ws2812_pio;
extern uint ws2812_sm;
extern uint ws2812_offset;
extern LedMode current_led_mode;
extern BuzzerMode current_buzzer_mode;

// Desk name and ID - learned from MQTT messages
extern char desk_display_name[32];
extern void set_desk_name(const char *name);
static bool desk_name_initialized = false;
static int desk_id = 0;  // Learned dynamically
static bool desk_id_initialized = false;


static void pub_request_cb(__unused void *arg, err_t err)
{
    if (err != 0)
    {
        ERROR_printf("pub_request_cb failed %d\n", err);
    }
    else
    {
        DEBUG_printf("Publish successful\n");
    }
}

static const char *full_topic(MQTT_CLIENT_DATA_T *state, const char *name)
{
#if MQTT_UNIQUE_TOPIC
    static char full_topic[MQTT_TOPIC_LEN];
    snprintf(full_topic, sizeof(full_topic), "/%s%s", state->mqtt_client_info.client_id, name);
    return full_topic;
#else
    return name;
#endif
}

void publish_desk_confirm(MQTT_CLIENT_DATA_T *state)
{
    if (!desk_id_initialized) {
        printf("ERROR: Cannot publish confirm - desk_id not initialized\n");
        return;
    }
    
    printf("DEBUG: publish_desk_confirm called\n");
    
    char confirm_topic[MQTT_TOPIC_LEN];
    snprintf(confirm_topic, sizeof(confirm_topic), "/desk/%d/confirm", desk_id);
    
    const char *confirm_msg = "{\"action\": \"confirm_button\"}";
    printf("DEBUG: Publishing to topic: %s, message: %s\n", confirm_topic, confirm_msg);
    mqtt_publish(state->mqtt_client_inst, confirm_topic, confirm_msg, strlen(confirm_msg), 
                 MQTT_PUBLISH_QOS, MQTT_PUBLISH_RETAIN, pub_request_cb, state);
}

void publish_pico_ready(MQTT_CLIENT_DATA_T* state) {
    printf("DEBUG: publish_pico_ready called\n");

    char ready_topic[MQTT_TOPIC_LEN];
    if (desk_id_initialized) {
        snprintf(ready_topic, sizeof(ready_topic), "/desk/%d/pico/ready", desk_id);
    } else {
        snprintf(ready_topic, sizeof(ready_topic), "/pico/ready");
    }

    const char* mac_str = state->mqtt_client_info.client_id;
    char ready_msg[128];
    
    if (desk_id_initialized) {
        snprintf(ready_msg, sizeof(ready_msg),
                 "{\"status\": \"ready\", \"pico_mac\": \"%s\", \"desk_id\": %d}", 
                 mac_str, desk_id);
    } else {
        snprintf(ready_msg, sizeof(ready_msg),
                 "{\"status\": \"ready\", \"pico_mac\": \"%s\"}", mac_str);
    }

    printf("DEBUG: Publishing ready to topic: %s\n", ready_topic);
    printf("DEBUG: Message: %s\n", ready_msg);

    mqtt_publish(state->mqtt_client_inst, ready_topic,
                 ready_msg, strlen(ready_msg),
                 MQTT_PUBLISH_QOS, MQTT_PUBLISH_RETAIN,
                 pub_request_cb, state);

    printf("DEBUG: Ready message published\n");
}

static void sub_request_cb(void *arg, err_t err)
{
    MQTT_CLIENT_DATA_T *state = (MQTT_CLIENT_DATA_T *)arg;
    if (err != 0)
    {
        ERROR_printf("Subscribe failed: %d\n", err);
        panic("subscribe request failed");
    }
    state->subscribe_count++;
    INFO_printf("Subscribed (count: %d)\n", state->subscribe_count);
}

static void unsub_request_cb(void *arg, err_t err)
{
    MQTT_CLIENT_DATA_T *state = (MQTT_CLIENT_DATA_T *)arg;
    if (err != 0)
    {
        ERROR_printf("Unsubscribe failed: %d\n", err);
        panic("unsubscribe request failed");
    }
    state->subscribe_count--;
    INFO_printf("Unsubscribed (count: %d)\n", state->subscribe_count);
    assert(state->subscribe_count >= 0);

    if (state->subscribe_count <= 0 && state->stop_client)
    {
        INFO_printf("Disconnecting MQTT client\n");
        mqtt_disconnect(state->mqtt_client_inst);
    }
}

static void sub_unsub_topics(MQTT_CLIENT_DATA_T *state, bool sub)
{
    INFO_printf("%s to topics\n", sub ? "Subscribing" : "Unsubscribing");
    mqtt_request_cb_t cb = sub ? sub_request_cb : unsub_request_cb;
    mqtt_sub_unsub(state->mqtt_client_inst, full_topic(state, "/print"), MQTT_SUBSCRIBE_QOS, cb, state, sub);
    mqtt_sub_unsub(state->mqtt_client_inst, full_topic(state, "/ping"), MQTT_SUBSCRIBE_QOS, cb, state, sub);
    mqtt_sub_unsub(state->mqtt_client_inst, full_topic(state, "/exit"), MQTT_SUBSCRIBE_QOS, cb, state, sub);
}

static void mqtt_incoming_data_cb(void *arg, const u8_t *data, u16_t len, u8_t flags)
{
    MQTT_CLIENT_DATA_T *state = (MQTT_CLIENT_DATA_T *)arg;
#if MQTT_UNIQUE_TOPIC
    const char *basic_topic = state->topic + strlen(state->mqtt_client_info.client_id) + 1;
#else
    const char *basic_topic = state->topic;
#endif
    strncpy(state->data, (const char *)data, len);
    state->len = len;
    state->data[len] = '\0';

    printf("DEBUG: MQTT message received on topic: %s\n", state->topic);
    printf("DEBUG: MQTT payload: %s\n", state->data);
    printf("DEBUG: basic_topic = '%s'\n", basic_topic);
    
    // Extract desk_id FIRST (if not already initialized)
 
    char *desk_id_start = strstr(state->data, "\"desk_id\"");
    if (desk_id_start)
    {
        int temp_desk_id;
        if (sscanf(desk_id_start, "\"desk_id\": %d", &temp_desk_id) == 1 ||
            sscanf(desk_id_start, "\"desk_id\":%d", &temp_desk_id) == 1)
        {
            desk_id = temp_desk_id;
            if (!desk_id_initialized)
            {
                desk_id_initialized = true;
                printf("DEBUG: Desk ID initialized to: %d\n", desk_id);
                
                char desk_topic[MQTT_TOPIC_LEN];
                snprintf(desk_topic, sizeof(desk_topic), "/desk/%d/display", desk_id);
                printf("DEBUG: Subscribing to desk-specific topic: %s\n", desk_topic);
                mqtt_sub_unsub(state->mqtt_client_inst, desk_topic, MQTT_SUBSCRIBE_QOS, 
                             sub_request_cb, state, true);
            }
        }
    }
    
    

    char *desk_name_start = strstr(state->data, "\"desk_name\"");
    if (desk_name_start)
    {
        char *value_start = strchr(desk_name_start + 11, '"');
        if (value_start)
        {
            value_start++;
            char *end_quote = strchr(value_start, '"');
            if (end_quote)
            {
                int name_len = end_quote - value_start;
                if (name_len > 0 && name_len < 32)
                {
                    strncpy(desk_display_name, value_start, name_len);
                    desk_display_name[name_len] = '\0';
                    
                    if (!desk_name_initialized) {
                        desk_name_initialized = true;
                        printf("DEBUG: Desk name initialized to: %s\n", desk_display_name);
                    }
                }
            }
        }
    }
    
    
    if (strcmp(basic_topic, "/print") == 0)
    {
        INFO_printf("Print: %.*s\n", len, data);
    }
    else if (strcmp(basic_topic, "/ping") == 0)
    {
        char buf[11];
        snprintf(buf, sizeof(buf), "%u", to_ms_since_boot(get_absolute_time()) / 1000);
        INFO_printf("Ping received, sending uptime: %s seconds\n", buf);
        mqtt_publish(state->mqtt_client_inst, full_topic(state, "/uptime"),
                     buf, strlen(buf), MQTT_PUBLISH_QOS, MQTT_PUBLISH_RETAIN,
                     pub_request_cb, state);
    }
    else if (strcmp(basic_topic, "/exit") == 0)
    {
        INFO_printf("Exit command received\n");
        state->stop_client = true;
        sub_unsub_topics(state, false);
    }
    // Check if this matches the pattern /desk/{any_number}/display
    else if (strstr(state->topic, "/desk/") && strstr(state->topic, "/display"))
    {
        printf("DEBUG: Handling desk display topic\n");
        printf("DEBUG: Full message: %s\n", state->data);

        if (strstr(state->data, "show_available"))
        {
            printf("DEBUG: Action is show_available\n");
            oled_display_text(desk_display_name, "Available", "", "");
            set_pending_verification(false);

            current_led_mode = LED_MODE_SOLID_GREEN;
            current_buzzer_mode = BUZZER_MODE_NONE;
            
            printf("DEBUG: Set LED to GREEN mode\n");
        }
        else if (strstr(state->data, "show_confirm_button"))
        {
            printf("DEBUG: Action is show_confirm_button\n");
            oled_display_text(desk_display_name, "Please press", "button to", "confirm");
            set_pending_verification(true);

            current_led_mode = LED_MODE_PATTERN_WHITE;
            current_buzzer_mode = BUZZER_MODE_NONE;
            
            printf("DEBUG: Set LED to WHITE PATTERN mode\n");
        }
        else if (strstr(state->data, "cancel_pending_verification"))
        {
            printf("DEBUG: Action is cancel_pending_verification\n");
            oled_display_text(desk_display_name, "Verification", "Cancelled", "");
            set_pending_verification(false);

            current_led_mode = LED_MODE_SOLID_GREEN;
            current_buzzer_mode = BUZZER_MODE_NONE;

            printf("DEBUG: Set LED to GREEN mode (cancelled)\n");
        }
        else if (strstr(state->data, "show_in_use"))
        {
            printf("DEBUG: Action is show_in_use\n");

            char user_name[20] = "User";
            char height_str[10] = "";

            char *user_start = strstr(state->data, "\"user\":");
            if (user_start)
            {
                sscanf(user_start, "\"user\":\"%19[^\"]\"", user_name);
            }

            char *height_start = strstr(state->data, "\"height\":");
            if (height_start)
            {
                int height;
                sscanf(height_start, "\"height\":%d", &height);
                snprintf(height_str, sizeof(height_str), "%dcm", height);
            }

            oled_display_text(desk_display_name, user_name, height_str, "In Use");
            set_pending_verification(false);

            current_led_mode = LED_MODE_SOLID_BLUE;
            current_buzzer_mode = BUZZER_MODE_NONE;
            
            printf("DEBUG: Set LED to BLUE SOLID mode (in use)\n");
        }
        else if (strstr(state->data, "update_height"))
        {
            printf("DEBUG: Action is update_height\n");

            int height;
            char *height_start = strstr(state->data, "\"height\":");
            if (height_start)
            {
                sscanf(height_start, "\"height\":%d", &height);

                char line3[20];
                snprintf(line3, sizeof(line3), "Height: %dcm", height);
                oled_display_text(desk_display_name, "In Use", line3, "");

                bool is_moving = (strstr(state->data, "\"is_moving\": true") != NULL || 
                                 strstr(state->data, "\"is_moving\":true") != NULL);
                
                printf("DEBUG: is_moving = %s\n", is_moving ? "true" : "false");
                
                if (is_moving)
                {
                    current_led_mode = LED_MODE_PATTERN_YELLOW;  
                    current_buzzer_mode = BUZZER_MODE_MOVING;
                    printf("DEBUG: Set LED to YELLOW PULSING (moving)\n");
                }
                else
                {
                    current_led_mode = LED_MODE_SOLID_BLUE;
                    current_buzzer_mode = BUZZER_MODE_NONE;
                    printf("DEBUG: Set LED to BLUE SOLID (stopped)\n");
                }
            }
        }
        else if (strstr(state->data, "show_error") || strstr(state->data, "error"))
        {
            printf("DEBUG: Action is show_error\n");
            oled_display_text(desk_display_name, "ERROR", "Check desk", "");

            current_led_mode = LED_MODE_SOLID_RED;
            current_buzzer_mode = BUZZER_MODE_NONE;
            
            printf("DEBUG: Set LED to RED mode\n");
        }
        else
        {
            printf("DEBUG: Unknown action in payload: %s\n", state->data);
        }
    }
}

static void mqtt_incoming_publish_cb(void *arg, const char *topic, u32_t tot_len)
{
    MQTT_CLIENT_DATA_T *state = (MQTT_CLIENT_DATA_T *)arg;
    printf("DEBUG: Incoming publish: %s (%u bytes)\n", topic, tot_len);
    strncpy(state->topic, topic, sizeof(state->topic));
}

static void mqtt_connection_cb(mqtt_client_t *client, void *arg, mqtt_connection_status_t status)
{
    MQTT_CLIENT_DATA_T *state = (MQTT_CLIENT_DATA_T *)arg;

    if (status == MQTT_CONNECT_ACCEPTED)
    {
        INFO_printf("MQTT Connected!\n");
        state->connect_done = true;

        sub_unsub_topics(state, true);

        // Subscribe to wildcard to receive messages for any desk
        const char *desk_display_topic = "/desk/+/display";
        printf("DEBUG: Subscribing to wildcard topic: %s\n", desk_display_topic);
        mqtt_sub_unsub(state->mqtt_client_inst, desk_display_topic, MQTT_SUBSCRIBE_QOS, 
                      sub_request_cb, state, true);
        
        publish_pico_ready(state);
    }
    else if (status == MQTT_CONNECT_DISCONNECTED)
    {
        ERROR_printf("MQTT Disconnected\n");
        if (!state->connect_done)
        {
            panic("Failed to connect to MQTT server");
        }
    }
    else
    {
        ERROR_printf("MQTT Connection failed with status: %d\n", status);
        panic("MQTT connection error");
    }
}

static void start_client(MQTT_CLIENT_DATA_T *state)
{
    INFO_printf("\n=== Starting MQTT Client ===\n");
    INFO_printf("Using non-TLS connection on port 1883\n");

    state->mqtt_client_inst = mqtt_client_new();
    if (!state->mqtt_client_inst)
    {
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
    if (err != ERR_OK)
    {
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

static void dns_found(const char *hostname, const ip_addr_t *ipaddr, void *arg)
{
    MQTT_CLIENT_DATA_T *state = (MQTT_CLIENT_DATA_T *)arg;
    if (ipaddr)
    {
        INFO_printf("DNS resolved: %s -> %s\n", hostname, ipaddr_ntoa(ipaddr));
        state->mqtt_server_address = *ipaddr;
        start_client(state);
    }
    else
    {
        ERROR_printf("DNS lookup failed for %s\n", hostname);
        panic("DNS request failed");
    }
}

void mqtt_init(void)
{
    sleep_ms(2000); // Wait for USB serial

    INFO_printf("\n\n=================================\n");
    INFO_printf("  Pico W MQTT Client (Local)\n");
    INFO_printf("=================================\n\n");

    adc_init();

    if (cyw43_arch_init())
    {
        panic("Failed to initialize CYW43");
    }

    // Connect to WiFi FIRST
    INFO_printf("\nConnecting to WiFi: %s\n", WIFI_SSID);
    cyw43_arch_enable_sta_mode();

    if (cyw43_arch_wifi_connect_timeout_ms(WIFI_SSID, WIFI_PASSWORD, CYW43_AUTH_WPA2_AES_PSK, 30000))
    {
        panic("WiFi connection failed");
    }
    INFO_printf("Connected to WiFi\n");
    INFO_printf("IP Address: %s\n", ip4addr_ntoa(netif_ip4_addr(netif_list)));

    uint8_t mac[6];
    cyw43_hal_get_mac(CYW43_ITF_STA, mac);
    
    static char mac_address_buf[18];
    snprintf(mac_address_buf, sizeof(mac_address_buf), 
             "%02X:%02X:%02X:%02X:%02X:%02X",
             mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    
    INFO_printf("WiFi MAC Address: %s\n", mac_address_buf);

    // Configure MQTT client info using MAC as client ID
    g_state.mqtt_client_info.client_id = mac_address_buf;
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

    // DNS lookup for MQTT server
    INFO_printf("\nResolving MQTT server: %s\n", MQTT_SERVER);
    cyw43_arch_lwip_begin();
    int err = dns_gethostbyname(MQTT_SERVER, &g_state.mqtt_server_address, dns_found, &g_state);
    cyw43_arch_lwip_end();

    if (err == ERR_OK)
    {
        INFO_printf("Using cached DNS result\n");
        start_client(&g_state);
    }
    else if (err != ERR_INPROGRESS)
    {
        panic("DNS request failed");
    }

    INFO_printf("\n=== MQTT initialization complete ===\n\n");
}

MQTT_CLIENT_DATA_T *get_mqtt_state(void)
{
    return &g_state;
}

bool mqtt_is_connected(void)
{
    return g_state.connect_done;
}


void mqtt_poll(void)
{
    cyw43_arch_poll();
}