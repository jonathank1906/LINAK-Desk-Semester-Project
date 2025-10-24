#include <stdio.h>
#include "pico/stdlib.h"
#include "dbop.h"
#include "MyApp.h"

extern "C" {
    void oled_init();
    void oled_display_text(char *line1, char *line2, char *line3, char *line4);
}

void MyApp() {
    Led RedLED(7);
    Button button1(10, GPIO_IRQ_EDGE_RISE);
    
    // Initialize OLED once at startup
    oled_init();
    
    // Display initial message
    oled_display_text("BUTTON LED", "PRESS BUTTON", "TO TOGGLE LED", "");

    while (true) {
        if (button1.hasEvent()) {
            RedLED.setState(button1.toggleState());
            
            // Update OLED with current status
            char line1[20], line2[20];
            sprintf(line1, "PRESSES %d", button1.getPressCount());
            sprintf(line2, "LED %s", RedLED.isOn() ? "ON" : "OFF");
            oled_display_text("BUTTON STATUS", line1, line2, "");
            
            printf("Button pressed %d times, LED: %s\n",
                   button1.getPressCount(),
                   RedLED.isOn() ? "ON" : "OFF");
        }

        sleep_ms(10);
    }
}