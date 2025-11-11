# Setup Guide for Running Locally

## Prerequisites

- Python
- Node.js & npm
- PostgreSQL

See the [prerequisites](prerequisites.md) page for detailed instructions.

## Steps
### Frontend Setup
Install dependencies in the frontend folder:
```sh
cd frontend
npm install
```

### Create the PostgreSQL database
```sh
psql -U postgres
```
Then in the PostgreSQL prompt run:
```sql
CREATE DATABASE db;
CREATE USER "user" WITH PASSWORD 'localdevpw';
GRANT ALL PRIVILEGES ON DATABASE db TO "user";
ALTER USER "user" CREATEDB CREATEROLE;
ALTER USER "user" WITH SUPERUSER;
```
Type \q or exit to quit.

### Backend Setup
In root directory, a create virtual environment.
```sh
py -m venv env
```
Install backend dependencies:
```sh
env\Scripts\activate
pip install -r requirements.txt
```
Navigate to the backend folder and apply migrations:
```sh
cd backend
py manage.py makemigrations
py manage.py migrate
```
Seed initial data:
```sh
py manage.py seed_data
```

### Running the project
Starting the frontend (in one terminal).
```sh
cd frontend
npm run dev
```

Starting the backend (in another terminal).
```sh
env\Scripts\activate  
cd backend
py manage.py runserver
```

Running the simulator (in another terminal).
```sh
env\Scripts\activate
cd wifi2ble-box-simulator
py simulator/main.py --port 8001
```

Running the MQTT listener for the Pico (in another terminal).
```sh
env\Scripts\activate
cd backend
py manage.py mqtt_listener
```