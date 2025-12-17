Before running the project locally, make sure you have completed all steps in the **Setup Guide for Local Dev**. Follow the instructions below for your preferred method.
# Running the Project Locally
## 1. Frontend Startup
(in one terminal):
```sh
cd frontend
npm run dev
```

## 2. Backend Startup
(in another terminal):
```sh
env\Scripts\activate  
cd backend
py manage.py runserver
```

## 3. Simulator Startup
(in another terminal):
```sh
env\Scripts\activate
cd wifi2ble-box-simulator
py simulator/main.py --port 8001
```

## 4. MQTT Listener Startup
Purpose: Checking messages sent by the Pico W. 
(in another terminal):
```sh
env\Scripts\activate
cd backend
py manage.py mqtt_listener
```