#ifndef LED_MODE_H
#define LED_MODE_H

typedef enum {
    LED_MODE_NONE,
    LED_MODE_PATTERN_BLUE,     
    LED_MODE_PATTERN_PURPLE,
    LED_MODE_SOLID_BLUE,
    LED_MODE_SOLID_GREEN,
    LED_MODE_SOLID_RED,
    LED_MODE_PATTERN_YELLOW,
    LED_MODE_PATTERN_WHITE
} LedMode;

extern LedMode current_led_mode;

#endif