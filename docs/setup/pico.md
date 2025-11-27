# Recommended Pico Dev Workflow
- Open one VS Code instance at the root folder of the project.
- Open a second VS Code instance.
    - Go to File > Open Folder and select the pico folder.
    - Set this instance to use the Pico-specific VS Code profile (with the required extensions).

<div align="center">
    <img src="../../assets/Pico_Profile.jpg" width="250">
</div>


# Setup Project
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

## 2. MQTT Setup

### Install Mosquitto MQTT Broker
[Download Link](https://mosquitto.org)

- Disable firewall port 1883.
- Config settings:
```shell
listener 1883 0.0.0.0
allow_anonymous true
```

### Code Configuration

Copy that MAC address XX:XX:XX:XX:XX:XX and update your seed data:
Open `backend/core/management/commands/seed_data.py`
Configure:
```shell
"mac_address": "",
"ip_address": "",
```
Run
```sh
env/Scripts/activate
cd backend
py manage.py seed_data
```


To find the broker server ip (computer ip):
On windows in a command prompt:
```
ipconfig
```

Configure the broker server ip, network SSID and password in `CMakeLists.txt`:
```txt
set(MQTT_SERVER "")
set(WIFI_SSID "")
set(WIFI_PASSWORD "")
```

The file `backend/backend/settings.py` configure the broker server ip:
```python
MQTT_BROKER = ''
```

In `backend/core/services/MQTTService.py`:
```python
self.broker = getattr(settings, 'MQTT_BROKER', '')
```

## 3. Build and Uploading Code
### With Debug Probe
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
