from django.test import TestCase
from django.contrib.auth import get_user_model
from core.models import (
    Desk, Reservation, DeskUsageLog, 
    UserDeskPreference, Pico, 
    SensorReading, Complaint
)
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class UserAccountModelTest(TestCase):
    def test_create_user(self):
        """Test creating a regular user"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User"
        )
        self.assertEqual(user.email, "test@example.com")
        self.assertFalse(user.is_admin)
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
    
    def test_create_admin_user(self):
        """Test creating an admin user"""
        admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass123",
            is_admin=True,
            is_staff=True
        )
        self.assertTrue(admin.is_admin)
        self.assertTrue(admin.is_staff)
    
    def test_user_department(self):
        """Test user department field"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            department="Engineering"
        )
        self.assertEqual(user.department, "Engineering")


class DeskModelTest(TestCase):
    def setUp(self):
        self.desk = Desk.objects.create(
            name="DESK 4486",
            location="Floor 2 - Zone A",
            manufacturer="Desk-O-Matic Co.",
            current_height=80,
            min_height=68,
            max_height=132,
            wifi2ble_id="cd:fb:1a:53:fb:e6",
            api_endpoint="http://localhost:8000"
        )
    
    def test_desk_creation(self):
        """Test desk is created with correct default values"""
        self.assertEqual(self.desk.current_status, "available")
        self.assertIsNone(self.desk.current_user)
        self.assertEqual(self.desk.total_activations, 0)
        self.assertEqual(self.desk.sit_stand_counter, 0)
    
    def test_desk_user_assignment(self):
        """Test assigning a user to a desk"""
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com"
        )
        self.desk.current_user = user
        self.desk.current_status = "available"
        self.desk.save()
        
        self.assertEqual(self.desk.current_user, user)
        self.assertEqual(self.desk.current_status, "available")
    
    def test_desk_height_boundaries(self):
        """Test desk respects height boundaries"""
        self.assertGreaterEqual(self.desk.current_height, self.desk.min_height)
        self.assertLessEqual(self.desk.current_height, self.desk.max_height)
    
    def test_desk_activation_counter(self):
        """Test desk activation counter increments"""
        initial_count = self.desk.total_activations
        self.desk.total_activations += 1
        self.desk.save()
        
        self.desk.refresh_from_db()
        self.assertEqual(self.desk.total_activations, initial_count + 1)


class ReservationModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com"
        )
        self.desk = Desk.objects.create(
            name="Test Desk",
            wifi2ble_id="aa:bb:cc:dd:ee:ff"
        )
    
    def test_reservation_creation(self):
        """Test creating a valid reservation"""
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        reservation = Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time
        )
        
        self.assertEqual(reservation.status, "pending")
        self.assertEqual(reservation.user, self.user)
        self.assertEqual(reservation.desk, self.desk)
    
    def test_reservation_check_in(self):
        """Test checking in to a reservation"""
        start_time = timezone.now()
        end_time = start_time + timedelta(hours=2)
        
        reservation = Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time,
            status="confirmed"
        )
        
        reservation.checked_in_at = timezone.now()
        reservation.status = "active"
        reservation.save()
        
        self.assertIsNotNone(reservation.checked_in_at)
        self.assertEqual(reservation.status, "active")
    
    def test_reservation_cancellation(self):
        """Test cancelling a reservation"""
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        reservation = Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time
        )
        
        reservation.status = "cancelled"
        reservation.cancelled_at = timezone.now()
        reservation.cancelled_by = self.user
        reservation.cancellation_reason = "Plans changed"
        reservation.save()
        
        self.assertEqual(reservation.status, "cancelled")
        self.assertIsNotNone(reservation.cancelled_at)


class DeskUsageLogModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com"
        )
        self.desk = Desk.objects.create(
            name="Test Desk",
            wifi2ble_id="aa:bb:cc:dd:ee:ff"
        )
    
    def test_usage_log_creation(self):
        """Test creating a usage log entry"""
        log = DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now(),
            sitting_time=3600,  # 1 hour in seconds
            standing_time=1800,  # 30 minutes
            position_changes=5,
            average_height=95.5,
            source="web"
        )
        
        self.assertEqual(log.sitting_time, 3600)
        self.assertEqual(log.standing_time, 1800)
        self.assertEqual(log.position_changes, 5)
    
    def test_usage_log_session_duration(self):
        """Test calculating session duration"""
        started = timezone.now()
        ended = started + timedelta(hours=2)
        
        log = DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=started,
            ended_at=ended,
            sitting_time=3600,
            standing_time=3600
        )
        
        duration = (log.ended_at - log.started_at).total_seconds()
        self.assertAlmostEqual(duration, 7200, places=2)  # 2 hours


class PicoDeviceModelTest(TestCase):
    def setUp(self):
        self.desk = Desk.objects.create(
            name="Test Desk",
            wifi2ble_id="aa:bb:cc:dd:ee:ff"
        )
    
    def test_pico_device_creation(self):
        """Test creating a Pico device"""
        pico = Pico.objects.create(
            desk=self.desk,
            mac_address="AA:BB:CC:DD:EE:FF",
            ip_address="192.168.1.100",
            status="online",
            has_temperature_sensor=True,
            has_light_sensor=True,
            has_led_display=True,
            has_buzzer=True,
            firmware_version="1.0.0"
        )
        
        self.assertEqual(pico.desk, self.desk)
        self.assertEqual(pico.status, "online")


class ComplaintModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com"
        )
    
    def test_complaint_creation(self):
        """Test creating a complaint"""
        complaint = Complaint.objects.create(
            user=self.user,
            subject="Desk issue",
            message="The desk is not moving properly",
            status="open"
        )
        
        self.assertEqual(complaint.status, "open")
        self.assertEqual(complaint.subject, "Desk issue")
        self.assertIsNotNone(complaint.created_at)


class DeskReportModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com"
        )
        self.desk = Desk.objects.create(
            name="Test Desk",
            wifi2ble_id="aa:bb:cc:dd:ee:ff"
        )