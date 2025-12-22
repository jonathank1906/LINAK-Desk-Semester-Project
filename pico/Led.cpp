#include <stdio.h>
#include "pico/stdlib.h"
#include "Led.h"
#include "dbop.h"       

Led::Led(uint pinNumber) : pin(pinNumber), state(false) {
    gpio_init(pinNumber);                              C_Led("Initialize LED GPIO");
    gpio_set_dir(pinNumber, true);                     C_Led("LED configured as output");
    gpio_put(pinNumber, false);                          C_Led("Ensure LED starts OFF");
}

void Led::on() {
    state=true;                              C_Led("Update LED state to ON");
    toggle();                              C_Led("Switch LED ON");
}

void Led::off() {
    state=false;                              C_Led("Update LED state to OFF");
    toggle();                              C_Led("Switch LED OFF");
}

void Led::toggle() {
    state=!state;                              C_Led("Toggle LED state variable");
    gpio_put(pin, state);                       C_Led("Write toggled state to GPIO");
}

void Led::setState(bool s) {
    state=s;                             C_Led("Set LED state variable directly");
    gpio_put(pin, state);                  C_Led("Write new state to GPIO");
}

bool Led::isOn() const {
    return state;                                           C_Led("Return current LED state");
}
