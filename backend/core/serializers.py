from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from djoser.serializers import UserCreateSerializer
from .models import Desk, Reservation, DeskUsageLog, UserDeskPreference, Complaint
from django.utils import timezone

User = get_user_model()

class AdminUserListSerializer(serializers.ModelSerializer):
    reservations_count = serializers.IntegerField(read_only=True)
    cancellations_count = serializers.IntegerField(read_only=True)
    last_reservation_at = serializers.DateTimeField(read_only=True, allow_null=True)
    total_usage_hours = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name',
            'is_admin', 'is_active', 'last_login', 'created_at',
            'department',
            'reservations_count', 'cancellations_count', 'last_reservation_at',
            'total_usage_hours',
        ]

    def get_total_usage_hours(self, obj):
        """Convert total_reservation_duration (a timedelta) to hours."""
        duration = getattr(obj, 'total_reservation_duration', None)
        if not duration:
            return 0.0
        
        total_seconds = duration.total_seconds() if hasattr(duration, 'total_seconds') else float(duration)
        return round(total_seconds / 3600.0, 2)

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

class DeskSerializer(serializers.ModelSerializer):
    is_available_for_hot_desk = serializers.SerializerMethodField()

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
            "current_user",
            "is_available_for_hot_desk",
        ]

    def get_is_available_for_hot_desk(self, obj):
        now = timezone.now()
        has_active_reservation = obj.reservations.filter(
            start_time__lte=now,
            end_time__gte=now,
            status__in=['confirmed', 'active']
        ).exists()
        return obj.current_status == 'available' and not has_active_reservation


class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = [
            "id",
            "user",
            "desk",
            "start_time",
            "end_time",
            "status",
            "checked_in_at",
            "checked_out_at",
            "notes",
        ]
        read_only_fields = ["status", "checked_in_at", "checked_out_at"]

    def validate(self, data):
        desk = data['desk']
        start = data['start_time']
        end = data['end_time']
        overlapping = Reservation.objects.filter(
            desk=desk,
            start_time__lt=end,
            end_time__gt=start,
            status__in=['confirmed', 'active']
        ).exists()
        if overlapping:
            raise serializers.ValidationError("Desk already reserved for this time")
        if start >= end:
            raise serializers.ValidationError("Start time must be before end time")
        return data


class DeskUsageLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeskUsageLog
        fields = [
            "id",
            "user",
            "desk",
            "started_at",
            "ended_at",
            "sitting_time",
            "standing_time",
            "position_changes",
            "source",
            "notes",
        ]


class ComplaintSerializer(serializers.ModelSerializer):
    user_display = serializers.SerializerMethodField()
    desk_name = serializers.SerializerMethodField()

    class Meta:
        model = Complaint
        fields = [
            "id",
            "user",
            "user_display",
            "desk",
            "desk_name",
            "reservation",
            "subject",
            "message",
            "status",
            "created_at",
            "solved_at",
            "solved_by",
        ]
        read_only_fields = [
            "user",
            "user_display",
            "status",
            "created_at",
            "solved_at",
            "solved_by",
        ]

    def get_user_display(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name or obj.user.email

    def get_desk_name(self, obj):
        return obj.desk.name if obj.desk else None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["user"] = request.user
        return super().create(validated_data)


class UserDeskPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDeskPreference
        fields = [
            "id",
            "user",
            "desk",
            "sitting_height",
            "standing_height",
            "custom_height_1",
            "custom_height_2",
            "custom_height_1_name",
            "custom_height_2_name",
            "preferred_interval",
            "enable_reminders",
        ]