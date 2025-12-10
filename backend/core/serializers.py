from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from djoser.serializers import UserCreateSerializer
from .models import Desk, Reservation, DeskUsageLog, UserDeskPreference
from django.utils import timezone
from .models import DeskReport, DeskLog

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
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_admin']

class UserCreateSerializer(UserCreateSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'password']


class DeskSerializer(serializers.ModelSerializer):
    is_available_for_hot_desk = serializers.SerializerMethodField()
    requires_confirmation = serializers.SerializerMethodField()

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
            "requires_confirmation",
        ]

    def get_is_available_for_hot_desk(self, obj):
        now = timezone.now()
        has_active_reservation = obj.reservations.filter(
            start_time__lte=now,
            end_time__gte=now,
            status__in=['confirmed', 'active']
        ).exists()
        return obj.current_status == 'available' and not has_active_reservation
    
    def get_requires_confirmation(self, obj):
        """Returns True if desk has a Pico device attached"""
        return obj.pico.exists()


class ReservationSerializer(serializers.ModelSerializer):
    desk_name = serializers.CharField(source="desk.name", read_only=True)
    
    class Meta:
        model = Reservation
        fields = [
            "id",
            "user",
            "desk",
            "desk_name",
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

class DeskReportSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    desk_name = serializers.CharField(source="desk.name", read_only=True)

    class Meta:
        model = DeskReport
        fields = "__all__"


class DeskLogSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)
    user_full_name = serializers.SerializerMethodField()
    desk_name = serializers.CharField(source="desk.name", read_only=True)
    timestamp_formatted = serializers.SerializerMethodField()
    report_category = serializers.SerializerMethodField()

    class Meta:
        model = DeskLog
        fields = "__all__"
    
    def get_user_full_name(self, obj):
        """Return user's full name or email if name not available"""
        if obj.user:
            full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return full_name if full_name else obj.user.email
        return "System"
    
    def get_timestamp_formatted(self, obj):
        """Return formatted datetime string"""
        if obj.timestamp:
            return obj.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        return ""
    
    def get_report_category(self, obj):
        """Return report category if action is desk_report_submitted"""
        if obj.action == "desk_report_submitted":
            # Find the most recent report for this desk and user around this timestamp
            report = obj.desk.reports.filter(user=obj.user).order_by("-created_at").first()
            if report:
                return report.get_category_display()
        return None