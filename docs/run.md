# Running the Project Locally
## Frontend Startup
(in one terminal):
```sh
cd frontend
npm run dev
```

## Backend Startup
(in another terminal):
```sh
env\Scripts\activate  
cd backend
py manage.py runserver
```

## Simulator Startup
(in another terminal):
```sh
env\Scripts\activate
cd wifi2ble-box-simulator
py simulator/main.py --port 8001
```

## MQTT Listener Startup
Purpose: Checking messages sent by the Pico W. 
(in another terminal):
```sh
env\Scripts\activate
cd backend
py manage.py mqtt_listener
```