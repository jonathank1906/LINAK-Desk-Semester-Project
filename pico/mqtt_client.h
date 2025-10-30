#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// Initialize MQTT client (connects to WiFi and MQTT broker)
void mqtt_client_init(void);

// Publish a message to a topic
// Returns 0 on success, non-zero on error
int mqtt_publish_message(const char* topic_suffix, const char* message);

// Check if MQTT client is connected and poll for messages
// Call this frequently in your main loop!
void mqtt_poll(void);

// Check if MQTT is connected
bool mqtt_is_connected(void);

// Register callback for external LED control from MQTT
// Callback will be called when /redled topic receives a message
void mqtt_register_led_callback(void (*callback)(bool on));

#ifdef __cplusplus
}
#endif

#endif // MQTT_CLIENT_H
