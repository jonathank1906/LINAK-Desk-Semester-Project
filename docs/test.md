## Run Django (Backend) Tests
```sh
env\Scripts\activate
cd backend

# Run all tests
py manage.py test

# Run specific test class
py manage.py test core.tests.test_authentication
py manage.py test core.tests.test_e2e
py manage.py test core.tests.test_integration
py manage.py test core.tests.test_models
py manage.py test core.tests.test_serializers
py manage.py test core.tests.test_services
py manage.py test core.tests.test_views


# Run with verbosity (more detailed output)
py manage.py test -v 2
```