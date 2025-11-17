## Accessing Django Admin
Requirement: `is_superuser=true`. 
Access the admin panel by navigating to:
```sh
http://localhost:8000/admin/
```
A superuser is included in the seeded data. Log in using these credentials:
```sh
Username: admin@example.com
Password: 123
```
Otherwise create a superuser by:
```sh
py manage.py createsuperuser
```