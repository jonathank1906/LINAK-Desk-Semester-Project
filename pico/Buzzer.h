#ifndef BUZZER_H
#define BUZZER_H

#include "pico/stdlib.h"

#define BUZZER_PIN 20

#ifdef __cplusplus
extern "C" {
#endif

void buzzer_init();
void play_tone(uint frequency, uint duration_ms);
void moving_buzzer_pattern();

#ifdef __cplusplus
}
#endif

#endif // BUZZER_H