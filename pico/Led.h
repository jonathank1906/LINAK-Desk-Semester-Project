#ifndef LED_H
#define LED_H

#include "pico/stdlib.h"
#include "dbop.h" 

class Led {
private:
    uint pin;       
    bool state;     
public:
    Led(uint pinNumber);       
    void on();                 
    void off();                
    void toggle();             
    void setState(bool s);     
    bool isOn() const;         
};

#endif
