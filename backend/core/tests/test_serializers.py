from django.test import TestCase
from django.contrib.auth import get_user_model
from core.models import Desk, Reservation, DeskUsageLog, Complaint, DeskReport
from core.serializers import (
    UserSerializer,
    DeskSerializer,
    ReservationSerializer,
    ComplaintSerializer,
    AdminUserListSerializer
)
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class UserSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            department='Engineering'
        )
    
    def test_user_serialization(self):
        """Test user data is serialized correctly"""
        serializer = UserSerializer(self.user)
        data = serializer.data
        
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['first_name'], 'Test')
        self.assertEqual(data['last_name'], 'User')
    
    def test_user_deserialization(self):
        """Test creating user from serialized data"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'password': 'password123'
        }
        
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            self.assertEqual(user.email, 'newuser@example.com')
            self.assertEqual(user.username, 'newuser')


class DeskSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.desk = Desk.objects.create(
            name='DESK 001',
            location='Floor 2',
            manufacturer='Linak',
            wifi2ble_id='aa:bb:cc:dd:ee:ff',
            current_height=80.0,
            min_height=68.0,
            max_height=132.0,
            current_status='available',
            current_user=None
        )
    
    def test_desk_serialization(self):
        """Test desk data is serialized correctly"""
        serializer = DeskSerializer(self.desk)
        data = serializer.data
        
        self.assertEqual(data['name'], 'DESK 001')
        self.assertEqual(data['location'], 'Floor 2')
        self.assertEqual(float(data['current_height']), 80.0)
        self.assertEqual(data['current_status'], 'available')
    
    def test_desk_with_current_user(self):
        """Test desk serialization includes current user"""
        self.desk.current_user = self.user
        self.desk.current_status = 'occupied'
        self.desk.save()
        
        serializer = DeskSerializer(self.desk)
        data = serializer.data
        
        self.assertIsNotNone(data.get('current_user'))
        self.assertEqual(data['current_status'], 'occupied')
    
    def test_desk_validation(self):
        """Test desk data validation"""
        data = {
            'name': 'New Desk',
            'location': 'Floor 3',
            'wifi2ble_id': 'ff:ee:dd:cc:bb:aa',
            'min_height': 68.0,
            'max_height': 132.0
        }
        
        serializer = DeskSerializer(data=data)
        self.assertTrue(serializer.is_valid())


class ReservationSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.desk = Desk.objects.create(
            name='Test Desk',
            wifi2ble_id='aa:bb:cc:dd:ee:ff'
        )
        self.start_time = timezone.now() + timedelta(hours=1)
        self.end_time = self.start_time + timedelta(hours=2)
    
    def test_reservation_serialization(self):
        """Test reservation data is serialized correctly"""
        reservation = Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=self.start_time,
            end_time=self.end_time,
            status='confirmed'
        )
        
        serializer = ReservationSerializer(reservation)
        data = serializer.data
        
        self.assertEqual(data['status'], 'confirmed')
        self.assertIsNotNone(data['start_time'])
        self.assertIsNotNone(data['end_time'])
    
    def test_reservation_validation_end_before_start(self):
        """Test reservation validation fails when end time is before start time"""
        data = {
            'user': self.user.id,
            'desk': self.desk.id,
            'start_time': self.end_time.isoformat(),
            'end_time': self.start_time.isoformat()
        }
        
        serializer = ReservationSerializer(data=data)
        # This should fail validation
        self.assertFalse(serializer.is_valid())
    
    def test_reservation_with_user_and_desk_details(self):
        """Test reservation includes related user and desk information"""
        reservation = Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=self.start_time,
            end_time=self.end_time,
            status='confirmed'
        )
        
        serializer = ReservationSerializer(reservation)
        data = serializer.data
        
        self.assertIn('user', data)
        self.assertIn('desk', data)


class ComplaintSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.desk = Desk.objects.create(
            name='Test Desk',
            wifi2ble_id='aa:bb:cc:dd:ee:ff'
        )
    
    def test_complaint_serialization(self):
        """Test complaint data is serialized correctly"""
        complaint = Complaint.objects.create(
            user=self.user,
            desk=self.desk,
            subject='Desk Issue',
            message='The desk motor is making noise',
            status='open'
        )
        
        serializer = ComplaintSerializer(complaint)
        data = serializer.data
        
        self.assertEqual(data['subject'], 'Desk Issue')
        self.assertEqual(data['status'], 'open')
        self.assertIn('created_at', data)
    
    def test_create_complaint_through_serializer(self):
        """Test creating complaint through serializer"""
        data = {
            'desk': self.desk.id,
            'subject': 'Another Issue',
            'message': 'Desk height sensor not working'
        }
        
        # Mock request context
        from unittest.mock import Mock
        request = Mock()
        request.user = self.user
        
        serializer = ComplaintSerializer(
            data=data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            complaint = serializer.save()
            self.assertEqual(complaint.user, self.user)
            self.assertEqual(complaint.subject, 'Another Issue')


class AdminUserListSerializerTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            first_name='Test',
            last_name='User',
            department='Engineering'
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            is_admin=True,
            is_staff=True
        )
        self.desk = Desk.objects.create(
            name='Test Desk',
            wifi2ble_id='aa:bb:cc:dd:ee:ff'
        )
    
    def test_regular_user_serialization(self):
        """Test serializing a regular employee user"""
        serializer = AdminUserListSerializer(self.user)
        data = serializer.data
        
        # Check basic user fields
        self.assertEqual(data['email'], 'test@example.com')
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['first_name'], 'Test')
        self.assertEqual(data['last_name'], 'User')
        self.assertEqual(data['department'], 'Engineering')
        
        # Check that expected fields exist
        self.assertIn('id', data)
        self.assertIn('is_admin', data)
        self.assertIn('is_active', data)
        self.assertIn('created_at', data)
        self.assertIn('last_reservation_at', data)
        self.assertIn('total_usage_hours', data)
        
        # Verify user is not admin
        self.assertFalse(data['is_admin'])
        self.assertTrue(data['is_active'])
    
    def test_admin_user_serialization(self):
        """Test serializing an admin user"""
        serializer = AdminUserListSerializer(self.admin_user)
        data = serializer.data
        
        self.assertTrue(data['is_admin'])
        self.assertEqual(data['email'], 'admin@example.com')
        self.assertEqual(data['first_name'], 'Admin')
    
    def test_user_with_usage_hours(self):
        """Test that usage hours are included for regular users"""
        # Create usage log for regular user (not admin)
        DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now() - timedelta(hours=2),
            ended_at=timezone.now(),
            sitting_time=3600,  # 1 hour
            standing_time=3600,  # 1 hour
            source='hotdesk'
        )
        
        serializer = AdminUserListSerializer(self.user)
        data = serializer.data
        
        # Should have usage data
        self.assertIn('total_usage_hours', data)
        self.assertGreaterEqual(data['total_usage_hours'], 0)
    
    def test_inactive_user_serialization(self):
        """Test serializing inactive user"""
        inactive_user = User.objects.create_user(
            username='inactive',
            email='inactive@example.com',
            is_active=False
        )
        
        serializer = AdminUserListSerializer(inactive_user)
        data = serializer.data
        
        self.assertFalse(data['is_active'])
        self.assertEqual(data['email'], 'inactive@example.com')
    
    def test_user_without_department(self):
        """Test serializing user without department set"""
        no_dept_user = User.objects.create_user(
            username='nodept',
            email='nodept@example.com',
            department=None
        )
        
        serializer = AdminUserListSerializer(no_dept_user)
        data = serializer.data
        
        self.assertIsNone(data.get('department'))
        self.assertEqual(data['email'], 'nodept@example.com')