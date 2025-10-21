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
Then, in the PostgreSQL prompt, run:
```sql
CREATE DATABASE db;
```
Type \q to exit.

### Backend Setup
In root directory a create virtual environment and activate it.
```sh
py -m venv env
env\Scripts\activate
```
Install backend dependencies:
```sh
pip install -r requirements.txt
```
Navigate to the backend folder:
```sh
cd backend
```
Apply migrations:
```sh
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