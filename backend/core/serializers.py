from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from djoser.serializers import UserCreateSerializer
from .models import Desk

User = get_user_model()

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_admin']

class UserCreateSerializer(UserCreateSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'password']

class DeskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Desk
        fields = [
            "id",
            "wifi2ble_id",
            "name",
            "location",
            "current_height",
            "min_height",
            "max_height",
            "current_status",
            "api_endpoint",
            "last_error",
            "error_timestamp",
            "total_activations",
            "sit_stand_counter",
        ]