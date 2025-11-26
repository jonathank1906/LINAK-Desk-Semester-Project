# Recommended Pico Dev Workflow
- Open one VS Code instance at the root folder of the project.
- Open a second VS Code instance.
    - Go to File > Open Folder and select the pico folder.
    - Set this instance to use the Pico-specific VS Code profile (with the required extensions).

<div align="center">
    <img src="../../assets/Pico_Profile.jpg" width="250">
</div>


# Setup Project
## Pico SDK Install
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



## Build and Uploading Code
### With Debug Probe
1. First build the project from the cmake extension.
    <div align="center">
        <img src="../../assets/Build.jpg" width="200">
    </div>
2. Click the flash button
    <div align="center">
        <img src="../../assets/Flash.jpg" width="200">
    </div>

### Without Debug Probe
1. First build the project from the cmake extension.
2. Locate the `pico/build/main.uf2`. 
3. Hold the bootsel button while plugging in the Pico. 
4. Copy and paste this file into the Pico in the file explorer.



## MQTT Configuration
Configure network SSID and password. Use 

A successful build will show the message:
```shell
[Build] Build finished with exit code 0
```

## Troubleshooting
Delete the build folder and try again.
