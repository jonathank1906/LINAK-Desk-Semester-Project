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

void pattern_snakes(PIO pio, uint sm, uint len, uint t) {
    for (uint i = 0; i < len; ++i) {
        uint x = (i + (t >> 1)) % 64;
        if (x < 10)
            put_pixel(pio, sm, urgb_u32(0xff, 0, 0));
        else if (x >= 15 && x < 25)
            put_pixel(pio, sm, urgb_u32(0, 0xff, 0));
        else if (x >= 30 && x < 40)
            put_pixel(pio, sm, urgb_u32(0, 0, 0xff));
        else
            put_pixel(pio, sm, 0);
    }
}

void pattern_random(PIO pio, uint sm, uint len, uint t) {
    if (t % 8)
        return;
    for (int i = 0; i < len; ++i)
        put_pixel(pio, sm, rand());
}

void pattern_sparkle(PIO pio, uint sm, uint len, uint t) {
    if (t % 8)
        return;
    for (int i = 0; i < len; ++i)
        put_pixel(pio, sm, rand() % 16 ? 0 : 0xffffffff);
}

void pattern_greys(PIO pio, uint sm, uint len, uint t) {
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
    
    for (uint i = 0; i < len; ++i) {
        put_pixel(pio, sm, urgb_u32(brightness, brightness, 0));
    }
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