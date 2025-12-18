#include <stdio.h>
#include <stdlib.h>

#include "pico/stdlib.h"
#include "hardware/pio.h"
#include "hardware/clocks.h"
#include "ws2812.h"
#include "ws2812.pio.h"

void ws2812_init(PIO *pio_out, uint *sm_out, uint *offset_out) {
    PIO pio;
    uint sm;
    uint offset;
    
    bool success = pio_claim_free_sm_and_add_program_for_gpio_range(
        &ws2812_program, &pio, &sm, &offset, WS2812_PIN, 1, true);
    hard_assert(success);

    ws2812_program_init(pio, sm, offset, WS2812_PIN, 800000, IS_RGBW);
    
    *pio_out = pio;
    *sm_out = sm;
    *offset_out = offset;
}

void pattern_solid_green(PIO pio, uint sm, uint len, uint brightness) {
    for (int i = 0; i < len; ++i) {
        put_pixel(pio, sm, urgb_u32(0, brightness, 0));
    }
}

void pattern_solid_red(PIO pio, uint sm, uint len, uint brightness) {
    for (int i = 0; i < len; ++i) {
        put_pixel(pio, sm, urgb_u32(brightness, 0, 0));
    }
}


void pattern_pulse_color(PIO pio, uint sm, uint len, uint t, uint8_t r_ratio, uint8_t g_ratio, uint8_t b_ratio) {
    uint min = 10;
    uint max = 100;
    uint range = max - min;
    
    uint phase = t % (range * 2);
    uint brightness;
    
    if (phase < range) {
        brightness = min + phase;
    } else {
        brightness = max - (phase - range);
    }
    
    // Apply color ratios (0-255 scale)
    uint8_t r = (brightness * r_ratio) / 255;
    uint8_t g = (brightness * g_ratio) / 255;
    uint8_t b = (brightness * b_ratio) / 255;
    
    for (uint i = 0; i < len; ++i) {
        put_pixel(pio, sm, urgb_u32(r, g, b));
    }
}

// Convenience wrappers
void pattern_yellow(PIO pio, uint sm, uint len, uint t) {
    pattern_pulse_color(pio, sm, len, t, 255, 255, 0); // Yellow
}

void pattern_red(PIO pio, uint sm, uint len, uint t) {
    pattern_pulse_color(pio, sm, len, t, 255, 0, 0); // Red
}

void pattern_blue(PIO pio, uint sm, uint len, uint t) {
    pattern_pulse_color(pio, sm, len, t, 0, 0, 255); // Blue
}

void pattern_green(PIO pio, uint sm, uint len, uint t) {
    pattern_pulse_color(pio, sm, len, t, 0, 255, 0); // Green
}

void pattern_white(PIO pio, uint sm, uint len, uint t) {
    pattern_pulse_color(pio, sm, len, t, 255, 255, 255); // White
}

void pattern_solid_blue(PIO pio, uint sm, uint num_pixels, uint8_t brightness) {
    uint32_t color = urgb_u32(0, 0, brightness); // Blue
    for (int i = 0; i < num_pixels; i++) {
        put_pixel(pio, sm, color);
    }
}

void pattern_pulse_blue(PIO pio, uint sm, uint num_pixels, uint8_t brightness) {
    // Simple pulse: alternate bright and dim
    static bool pulse_state = false;
    uint8_t b = pulse_state ? brightness : brightness / 3;
    pulse_state = !pulse_state;
    
    uint32_t color = urgb_u32(0, 0, b);
    for (int i = 0; i < num_pixels; i++) {
        put_pixel(pio, sm, color);
    }
}