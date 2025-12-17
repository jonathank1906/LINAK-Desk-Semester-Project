# Raspberry Pi Pico W Project Setup
## 1. Pico SDK Install
1. Create a new VS Code profile dedicated to Raspberry Pi Pico development.
2. Install the Raspberry Pi Pico SDK extensions in that profile.


Locate your Ninja location
```shell
C:\Users\jonat\.pico-sdk\ninja\v1.12.1
```
Add this to `pico/.vscode/settings.json`:
```json
"cmake.configureSettings": {
    "CMAKE_MAKE_PROGRAM": "C:/Users/jonat/.pico-sdk/ninja/v1.12.1/ninja.exe"
},
```

## 2. Code Configuration for Local

### Install Mosquitto MQTT Broker
[Download Link](https://mosquitto.org)

- Create a new inbound firewall rule. Allow port 1883.
- Simply add these two lines at the top of `mosquitto.conf` and save.
```shell
listener 1883 0.0.0.0
allow_anonymous true
```


- At this point, build and flash the code onto the pico (see section 3 below). Open the serial monitor and copy the Pico's MAC and IP address to update it into the database and the `.env` file.
- To find the `MQTT_BROKER` (computer ip) on windows in a command prompt:
```
ipconfig
```

1.Copy the env template:
```shell
cp .env.example .env
```

2.Edit `.env` at project root with your own values:
```
MQTT_BROKER=0.0.0.0
MQTT_PORT=1883
PICO_MAC_ADDRESS=00:00:00:00:00:00
PICO_IP_ADDRESS=0.0.0.0
TIME_ZONE=Europe/Copenhagen
```
3.Copy the wifi config template :
```shell
cp pico/wifi_config.h.example pico/wifi_config.h
```

4.Configure the broker server ip, network SSID and password in `wifi_config.h` in the pico folder with your own values:
```
#define WIFI_SSID "your_network_name"
#define WIFI_PASSWORD "your_network_password"
#define MQTT_SERVER "0.0.0.0"
```

Finally seed the data to update the MAC and IP in the database:
```sh
env/Scripts/activate
cd backend
py manage.py seed_data
```
## 2. Code Configuration for Docker


## 3. Build and Uploading Code
### With Debug Probe (Recommended)
<!-- -->
1. First build the project from the cmake extension. 
    - A successful build will show the message: `[Build] Build finished with exit code 0`
    <div align="center">
        <img src="../../assets/Build.jpg" width="200">
    </div>
2. Click the flash button
    <div align="center">
        <img src="../../assets/Flash.jpg" width="200">
    </div>

### Without Debug Probe
<!-- -->
1. First build the project from the cmake extension. 
    - A successful build will show the message: `[Build] Build finished with exit code 0`
    <div align="center">
        <img src="../../assets/Build.jpg" width="200">
    </div>
2. Locate the `pico/build/main.uf2` file. 
3. Hold the BOOTSEL button while plugging the USB into the Pico. 
4. Copy and paste the `main.uf2` file into the Pico drive that appears in file explorer.



## Troubleshooting
1. Delete the entire build folder.
2. Reconfigure with:
```shell
cmake --no-warn-unused-cli -S . -B build -G Ninja
```

# Recommended Pico Dev Workflow with VS Code
- Open one VS Code instance at the root folder of the project.
- Open a second VS Code instance.
    - Go to File > Open Folder and select the pico folder.
    - Set this instance to use the Pico-specific VS Code profile (with the required extensions).

<div align="center">
    <img src="../../assets/Pico_Profile.jpg" width="250">
</div>