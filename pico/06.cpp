// main.cpp
#include "pico/stdlib.h"
#include "MyApp.h"
#include "dbop.h"

int main() {
                                                        C_Exercise_6A("Initialize USB serial and stdio");
    stdio_init_all();                                   C_Exercise_6A("System initialized: entering main()");
                                                        C_Exercise_6A("Call MyApp to run application");
    MyApp();                                            C_Exercise_6A("Program ended (never reached)");
    return 0;                                           
}
