#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "dbop.h"
#include "MyApp.h"
#include "Buzzer.h"
#include "globals.h"
#include "mqtt_client.h"
#include "led_mode.h"
#include "buzzer_mode.h"

static uint led_anim_t = 0;
LedMode current_led_mode = LED_MODE_NONE;
BuzzerMode current_buzzer_mode = BUZZER_MODE_NONE;
static volatile bool flash_led_flag = false;

// Global desk name storage (non-static so mqtt_client.c can access it)
char desk_display_name[32] = "DESK #1";  // Default fallback

extern "C"
{
    void oled_init();
    void oled_display_text(char *line1, char *line2, char *line3, char *line4);
    void mqtt_init(void);
    void mqtt_poll(void);                   // Non-blocking MQTT polling
    void publish_desk_confirm(void *state); // From mqtt_client.c
    void publish_pico_ready(void *state);
    void set_pending_verification(bool state); // To be called from mqtt_client.c

// WS2812 functions
#include "ws2812.h"
}

PIO ws2812_pio;
uint ws2812_sm;
uint ws2812_offset;

// Helper function to set desk name
extern "C" void set_desk_name(const char *name)
{
    if (name && strlen(name) > 0)
    {
        snprintf(desk_display_name, sizeof(desk_display_name), "%s", name);
        printf("DEBUG: Desk name updated to: %s\n", desk_display_name);
    }
}

// Allow mqtt_client.c to set pending_verification
extern "C" void set_pending_verification(bool state)
{
    pending_verification = state;
    printf("DEBUG: set_pending_verification called, state = %s\n", state ? "true" : "false");
    if (state)
    {
        oled_display_text(desk_display_name, "Verification", "Pending...", "");
        printf("DEBUG: OLED updated for pending verification\n");
    }
    else
    {
        oled_display_text(desk_display_name, "Available", "", "");
        printf("DEBUG: OLED updated for desk available/released\n");
    }
}

void MyApp()
{
    printf("=== MyApp starting ===\n");

    stdio_init_all();
    printf("DEBUG: stdio initialized\n");

    // Initialize OLED first
    oled_init();
    oled_display_text("SYSTEM", "STARTING...", "", "");
    printf("DEBUG: OLED initialized and starting message displayed\n");

    // Initialize WS2812 LED strip

    ws2812_init(&ws2812_pio, &ws2812_sm, &ws2812_offset);
    printf("DEBUG: WS2812 LED strip initialized\n");

    buzzer_init();
    printf("DEBUG: Buzzer initialized\n");

    // Initialize MQTT (non-blocking now)
    printf("DEBUG: Starting MQTT/WiFi...\n");
    mqtt_init();
    printf("DEBUG: MQTT initialization complete\n");

    // Wait for MQTT to connect
    printf("DEBUG: Waiting for MQTT connection...\n");
    while (!mqtt_is_connected())
    {
        mqtt_poll();
        sleep_ms(100);
    }
    printf("DEBUG: MQTT connected!\n");


    // Immediately publish ready after connecting
    publish_pico_ready(get_mqtt_state());

    // Initialize LED and Button after WiFi is stable
    printf("DEBUG: Initializing LED and Button...\n");
    Led RedLED(7);
    Button button1(10, GPIO_IRQ_EDGE_RISE);
    printf("DEBUG: LED and Button initialized\n");

    // Main loop - handle MQTT, button events, and LED strip
    printf("=== Entering main loop ===\n");
    int loop_count = 0;
    while (true)
    {
        // Poll MQTT (non-blocking)
        mqtt_poll();
        if (loop_count % 100 == 0)
        {
            printf("DEBUG: Main loop iteration %d, pending_verification = %s\n", loop_count, pending_verification ? "true" : "false");
        }

        loop_count++;

        // Check button events
        if (button1.hasEvent())
        {
            printf("DEBUG: Button event detected\n");
            // Set flag to flash LED
            flash_led_flag = true;

            RedLED.off();

            // Hotdesk verification: If pending, publish confirmation
            if (pending_verification)
            {
                printf("DEBUG: Pending verification detected, publishing desk confirmation via MQTT\n");
                publish_desk_confirm(get_mqtt_state());
                pending_verification = false;
                oled_display_text(desk_display_name, "Confirmed!", "", "");
                printf("DEBUG: Desk confirmation published via MQTT and OLED updated\n");
            }
            else
            {
                printf("DEBUG: Button pressed, but no pending verification\n");
            }
        }
        else
        {
            RedLED.on();
        }

        switch (current_led_mode)
        {
        case LED_MODE_PATTERN_YELLOW:
            pattern_yellow(ws2812_pio, ws2812_sm, NUM_PIXELS, led_anim_t);
            led_anim_t = (led_anim_t + 8) % 360;
            break;
        case LED_MODE_PATTERN_BLUE:
            pattern_blue(ws2812_pio, ws2812_sm, NUM_PIXELS, led_anim_t);
            led_anim_t = (led_anim_t + 1) % 360;
            break;
        case LED_MODE_PATTERN_WHITE:
            pattern_white(ws2812_pio, ws2812_sm, NUM_PIXELS, led_anim_t);
            led_anim_t = (led_anim_t + 1) % 360;
            break;
        case LED_MODE_SOLID_GREEN:
            pattern_solid_green(ws2812_pio, ws2812_sm, NUM_PIXELS, 50);
            break;
        case LED_MODE_SOLID_RED:
            pattern_solid_red(ws2812_pio, ws2812_sm, NUM_PIXELS, 50);
            break;
        case LED_MODE_SOLID_BLUE:
            pattern_solid_blue(ws2812_pio, ws2812_sm, NUM_PIXELS, 50);
            break;
        default:
            break;
        }
        switch (current_buzzer_mode)
        {
        case BUZZER_MODE_MOVING:
            moving_buzzer_pattern();
            //current_buzzer_mode = BUZZER_MODE_NONE;
            break;
        case BUZZER_MODE_CONFIRM:
            // confirm_buzzer_pattern();
            current_buzzer_mode = BUZZER_MODE_NONE;
            break;
        case BUZZER_MODE_ERROR:
            // error_buzzer_pattern();
            current_buzzer_mode = BUZZER_MODE_NONE;
            break;
        case BUZZER_MODE_STARTUP:
            //  startup_buzzer_pattern();
            current_buzzer_mode = BUZZER_MODE_NONE;
            break;
        default:
            break;
        }
        sleep_ms(10);
    }
}