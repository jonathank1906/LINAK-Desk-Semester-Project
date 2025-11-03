#ifndef SSD1306_I2C_H
#define SSD1306_I2C_H

#ifdef __cplusplus
extern "C" {
#endif

void oled_init(void);
void oled_display_text(char *line1, char *line2, char *line3, char *line4);

#ifdef __cplusplus
}
#endif

#endif // SSD1306_I2C_H