#include <stdio.h>
#include "pico/stdlib.h"
#include "dbop.h"
#include "MyApp.h"

void MyApp() {
    Led RedLED(7);                                                              C_MyApp("Create Red LED object on GPIO7");
    Button button1(10, GPIO_IRQ_EDGE_RISE);                                     C_MyApp("Create Button object on GPIO10");

    printf("EXERCISE 6A started: LED & Button classes with debounce, events and debug info\n"); 
                                                                                C_MyApp("Print startup message");

    while (true) {
        if (button1.hasEvent()) {                                               C_MyApp("Check for new button event");
            RedLED.setState(button1.toggleState());                             C_MyApp("Set LED state based on button toggle state");
            printf("New event: Button pressed %d times, LED state: %s\n",
                   button1.getPressCount(),
                   RedLED.isOn() ? "ON" : "OFF");                               C_MyApp("Print current counts and state");
        }

        sleep_ms(10);
    }
}
