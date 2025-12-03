from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Desk, Reservation
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

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
            is_admin=True
        )
        self.desk = Desk.objects.create(
            name="Test Desk 1",
            location="Floor 2",
            wifi2ble_id="aa:bb:cc:dd:ee:ff"
        )
    
    def test_list_desks_unauthenticated(self):
        """Test that unauthenticated users cannot list desks"""
        response = self.client.get('/api/desks/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_desks_authenticated(self):
        """Test authenticated user can list desks"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/desks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
    
    def test_control_desk_height(self):
        """Test controlling desk height"""
        self.client.force_authenticate(user=self.user)
        
        # First assign desk to user
        self.desk.current_user = self.user
        self.desk.save()
        
        response = self.client.post(
            f'/api/desks/{self.desk.id}/control/',
            {'height': 110},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_cannot_control_unassigned_desk(self):
        """Test user cannot control desk not assigned to them"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post(
            f'/api/desks/{self.desk.id}/control/',
            {'height': 110},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ReservationAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123"
        )
        self.desk = Desk.objects.create(
            name="Test Desk",
            wifi2ble_id="aa:bb:cc:dd:ee:ff"
        )
    
    def test_create_reservation(self):
        """Test creating a new reservation"""
        self.client.force_authenticate(user=self.user)
        
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        response = self.client.post('/api/reservations/create/', {
            'desk': self.desk.id,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat()
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Reservation.objects.count(), 1)
    
    def test_prevent_overlapping_reservations(self):
        """Test that overlapping reservations are prevented"""
        self.client.force_authenticate(user=self.user)
        
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        
        # Create first reservation
        Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time,
            status="confirmed"
        )
        
        # Try overlapping reservation
        response = self.client.post('/api/reservations/', {
            'desk': self.desk.id,
            'start_time': (start_time + timedelta(minutes=30)).isoformat(),
            'end_time': (end_time + timedelta(minutes=30)).isoformat()
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)