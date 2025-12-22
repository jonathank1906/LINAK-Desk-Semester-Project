/**
 * Copyright (c) 2021 Raspberry Pi (Trading) Ltd.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>
#include "pico/stdlib.h"
#include "pico/binary_info.h"
#include "hardware/i2c.h"
#include "ssd1306_font.h"
#include "ssd1306_i2c.h"

#define SSD1306_HEIGHT              32
#define SSD1306_WIDTH               128
#define SSD1306_I2C_ADDR            _u(0x3C)
#define SSD1306_I2C_CLK             400

#define SSD1306_SET_MEM_MODE        _u(0x20)
#define SSD1306_SET_COL_ADDR        _u(0x21)
#define SSD1306_SET_PAGE_ADDR       _u(0x22)
#define SSD1306_SET_DISP_START_LINE _u(0x40)
#define SSD1306_SET_CONTRAST        _u(0x81)
#define SSD1306_SET_CHARGE_PUMP     _u(0x8D)
#define SSD1306_SET_SEG_REMAP       _u(0xA0)
#define SSD1306_SET_ENTIRE_ON       _u(0xA4)
#define SSD1306_SET_NORM_DISP       _u(0xA6)
#define SSD1306_SET_MUX_RATIO       _u(0xA8)
#define SSD1306_SET_DISP            _u(0xAE)
#define SSD1306_SET_COM_OUT_DIR     _u(0xC0)
#define SSD1306_SET_DISP_OFFSET     _u(0xD3)
#define SSD1306_SET_DISP_CLK_DIV    _u(0xD5)
#define SSD1306_SET_PRECHARGE       _u(0xD9)
#define SSD1306_SET_COM_PIN_CFG     _u(0xDA)
#define SSD1306_SET_VCOM_DESEL      _u(0xDB)

#define SSD1306_PAGE_HEIGHT         _u(8)
#define SSD1306_NUM_PAGES           (SSD1306_HEIGHT / SSD1306_PAGE_HEIGHT)
#define SSD1306_BUF_LEN             (SSD1306_NUM_PAGES * SSD1306_WIDTH)

struct render_area {
    uint8_t start_col;
    uint8_t end_col;
    uint8_t start_page;
    uint8_t end_page;
    int buflen;
};

static uint8_t display_buf[SSD1306_BUF_LEN];
static struct render_area frame_area;

void calc_render_area_buflen(struct render_area *area) {
    area->buflen = (area->end_col - area->start_col + 1) * (area->end_page - area->start_page + 1);
}

#ifdef i2c_default

void SSD1306_send_cmd(uint8_t cmd) {
    uint8_t buf[2] = {0x80, cmd};
    i2c_write_blocking(i2c_default, SSD1306_I2C_ADDR, buf, 2, false);
}

void SSD1306_send_cmd_list(uint8_t *buf, int num) {
    for (int i = 0; i < num; i++)
        SSD1306_send_cmd(buf[i]);
}

void SSD1306_send_buf(uint8_t buf[], int buflen) {
    uint8_t *temp_buf = malloc(buflen + 1);
    temp_buf[0] = 0x40;
    memcpy(temp_buf + 1, buf, buflen);
    i2c_write_blocking(i2c_default, SSD1306_I2C_ADDR, temp_buf, buflen + 1, false);
    free(temp_buf);
}

void SSD1306_init_display() {
    uint8_t cmds[] = {
        SSD1306_SET_DISP,               
        SSD1306_SET_MEM_MODE,           
        0x00,                           
        SSD1306_SET_DISP_START_LINE,    
        SSD1306_SET_SEG_REMAP | 0x01,   
        SSD1306_SET_MUX_RATIO,          
        SSD1306_HEIGHT - 1,
        SSD1306_SET_COM_OUT_DIR | 0x08, 
        SSD1306_SET_DISP_OFFSET,        
        0x00,                           
        SSD1306_SET_COM_PIN_CFG,        
#if ((SSD1306_WIDTH == 128) && (SSD1306_HEIGHT == 32))
        0x02,
#elif ((SSD1306_WIDTH == 128) && (SSD1306_HEIGHT == 64))
        0x12,
#else
        0x02,
#endif
        SSD1306_SET_DISP_CLK_DIV,       
        0x80,
        SSD1306_SET_PRECHARGE,          
        0xF1,
        SSD1306_SET_VCOM_DESEL,         
        0x30,
        SSD1306_SET_CONTRAST,           
        0xFF,
        SSD1306_SET_ENTIRE_ON,          
        SSD1306_SET_NORM_DISP,          
        SSD1306_SET_CHARGE_PUMP,        
        0x14,                           
        SSD1306_SET_DISP | 0x01,        
    };
    SSD1306_send_cmd_list(cmds, count_of(cmds));
}

void render(uint8_t *buf, struct render_area *area) {
    uint8_t cmds[] = {
        SSD1306_SET_COL_ADDR,
        area->start_col,
        area->end_col,
        SSD1306_SET_PAGE_ADDR,
        area->start_page,
        area->end_page
    };
    SSD1306_send_cmd_list(cmds, count_of(cmds));
    SSD1306_send_buf(buf, area->buflen);
}

static inline int GetFontIndex(uint8_t ch) {
    if (ch >= 'A' && ch <= 'Z') {
        return ch - 'A' + 1;
    }
    else if (ch >= '0' && ch <= '9') {
        return ch - '0' + 27;
    }
    else return 0;
}

static void WriteChar(uint8_t *buf, int16_t x, int16_t y, uint8_t ch) {
    if (x > SSD1306_WIDTH - 8 || y > SSD1306_HEIGHT - 8)
        return;

    y = y / 8;
    ch = toupper(ch);
    int idx = GetFontIndex(ch);
    int fb_idx = y * 128 + x;

    for (int i = 0; i < 8; i++) {
        buf[fb_idx++] = font[idx * 8 + i];
    }
}

void WriteString(uint8_t *buf, int16_t x, int16_t y, char *str) {
    if (x > SSD1306_WIDTH - 8 || y > SSD1306_HEIGHT - 8)
        return;

    while (*str) {
        WriteChar(buf, x, y, *str++);
        x += 8;
    }
}

void ClearDisplay(uint8_t *buf) {
    memset(buf, 0, SSD1306_BUF_LEN);
}

void UpdateDisplay() {
    render(display_buf, &frame_area);
}

#endif

void oled_init() {
#if !defined(i2c_default) || !defined(PICO_DEFAULT_I2C_SDA_PIN) || !defined(PICO_DEFAULT_I2C_SCL_PIN)
    puts("Default I2C pins were not defined");
#else
    printf("DEBUG: Initializing SSD1306 OLED...\n");

    i2c_init(i2c_default, SSD1306_I2C_CLK * 1000);
    gpio_set_function(PICO_DEFAULT_I2C_SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(PICO_DEFAULT_I2C_SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(PICO_DEFAULT_I2C_SDA_PIN);
    gpio_pull_up(PICO_DEFAULT_I2C_SCL_PIN);

    SSD1306_init_display();

    frame_area.start_col = 0;
    frame_area.end_col = SSD1306_WIDTH - 1;
    frame_area.start_page = 0;
    frame_area.end_page = SSD1306_NUM_PAGES - 1;
    calc_render_area_buflen(&frame_area);

    ClearDisplay(display_buf);
    UpdateDisplay();

    printf("DEBUG: Display initialized!\n");
#endif
}

void oled_display_text(char *line1, char *line2, char *line3, char *line4) {
    printf("DEBUG: oled_display_text called\n");
    printf("DEBUG: line1: %s\n", line1 ? line1 : "(null)");
    printf("DEBUG: line2: %s\n", line2 ? line2 : "(null)");
    printf("DEBUG: line3: %s\n", line3 ? line3 : "(null)");
    printf("DEBUG: line4: %s\n", line4 ? line4 : "(null)");

    ClearDisplay(display_buf);

    if (line1) WriteString(display_buf, 5, 0, line1);
    if (line2) WriteString(display_buf, 5, 8, line2);
    if (line3) WriteString(display_buf, 5, 16, line3);
    if (line4) WriteString(display_buf, 5, 24, line4);

    UpdateDisplay();
    printf("DEBUG: OLED display updated\n");
}