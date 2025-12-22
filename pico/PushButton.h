#ifndef PUSHBUTTON_H
#define PUSHBUTTON_H

#include "pico/stdlib.h"
#include "hardware/timer.h"
#include "dbop.h"  

#define MAX_GPIO     32   
#define DEBOUNCE_MS  50   

class Button {
private:
    uint pin;                  
    uint32_t edge;             
    volatile int pressCount;   
    volatile bool toggleStateValue;

    alarm_id_t debounceAlarm;  
    volatile bool lastState;
    volatile bool eventFlag;   

    static Button* instances[MAX_GPIO];  

    static void gpio_isr(uint gpio, uint32_t events);          
    void startDebounce();                                       
    static int64_t debounceTimerCallback(alarm_id_t id, void*); 
    int64_t handleDebounce();                                   

public:
    Button(uint pinNumber, uint32_t edgeType);  

    int getPressCount() const;    
    bool isPressed() const;       
    bool toggleState() const;     
    bool hasEvent();              
};

#endif 
