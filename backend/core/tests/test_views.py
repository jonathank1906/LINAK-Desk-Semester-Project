from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Desk, Reservation, DeskUsageLog
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, Mock

User = get_user_model()


class AuthenticationAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
    
    def test_user_can_be_created(self):
        """Test user creation works"""
        self.assertIsNotNone(self.user)
        self.assertEqual(self.user.email, 'test@example.com')


class DeskAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass123",
            is_admin=True,
            is_staff=True
        )
        self.desk = Desk.objects.create(
            name="DESK 4486",
            location="Floor 2",
            manufacturer="Desk-O-Matic Co.",
            wifi2ble_id="cd:fb:1a:53:fb:e6",
            api_endpoint="http://localhost:8001",
            current_height=75.0,
            min_height=68.0,
            max_height=132.0,
            current_status="available"
        )
    
    def test_list_desks_authenticated(self):
        """Test authenticated user can list desks"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/desks/')  # Fixed URL
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_get_desk_detail(self):
        """Test getting details of a specific desk"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/desks/{self.desk.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'DESK 4486')
    
    @patch('core.services.WiFi2BLEService.WiFi2BLEService.set_desk_height')
    def test_control_desk_height_with_assigned_desk(self, mock_set_height):
        """Test controlling desk height when desk is assigned to user"""
        # Mock the WiFi2BLE service response
        mock_set_height.return_value = True
        
        self.client.force_authenticate(user=self.user)
        
        # Assign desk to user and create usage log
        self.desk.current_user = self.user
        self.desk.current_status = "occupied"
        self.desk.save()
        
        DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now(),
            sitting_time=0,
            standing_time=0,
            source="hotdesk"
        )
        
        # Make the control request
        response = self.client.post(
            f'/api/desks/{self.desk.id}/control/',
            {'height': 110},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        self.assertEqual(response.data['target_height'], 110)
    
    def test_cannot_control_unassigned_desk(self):
        """Test user cannot control desk not assigned to them"""
        self.client.force_authenticate(user=self.user)
        
        # Desk is not assigned to this user
        response = self.client.post(
            f'/api/desks/{self.desk.id}/control/',
            {'height': 110},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)
    
    def test_start_hot_desk(self):
        """Test starting a hot desk session"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post(f'/api/desks/{self.desk.id}/hotdesk/start/')  # Fixed URL
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify desk is now assigned
        self.desk.refresh_from_db()
        self.assertEqual(self.desk.current_user, self.user)


class ReservationAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.user2 = User.objects.create_user(
            username="testuser2",
            email="test2@example.com",
            password="testpass123"
        )
        self.desk = Desk.objects.create(
            name="Test Desk",
            wifi2ble_id="aa:bb:cc:dd:ee:ff",
            current_status="available"
        )
    
    def test_create_reservation(self):
        """Test creating a new reservation"""
        self.client.force_authenticate(user=self.user)
        
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        response = self.client.post('/api/reservations/create/', {  # Fixed URL
            'desk': self.desk.id,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat()
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertGreaterEqual(Reservation.objects.count(), 1)
    
    def test_list_user_reservations(self):
        """Test user can see their reservations"""
        self.client.force_authenticate(user=self.user)
        
        # Create a reservation
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time,
            status="confirmed"
        )
        
        response = self.client.get('/api/reservations/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_overlapping_reservations_detected(self):
        """Test that system detects overlapping reservations"""
        self.client.force_authenticate(user=self.user)
        
        # Use timezone-aware times that respect Django's TIME_ZONE setting
        # Create times in UTC (like timezone.now() does)
        base_time = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0)
        start_time = base_time + timedelta(days=1)  # Tomorrow at 10:00 (in whatever timezone Django uses)
        end_time = start_time + timedelta(hours=2)   # Tomorrow at 12:00
        
        # Create first reservation (10:00 - 12:00)
        Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time,
            status="confirmed"
        )
        
        # Try to check available desks for overlapping time slot (10:30 - 12:30)
        overlapping_start = start_time + timedelta(minutes=30)  # 10:30
        overlapping_end = end_time + timedelta(minutes=30)      # 12:30
        
        # Format times in LOCAL timezone for the API (not UTC)
        # Convert to local timezone first
        local_tz = timezone.get_current_timezone()
        local_start = overlapping_start.astimezone(local_tz)
        local_end = overlapping_end.astimezone(local_tz)
        
        # Check if desk is available for this time slot
        response = self.client.get('/api/desks/available/', {
            'date': local_start.strftime('%Y-%m-%d'),
            'start_time': local_start.strftime('%H:%M'),
            'end_time': local_end.strftime('%H:%M')
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # The desk should NOT be in the available desks list
        desk_ids = [d['id'] for d in response.data]
        self.assertNotIn(
            self.desk.id, 
            desk_ids, 
            f"Desk {self.desk.id} should not be available during overlapping reservation. "
            f"Existing: {start_time} - {end_time}, Requested: {overlapping_start} - {overlapping_end}"
        )
    
    def test_cancel_reservation(self):
        """Test user can cancel their reservation"""
        self.client.force_authenticate(user=self.user)
        
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        reservation = Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time,
            status="confirmed"
        )
        
        response = self.client.post(f'/api/reservations/{reservation.id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'cancelled')


class DeskUsageTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.desk = Desk.objects.create(
            name="Test Desk",
            wifi2ble_id="aa:bb:cc:dd:ee:ff",
            current_height=75.0,
            current_status="occupied",
            current_user=self.user
        )
    
    def test_get_desk_usage(self):
        """Test getting desk usage statistics"""
        self.client.force_authenticate(user=self.user)
        
        # Create usage log
        DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now() - timedelta(minutes=30),
            sitting_time=900,  # 15 minutes
            standing_time=900,  # 15 minutes
            position_changes=3,
            source="hotdesk"
        )
        
        response = self.client.get(f'/api/desks/{self.desk.id}/usage/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['active_session'])
        self.assertIn('sitting_time', response.data)
        self.assertIn('standing_time', response.data)
    
    def test_release_desk(self):
        """Test releasing a desk ends the usage session"""
        self.client.force_authenticate(user=self.user)
        
        # Create usage log
        log = DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now() - timedelta(minutes=30),
            sitting_time=1800,
            standing_time=0,
            source="hotdesk"
        )
        
        response = self.client.post(f'/api/desks/{self.desk.id}/release/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify desk is released
        self.desk.refresh_from_db()
        self.assertIsNone(self.desk.current_user)
        self.assertEqual(self.desk.current_status, 'available')
        
        # Verify usage log is ended
        log.refresh_from_db()
        self.assertIsNotNone(log.ended_at)


class AdminAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="adminpass123",
            is_admin=True,
            is_staff=True
        )
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
    
    def test_admin_can_list_users(self):
        """Test admin can list all users"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_regular_user_cannot_list_users(self):
        """Test regular user cannot list all users"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/users/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_dashboard_analytics(self):
        """Test admin can access dashboard analytics"""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/admin/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('total_desks', response.data)