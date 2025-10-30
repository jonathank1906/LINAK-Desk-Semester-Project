#ifndef BUZZER_H
#define BUZZER_H

#include "pico/stdlib.h"

#define BUZZER_PIN 20

// Initialize the buzzer
void buzzer_init();

// Play a tone of given frequency (Hz) and duration (ms)
void play_tone(uint frequency, uint duration_ms);

// Two short beeps and a pause
void moving_buzzer_pattern();

#endif // BUZZER_H