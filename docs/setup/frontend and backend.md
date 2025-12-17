# Frontend and Backend Setup Guide

## Prerequisites to Install
- Python
- Node.js & npm
- PostgreSQL

## 0. Clone or Download the Source Code from GitHub
```sh
git clone https://github.com/jonathank1906/LINAK-Desk-Semester-Project.git
```


## 1. Frontend Setup
Install frontend dependencies:
```sh
cd frontend
npm install
```

## 2. Database Setup
Create the PostgreSQL database:
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

## 3. Backend Setup
In root directory, create a python virtual environment:
```sh
py -m venv env
```
Install backend dependencies:
```sh
env\Scripts\activate
pip install -r requirements.txt
```
Apply database migrations:
```sh
env/Scripts/activate
cd backend
py manage.py makemigrations
py manage.py migrate
```
Seed initial data:
```sh
env/Scripts/activate
cd backend
py manage.py seed_data
```