from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from .managers import CustomUserManager


class CustomUserModel(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField("Email Address", unique=True, max_length=255)
    username = models.CharField("Username", unique=True, max_length=150)
    first_name = models.CharField("First Name", max_length=100)
    last_name = models.CharField("Last Name", max_length=100, null=True, blank=True)
    is_admin = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'

    
    objects = CustomUserManager()
   

