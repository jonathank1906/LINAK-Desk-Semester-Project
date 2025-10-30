#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/gpio.h"
#include "dbop.h"
#include "MyApp.h"

extern "C" {
    void oled_init();
    void oled_display_text(char *line1, char *line2, char *line3, char *line4);
    void mqtt_init(void);
    void mqtt_poll(void);  // Non-blocking MQTT polling
    
    // WS2812 functions
    #include "ws2812.h"
}

void MyApp() {
    printf("=== MyApp starting ===\n");
    
    stdio_init_all();
    printf("stdio initialized\n");
    
    // Initialize OLED first
    oled_init();
    oled_display_text("SYSTEM", "STARTING...", "", "");
    printf("OLED initialized\n");
    
    // Initialize WS2812 LED strip
    PIO ws2812_pio;
    uint ws2812_sm;
    uint ws2812_offset;
    ws2812_init(&ws2812_pio, &ws2812_sm, &ws2812_offset);
    printf("WS2812 LED strip initialized\n");
    
    // Set initial color to solid green
    pattern_solid_green(ws2812_pio, ws2812_sm, NUM_PIXELS, 50);
    printf("LED strip set to green\n");
    
    // Initialize MQTT (non-blocking now)
    printf("Starting MQTT/WiFi...\n");
    mqtt_init();
    printf("MQTT initialization complete\n");
    
    // Wait for MQTT to connect
    printf("Waiting for MQTT connection...\n");
    for (int i = 0; i < 100; i++) {
        mqtt_poll();
        sleep_ms(100);
    }
    
    // Initialize LED and Button after WiFi is stable
    printf("Initializing LED and Button...\n");
    Led RedLED(7);
    Button button1(10, GPIO_IRQ_EDGE_RISE);
    oled_display_text("BUTTON LED", "PRESS BUTTON", "TO TOGGLE", "LED & STRIP");
    printf("LED and Button initialized\n");
    
    // Main loop - handle MQTT, button events, and LED strip
    printf("=== Entering main loop ===\n");
    while (true) {
        // Poll MQTT (non-blocking)
        mqtt_poll();
        
        // Check button events
        if (button1.hasEvent()) {
            bool ledState = button1.toggleState();
            RedLED.setState(ledState);
            
            // Update WS2812 LED strip based on button state
            if (ledState) {
                // LED ON - show green
                pattern_solid_green(ws2812_pio, ws2812_sm, NUM_PIXELS, 50);
            } else {
                // LED OFF - turn strip off (all pixels black)
                for (int i = 0; i < NUM_PIXELS; i++) {
                    put_pixel(ws2812_pio, ws2812_sm, 0);
                }
            }
            
            char line2[20], line3[20], line4[20];
            sprintf(line2, "PRESSES %d", button1.getPressCount());
            sprintf(line3, "LED %s", RedLED.isOn() ? "ON" : "OFF");
            sprintf(line4, "STRIP %s", RedLED.isOn() ? "GREEN" : "OFF");
            
            oled_display_text("BUTTON STATUS", line2, line3, line4);
            
            printf("Button pressed %d times, LED: %s, Strip: %s\n",
                   button1.getPressCount(),
                   RedLED.isOn() ? "ON" : "OFF",
                   RedLED.isOn() ? "GREEN" : "OFF");
        }
        
        sleep_ms(10);
    }
}