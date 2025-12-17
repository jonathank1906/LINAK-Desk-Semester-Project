## Run React (Frontend) Tests
```sh
cd frontend
npm test
```
Press q to quit.

## Run Django (Backend) Tests
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