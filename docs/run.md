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

## Run React Tests
```sh
cd frontend
npm test
```
Press q to quit.

## Run Django Tests
```sh
env\Scripts\activate
cd backend

# Run all tests
py manage.py test

# Run specific test class
py manage.py test core.tests.test_models.DeskModelTest

# Run with verbosity (more detailed output)
py manage.py test -v 2
```

# Running the Project with Docker
## For Windows Users
Prerequisites:

- Installed WSL2

1. Start up Docker Desktop.
2. Build and start the containers:
```sh
docker-compose up --build
```
To stop the containers, press `Ctrl+C` in the terminal.
