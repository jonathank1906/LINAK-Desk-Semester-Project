from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.conf import settings 

class DeskReport(models.Model):
    CATEGORY_CHOICES = [
        ('desk_doesnt_move', "Desk doesn't move"),
        ('desk_uncleaned', 'Desk uncleaned'),
        ('desk_is_broken', 'Desk is broken'),
        ('other', 'Other'),
    ]
    
    desk = models.ForeignKey("Desk", on_delete=models.CASCADE, related_name="reports")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    message = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='other')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)

    def __str__(self):
        return f"Report for Desk {self.desk_id} by {self.user} ({self.created_at.date()})"


class DeskLog(models.Model):
    desk = models.ForeignKey("Desk", on_delete=models.CASCADE, related_name="logs")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    action = models.CharField(max_length=100)
    height = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.timestamp}] Desk {self.desk_id} - {self.action}"



class UserAccountManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        if not username:
            raise ValueError('Users must have a username')
        
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_admin', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, username, password, **extra_fields)


class UserAccount(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=150, unique=True)
    email = models.EmailField(max_length=255, unique=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    is_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    DEPARTMENT_CHOICES = [
        ('Engineering', 'Engineering'),
        ('Design', 'Design'),
        ('Marketing', 'Marketing'),
        ('HR', 'HR'),
        ('Finance', 'Finance'),
    ]

    department = models.CharField(
        max_length=50,
        choices=DEPARTMENT_CHOICES,
        blank=True,
        null=True
    )
   
    
    
    """ Additional fields inherited from AbstractBaseUser and PermissionsMixin include:
    password, last_login, is_superuser,
    id is automatically added as primary key by Django unless specified otherwise.
    """
    
    objects = UserAccountManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def get_short_name(self):
        return self.first_name
    
    def __str__(self):
        return self.email
    


class Desk(models.Model):
    STATUS_CHOICES = [
        ('idle', 'Idle'),
        ('moving', 'Moving'),
        ('error', 'Error'),
        ('maintenance', 'Maintenance'),
        ('available', 'Available'),
    ]
    
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=255)
    position = models.CharField(max_length=255, blank=True, null=True)
    manufacturer = models.CharField(max_length=255, default='Linak')
    
    # Height information
    current_height = models.FloatField(default=75.0)  # in cm
    min_height = models.FloatField(default=60.0)
    max_height = models.FloatField(default=120.0)
    
    # Status and state
    current_status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='available')
    current_user = models.ForeignKey(
        UserAccount, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='current_desk'
    )
    
    # WiFi2BLE integration
    wifi2ble_id = models.CharField(max_length=100, blank=True, null=True)
    api_endpoint = models.CharField(max_length=255, blank=True, null=True)
    
    # Error tracking
    last_error = models.TextField(blank=True, null=True)
    error_timestamp = models.DateTimeField(blank=True, null=True)
    
    # Usage statistics
    total_activations = models.IntegerField(default=0)
    sit_stand_counter = models.IntegerField(default=0)
    
    # Additional information
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.location}"
    


class Reservation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name='reservations')
    desk = models.ForeignKey(Desk, on_delete=models.CASCADE, related_name='reservations')
    
    # Timing
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Check-in/out tracking
    checked_in_at = models.DateTimeField(blank=True, null=True)
    checked_out_at = models.DateTimeField(blank=True, null=True)
    
    # Status
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    
    # Cancellation tracking
    cancelled_at = models.DateTimeField(blank=True, null=True)
    cancelled_by = models.ForeignKey(
        UserAccount, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='cancelled_reservations'
    )
    cancellation_reason = models.TextField(blank=True, null=True)
    
    # Additional notes
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.desk.name} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"
    
    class Meta:
        verbose_name = 'Reservation'
        verbose_name_plural = 'Reservations'
        ordering = ['-start_time']


class UserDeskPreference(models.Model):
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name='desk_preferences')
    desk = models.ForeignKey(
        Desk, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='user_preferences'
    )
    
    # Height preferences
    sitting_height = models.FloatField(default=72.0)
    standing_height = models.FloatField(default=110.0)
    custom_height_1 = models.FloatField(blank=True, null=True)
    custom_height_2 = models.FloatField(blank=True, null=True)
    custom_height_1_name = models.CharField(max_length=50, blank=True, null=True)
    custom_height_2_name = models.CharField(max_length=50, blank=True, null=True)
    
    # Reminder preferences
    preferred_interval = models.IntegerField(default=30)  # minutes between reminders
    enable_reminders = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        desk_name = self.desk.name if self.desk else "Default"
        return f"{self.user.email} - {desk_name} preferences"
    
    class Meta:
        verbose_name = 'User Desk Preference'
        verbose_name_plural = 'User Desk Preferences'
        unique_together = ['user', 'desk']


class DeskUsageLog(models.Model):
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE, related_name='usage_logs')
    desk = models.ForeignKey(Desk, on_delete=models.CASCADE, related_name='usage_logs')
    
    # Session timing
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    
    # Usage metrics (in seconds)
    sitting_time = models.IntegerField(default=0)
    standing_time = models.IntegerField(default=0)
    position_changes = models.IntegerField(default=0)
    last_height_change = models.DateTimeField(blank=True, null=True)
    
    # Height tracking
    average_height = models.FloatField(blank=True, null=True)
    min_height_used = models.FloatField(blank=True, null=True)
    max_height_used = models.FloatField(blank=True, null=True)
    
    # Source tracking
    source = models.CharField(max_length=50, default='web')  # web, button, automatic
    
    notes = models.TextField(blank=True, null=True)
    
    def __str__(self):
        status = "Ongoing" if not self.ended_at else "Completed"
        return f"{self.user.email} - {self.desk.name} ({status})"
    

class Pico(models.Model):
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('offline', 'Offline'),
        ('error', 'Error'),
    ]
    
    desk = models.ForeignKey(Desk, on_delete=models.CASCADE, related_name='pico')
    mac_address = models.CharField(max_length=17, unique=True)
    ip_address = models.GenericIPAddressField()
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='offline')
    last_seen = models.DateTimeField(blank=True, null=True)
    
    # Capabilities
    has_temperature_sensor = models.BooleanField(default=False)
    has_light_sensor = models.BooleanField(default=False)
    has_led_display = models.BooleanField(default=False)
    has_buzzer = models.BooleanField(default=False)
    has_led_indicator = models.BooleanField(default=False)
    
    firmware_version = models.CharField(max_length=20, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Pico - {self.desk.name} ({self.ip_address})"
    


class SensorReading(models.Model):
    pico_device = models.ForeignKey(Pico, on_delete=models.CASCADE, related_name='sensor_readings')
    
    # Sensor data
    temperature = models.FloatField(blank=True, null=True)
    humidity = models.FloatField(blank=True, null=True)
    light_level = models.IntegerField(blank=True, null=True)
    led_color_status = models.CharField(max_length=50, blank=True, null=True)
    
    # Occupancy
    person_present = models.BooleanField(default=False)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.pico_device.desk.name} - {self.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"


