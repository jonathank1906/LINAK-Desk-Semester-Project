#ifndef BUZZER_MODE_H
#define BUZZER_MODE_H

typedef enum {
    BUZZER_MODE_NONE,
    BUZZER_MODE_MOVING,
    BUZZER_MODE_CONFIRM,
    BUZZER_MODE_ERROR,
    BUZZER_MODE_STARTUP
} BuzzerMode;

extern BuzzerMode current_buzzer_mode;

#endif