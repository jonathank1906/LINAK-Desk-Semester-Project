#include <stdio.h>
#include <string.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "dbop.h"
#include "MyApp.h"
#include "Buzzer.h"
#include "globals.h"
#include "mqtt_client.h"

extern "C"
{
    void oled_init();
    void oled_display_text(char *line1, char *line2, char *line3, char *line4);
    void mqtt_init(void);
    void mqtt_poll(void);                      // Non-blocking MQTT polling
    void publish_desk_confirm(void *state);    // From mqtt_client.c
    void set_pending_verification(bool state); // To be called from mqtt_client.c

// WS2812 functions
#include "ws2812.h"
}

PIO ws2812_pio;
uint ws2812_sm;
uint ws2812_offset;

// Allow mqtt_client.c to set pending_verification
extern "C" void set_pending_verification(bool state)
{
    pending_verification = state;
    printf("DEBUG: set_pending_verification called, state = %s\n", state ? "true" : "false");
    if (state)
    {
        oled_display_text("DESK #1", "Verification", "Pending...", "");
        printf("DEBUG: OLED updated for pending verification\n");
    }
    else
    {
        oled_display_text("DESK #1", "Verification", "Cleared", "");
        printf("DEBUG: OLED updated for verification cleared\n");
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

    // Set initial color to solid green
    pattern_solid_green(ws2812_pio, ws2812_sm, NUM_PIXELS, 50);
    printf("DEBUG: LED strip set to green\n");

    // Initialize MQTT (non-blocking now)
    printf("DEBUG: Starting MQTT/WiFi...\n");
    mqtt_init();
    printf("DEBUG: MQTT initialization complete\n");

    // Wait for MQTT to connect
    printf("DEBUG: Waiting for MQTT connection...\n");
    for (int i = 0; i < 100; i++)
    {
        mqtt_poll();
        sleep_ms(100);
    }
    printf("DEBUG: MQTT connection wait complete\n");

    // Initialize LED and Button after WiFi is stable
    printf("DEBUG: Initializing Button...\n");
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
            bool ledState = button1.toggleState();

            // Hotdesk verification: If pending, publish confirmation
            if (pending_verification)
            {
                printf("DEBUG: Pending verification detected, publishing desk confirmation via MQTT\n");
                publish_desk_confirm(get_mqtt_state());
                pending_verification = false;
                oled_display_text("DESK #1", "Confirmed!", "", "");
                printf("DEBUG: Desk confirmation published via MQTT and OLED updated\n");
            }
            else
            {
                printf("DEBUG: Button pressed, but no pending verification\n");
            }
        }

        sleep_ms(10);
    }
}