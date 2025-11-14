#include "ntp.h"
#include <stdio.h>
#include <string.h>
#include <time.h>
#include "pico/stdlib.h"
#include "hardware/rtc.h"
#include "pico/cyw43_arch.h"
#include "lwip/udp.h"
#include "lwip/dns.h"
#include "lwip/pbuf.h"
#include "lwip/ip_addr.h"

#define NTP_PORT 123
#define NTP_PACKET_SIZE 48
#define NTP_UNIX_OFFSET 2208988800ULL
#define GMT_OFFSET_HOURS 1 // GMT+1

static void ntp_recv(void *arg, struct udp_pcb *pcb, struct pbuf *pb,
                     const ip_addr_t *addr, u16_t port)
{

    if (!pb)
        return;

    uint8_t *data = (uint8_t *)pb->payload;

    uint32_t ntp_seconds =
        ((uint32_t)data[40] << 24) |
        ((uint32_t)data[41] << 16) |
        ((uint32_t)data[42] << 8) |
        (uint32_t)data[43];

    uint32_t unix_time = ntp_seconds - NTP_UNIX_OFFSET;

    time_t raw = unix_time;
    struct tm info;
    gmtime_r(&raw, &info);

    // Apply GMT+1 safely with rollover
    int hour = info.tm_hour + GMT_OFFSET_HOURS;
    int day = info.tm_mday;
    int month = info.tm_mon + 1; // tm_mon = 0..11
    int year = info.tm_year + 1900;

    if (hour >= 24)
    {
        hour -= 24;
        day += 1;

        // Handle month/year rollover
        int days_in_month[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

        // Leap year check
        if ((year % 4 == 0 && year % 100 != 0) || (year % 400 == 0))
            days_in_month[1] = 29;

        if (day > days_in_month[month - 1])
        {
            day = 1;
            month += 1;
            if (month > 12)
            {
                month = 1;
                year += 1;
            }
        }
    }

    datetime_t t = {
        .year = year,
        .month = month,
        .day = day,
        .hour = hour,
        .min = info.tm_min,
        .sec = info.tm_sec};

    rtc_set_datetime(&t);

    printf("[TIME] RTC set to %04d-%02d-%02d %02d:%02d:%02d\n",
           t.year, t.month, t.day, t.hour, t.min, t.sec);

    pbuf_free(pb);
}

void ntp_sync_time(const char *server)
{
    printf("Resolving NTP server: %s\n", server);

    ip_addr_t ntp_ip;

    err_t err = dns_gethostbyname(server, &ntp_ip, NULL, NULL);

    // Wait for DNS resolution if needed
    while (err == ERR_INPROGRESS)
    {
        sleep_ms(50);
        err = dns_gethostbyname(server, &ntp_ip, NULL, NULL);
    }

    if (err != ERR_OK)
    {
        printf("DNS lookup failed.\n");
        return;
    }

    printf("NTP server IP: %s\n", ipaddr_ntoa(&ntp_ip));

    struct udp_pcb *pcb = udp_new();
    if (!pcb)
    {
        printf("UDP PCB creation failed.\n");
        return;
    }

    udp_recv(pcb, ntp_recv, NULL);

    uint8_t packet[NTP_PACKET_SIZE] = {0};
    packet[0] = 0b11100011;

    struct pbuf *pb = pbuf_alloc(PBUF_TRANSPORT, NTP_PACKET_SIZE, PBUF_RAM);
    memcpy(pb->payload, packet, NTP_PACKET_SIZE);

    udp_sendto(pcb, pb, &ntp_ip, NTP_PORT);
    pbuf_free(pb);

    printf("NTP request sent.\n");

    sleep_ms(1500); // Give UDP callback time

    udp_remove(pcb);
}

void get_timestamp(char *buffer, int bufsize)
{
    datetime_t now;
    rtc_get_datetime(&now);

    snprintf(buffer, bufsize, "%04d-%02d-%02d %02d:%02d:%02d",
             now.year, now.month, now.day,
             now.hour, now.min, now.sec);
}
