#ifndef WS2812_H
#define WS2812_H

#include "hardware/pio.h"
#include <stdint.h>

#define IS_RGBW false
#define NUM_PIXELS 150
#define WS2812_PIN 6

// Initialize WS2812
void ws2812_init(PIO *pio, uint *sm, uint *offset);

// Pattern functions with brightness parameter (0-255)
void pattern_solid_green(PIO pio, uint sm, uint len, uint brightness);
void pattern_solid_red(PIO pio, uint sm, uint len, uint brightness);
void pattern_snakes(PIO pio, uint sm, uint len, uint t);
void pattern_random(PIO pio, uint sm, uint len, uint t);
void pattern_sparkle(PIO pio, uint sm, uint len, uint t);
void pattern_greys(PIO pio, uint sm, uint len, uint t);
void pattern_solid_blue(PIO pio, uint sm, uint num_pixels, uint8_t brightness);
void pattern_pulse_blue(PIO pio, uint sm, uint num_pixels, uint8_t brightness);
void pattern_pulse_yellow(PIO pio, uint sm, uint num_pixels, uint8_t brightness);

// Utility functions - declared as static inline
static inline void put_pixel(PIO pio, uint sm, uint32_t pixel_grb);
static inline uint32_t urgb_u32(uint8_t r, uint8_t g, uint8_t b);
static inline uint32_t urgbw_u32(uint8_t r, uint8_t g, uint8_t b, uint8_t w);

// Inline implementations
static inline void put_pixel(PIO pio, uint sm, uint32_t pixel_grb) {
    pio_sm_put_blocking(pio, sm, pixel_grb << 8u);
}

static inline uint32_t urgb_u32(uint8_t r, uint8_t g, uint8_t b) {
    return ((uint32_t)(r) << 8) |
           ((uint32_t)(g) << 16) |
           (uint32_t)(b);
}

static inline uint32_t urgbw_u32(uint8_t r, uint8_t g, uint8_t b, uint8_t w) {
    return ((uint32_t)(r) << 8) |
           ((uint32_t)(g) << 16) |
           ((uint32_t)(w) << 24) |
           (uint32_t)(b);
}

#endif // WS2812_H