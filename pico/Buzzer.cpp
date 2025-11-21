#include "Buzzer.h"
#include <stdio.h>

void buzzer_init() {
    gpio_init(BUZZER_PIN);
    gpio_set_dir(BUZZER_PIN, GPIO_OUT);
}

// Play a tone of given frequency (Hz) and duration (ms)
void play_tone(uint frequency, uint duration_ms) {
    uint half_period_us = 1000000 / (2 * frequency);
    uint cycles = (duration_ms * 1000) / (half_period_us * 2);

    for (uint i = 0; i < cycles; i++) {
        gpio_put(BUZZER_PIN, 1);
        sleep_us(half_period_us);
        gpio_put(BUZZER_PIN, 0);
        sleep_us(half_period_us);
    }
}

// Non-blocking - beeps every 500ms
// Non-blocking - double beep pattern
void moving_buzzer_pattern() {
    static uint32_t last_update = 0;
    static int beep_count = 0;
    
    uint32_t now = to_ms_since_boot(get_absolute_time());
    uint32_t elapsed = now - last_update;
    
    if (beep_count == 0 && elapsed >= 617) { // Full cycle complete (67+250+67+250+300 = ~617ms gap)
        play_tone(1200, 67); // First beep
        beep_count = 1;
        last_update = now;
    }
    else if (beep_count == 1 && elapsed >= 250) { // Wait 250ms after first beep
        play_tone(1200, 67); // Second beep
        beep_count = 0;
        last_update = now;
    }
}