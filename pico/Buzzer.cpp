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

// Two short beeps and a pause
void moving_buzzer_pattern() {
    for (int i = 0; i < 2; i++) {
        play_tone(1200, 67); 
        sleep_ms(250);        
    }
    sleep_ms(300);       
}