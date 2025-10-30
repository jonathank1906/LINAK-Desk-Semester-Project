# Generated Cmake Pico project file

cmake_minimum_required(VERSION 3.13)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Initialise pico_sdk from installed location
# (note this can come from environment, CMake cache etc)

# == DO NOT EDIT THE FOLLOWING LINES for the Raspberry Pi Pico VS Code Extension to work ==
if(WIN32)
    set(USERHOME $ENV{USERPROFILE})
else()
    set(USERHOME $ENV{HOME})
endif()
set(sdkVersion 2.2.0)
set(toolchainVersion 14_2_Rel1)
set(picotoolVersion 2.2.0-a4)
set(picoVscode ${USERHOME}/.pico-sdk/cmake/pico-vscode.cmake)
if (EXISTS ${picoVscode})
    include(${picoVscode})
endif()
# ====================================================================================
set(PICO_BOARD pico_w CACHE STRING "Board type")

set(MQTT_SERVER "192.168.43.86")
set(WIFI_SSID "Hotspot")
set(WIFI_PASSWORD "JtqkdkM!906")

# Pull in Raspberry Pi Pico SDK (must be before project)
include(pico_sdk_import.cmake)

project(06 C CXX ASM)

# Initialise the Raspberry Pi Pico SDK
pico_sdk_init()

# Add executable - ONE program with everything
add_executable(06 
        06.cpp 
        MyApp MyApp.cpp 
        Led Led.cpp 
        PushButton PushButton.cpp
        ssd1306_i2c.c
        mqtt_client.c)

pico_set_program_name(06 "06")
pico_set_program_version(06 "0.1")

# Modify the below lines to enable/disable output over UART/USB
pico_enable_stdio_uart(06 1)
pico_enable_stdio_usb(06 0)

# Add the standard library to the build
target_link_libraries(06
        pico_stdlib
        hardware_i2c
        hardware_adc
        pico_cyw43_arch_lwip_threadsafe_background
        pico_lwip_mqtt
        pico_multicore)

# Add the standard include files to the build
target_include_directories(06 PRIVATE
        ${CMAKE_CURRENT_LIST_DIR}
)

target_compile_definitions(06 PRIVATE
    WIFI_SSID=\"${WIFI_SSID}\"
    WIFI_PASSWORD=\"${WIFI_PASSWORD}\"
    MQTT_SERVER=\"${MQTT_SERVER}\"
)

pico_add_extra_outputs(06)