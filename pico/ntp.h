#pragma once

#ifdef __cplusplus
extern "C" {
#endif

// Sync Pico W time via NTP
void ntp_sync_time(const char* server);

// Get formatted current timestamp: "YYYY-MM-DD HH:MM:SS"
void get_timestamp(char* buffer, int bufsize);

#ifdef __cplusplus
}
#endif