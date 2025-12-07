from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from core.models import Desk, Reservation, DeskUsageLog, Pico, SensorReading
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, Mock

User = get_user_model()


class CompleteReservationWorkflowTest(TransactionTestCase):
    """Test complete reservation workflow from creation to completion"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.desk = Desk.objects.create(
            name='Test Desk',
            wifi2ble_id='aa:bb:cc:dd:ee:ff',
            current_status='available'
        )
        self.pico = Pico.objects.create(
            desk=self.desk,
            mac_address='AA:BB:CC:DD:EE:FF',
            ip_address='192.168.1.100',
            status='online'
        )
    
    def test_complete_reservation_workflow(self):
        """Test: Create reservation → Check in → Use desk → Check out"""
        
        # Step 1: Create reservation
        start_time = timezone.now() + timedelta(hours=1)
        end_time = start_time + timedelta(hours=2)
        reservation = Reservation.objects.create(
            user=self.user,
            desk=self.desk,
            start_time=start_time,
            end_time=end_time,
            status='confirmed'
        )
        
        self.assertEqual(reservation.status, 'confirmed')
        self.assertIsNone(reservation.checked_in_at)
        
        # Step 2: Check in to reservation
        reservation.checked_in_at = timezone.now()
        reservation.status = 'active'
        reservation.save()
        
        # Assign desk to user
        self.desk.current_user = self.user
        self.desk.current_status = 'occupied'
        self.desk.save()
        
        self.assertEqual(self.desk.current_user, self.user)
        self.assertEqual(reservation.status, 'active')
        
        # Step 3: Create usage log (user uses desk)
        usage_log = DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now(),
            sitting_time=1800,  # 30 minutes
            standing_time=1800,  # 30 minutes
            position_changes=5,
            source='reservation'
        )
        
        self.assertIsNotNone(usage_log)
        self.assertEqual(usage_log.position_changes, 5)
        
        # Step 4: Check out
        usage_log.ended_at = timezone.now()
        usage_log.save()
        
        reservation.checked_out_at = timezone.now()
        reservation.status = 'completed'
        reservation.save()
        
        self.desk.current_user = None
        self.desk.current_status = 'available'
        self.desk.save()
        
        # Verify final state
        self.assertEqual(reservation.status, 'completed')
        self.assertIsNone(self.desk.current_user)
        self.assertEqual(self.desk.current_status, 'available')
        self.assertIsNotNone(usage_log.ended_at)
        
        # Verify total session time
        total_time = usage_log.sitting_time + usage_log.standing_time
        self.assertEqual(total_time, 3600)  # 1 hour total


class HotDeskWorkflowTest(TransactionTestCase):
    """Test hot-desking workflow"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.desk = Desk.objects.create(
            name='Hot Desk',
            wifi2ble_id='aa:bb:cc:dd:ee:ff',
            current_status='available'
        )
    
    @patch('core.services.WiFi2BLEService.WiFi2BLEService.get_desk_state')
    def test_hot_desk_workflow_without_pico(self, mock_get_state):
        """Test hot desk workflow when no Pico is attached"""
        
        # Mock WiFi2BLE state
        mock_get_state.return_value = {
            "position_mm": 750,
            "speed_mms": 0,
            "status": "Normal"
        }
        
        # Step 1: Start hot desk session
        self.desk.current_user = self.user
        self.desk.current_status = 'occupied'
        self.desk.save()
        
        # Step 2: Create usage log
        usage_log = DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now(),
            sitting_time=1200,  # 20 minutes
            standing_time=600,  # 10 minutes
            position_changes=2,
            source='hotdesk'
        )
        
        self.assertEqual(self.desk.current_user, self.user)
        self.assertEqual(self.desk.current_status, 'occupied')
        self.assertIsNotNone(usage_log)
        
        # Step 3: End hot desk session
        usage_log.ended_at = timezone.now()
        usage_log.save()
        
        self.desk.current_user = None
        self.desk.current_status = 'available'
        self.desk.save()
        
        # Verify final state
        self.assertIsNone(self.desk.current_user)
        self.assertEqual(self.desk.current_status, 'available')
        self.assertIsNotNone(usage_log.ended_at)
        total_time = usage_log.sitting_time + usage_log.standing_time
        self.assertEqual(total_time, 1800)  # 30 minutes total

    @patch('core.services.WiFi2BLEService.WiFi2BLEService.get_desk_state')
    def test_hot_desk_workflow_with_pico(self, mock_get_state):
        """Test hot desk workflow when Pico is attached and confirmation required"""
        
        # Attach Pico device
        pico = Pico.objects.create(
            desk=self.desk,
            mac_address='AA:BB:CC:DD:EE:FF',
            ip_address='192.168.1.101',
            status='online'
        )
        
        # Mock WiFi2BLE state
        mock_get_state.return_value = {
            "position_mm": 800,
            "speed_mms": 0,
            "status": "Normal"
        }
        
        # Step 1: Start hot desk session (pending verification)
        self.desk.current_user = self.user
        self.desk.current_status = 'pending_verification'
        self.desk.save()
        
        # Step 2: Confirm at desk (simulate physical confirmation)
        self.desk.current_status = 'occupied'
        self.desk.save()
        
        # Step 3: Create usage log
        usage_log = DeskUsageLog.objects.create(
            user=self.user,
            desk=self.desk,
            started_at=timezone.now(),
            sitting_time=900,  # 15 minutes
            standing_time=900,  # 15 minutes
            position_changes=3,
            source='hotdesk'
        )
        
        self.assertEqual(self.desk.current_user, self.user)
        self.assertEqual(self.desk.current_status, 'occupied')
        self.assertIsNotNone(usage_log)
        
        # Step 4: End hot desk session
        usage_log.ended_at = timezone.now()
        usage_log.save()
        
        self.desk.current_user = None
        self.desk.current_status = 'available'
        self.desk.save()
        
        # Verify final state
        self.assertIsNone(self.desk.current_user)
        self.assertEqual(self.desk.current_status, 'available')
        self.assertIsNotNone(usage_log.ended_at)
        total_time = usage_log.sitting_time + usage_log.standing_time
        self.assertEqual(total_time, 1800)  # 30 minutes total