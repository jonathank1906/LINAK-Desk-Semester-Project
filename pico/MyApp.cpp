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
}

void MyApp() {
    printf("=== MyApp starting ===\n");
    
    stdio_init_all();
    printf("stdio initialized\n");
    
    // Initialize OLED first
    oled_init();
    oled_display_text("SYSTEM", "STARTING...", "", "");
    printf("OLED initialized\n");
    
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
    oled_display_text("BUTTON LED", "PRESS BUTTON", "TO TOGGLE LED", "");
    printf("LED and Button initialized\n");
    
    // Main loop - handle both MQTT and button events
    printf("=== Entering main loop ===\n");
    while (true) {
        // Poll MQTT (non-blocking)
        mqtt_poll();
        
        // Check button events
        if (button1.hasEvent()) {
            RedLED.setState(button1.toggleState());
            
            char line2[20], line3[20];
            sprintf(line2, "PRESSES %d", button1.getPressCount());
            sprintf(line3, "LED %s", RedLED.isOn() ? "ON" : "OFF");
            
            oled_display_text("BUTTON STATUS", line2, line3, "");
            
            printf("Button pressed %d times, LED: %s\n",
                   button1.getPressCount(),
                   RedLED.isOn() ? "ON" : "OFF");
        }
        
        sleep_ms(10);
    }
}