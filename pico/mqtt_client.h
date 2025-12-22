#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct MQTT_CLIENT_DATA_T MQTT_CLIENT_DATA_T; 


void mqtt_client_init(void);

int mqtt_publish_message(const char* topic_suffix, const char* message);

void mqtt_poll(void);

bool mqtt_is_connected(void);

void mqtt_register_led_callback(void (*callback)(bool on));

MQTT_CLIENT_DATA_T* get_mqtt_state(void);

#ifdef __cplusplus
}
#endif

#endif // MQTT_CLIENT_H
