#ifndef LED_MODE_H
#define LED_MODE_H

typedef enum {
    LED_MODE_NONE,
    LED_MODE_GREYS,
    LED_MODE_GREYS_RED,      
    LED_MODE_GREYS_BLUE,     
    LED_MODE_GREYS_GREEN,    
    LED_MODE_GREYS_PURPLE,
    LED_MODE_SNAKES,
    LED_MODE_PULSE_BLUE,
    LED_MODE_SOLID_BLUE,
    LED_MODE_SOLID_GREEN,
    LED_MODE_SOLID_RED,
    LED_MODE_PULSE_YELLOW
} LedMode;

extern LedMode current_led_mode;

#endif