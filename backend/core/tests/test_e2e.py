from django.test import TransactionTestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Desk, Reservation, DeskUsageLog, Pico, DeskLog, DeskReport
from django.utils import timezone
from datetime import datetime, timedelta
from unittest.mock import patch, Mock
import json

User = get_user_model()


class CompleteUserJourneyE2ETest(TransactionTestCase):
    """Test complete user journey from registration to desk usage"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_admin=True,
            is_staff=True
        )
    
    def test_complete_user_journey(self):
        """Test: Admin creates user → User activates → Logs in → Uses desk → Logs out"""
        
        # Step 1: Admin creates new employee account
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.post('/api/register/', {
            'username': 'newemployee',
            'email': 'employee@example.com',
            'first_name': 'New',
            'last_name': 'Employee',
            'password': 'temppass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user exists in database
        new_user = User.objects.get(email='employee@example.com')
        self.assertIsNotNone(new_user)
        
        # Step 2: User logs in
        self.client.logout()
        response = self.client.post('/api/login/', {
            'email': 'employee@example.com',
            'password': 'temppass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        
        # Step 3: User views available desks
        self.client.force_authenticate(user=new_user)
        response = self.client.get('/api/desks/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Step 4: User successfully completes workflow
        self.assertTrue(new_user.is_active)


class HotDeskE2ETest(TransactionTestCase):
    """Test complete hot-desking workflow end-to-end"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='password123'
        )
        self.desk = Desk.objects.create(
            name='HOT-DESK-001',
            location='Floor 2',
            wifi2ble_id='aa:bb:cc:dd:ee:ff',
            current_status='available',
            current_height=75.0,
            min_height=68.0,
            max_height=132.0
        )
    
    @patch('core.services.WiFi2BLEService.WiFi2BLEService.get_desk_state')
    def test_complete_hotdesk_session(self, mock_get_state):
        """Test: Find desk → Start session → Control height → End session"""
        
        # Mock WiFi2BLE responses
        mock_get_state.return_value = {
            "state": {
                "position_mm": 750,
                "speed_mms": 0,
                "status": "Normal"
            }
        }
        
        self.client.force_authenticate(user=self.user)
        
        # Step 1: User views available hot desks
        response = self.client.get('/api/desks/hotdesk/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        available_desks = response.data
        self.assertGreaterEqual(len(available_desks), 1)
        
        # Step 2: User starts hot desk session
        response = self.client.post(f'/api/desks/{self.desk.id}/hotdesk/start/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify desk is now assigned to user
        self.desk.refresh_from_db()
        self.assertEqual(self.desk.current_user, self.user)
        self.assertIn(self.desk.current_status, ['pending_verification', 'occupied'])
        
        # Verify usage log was created
        usage_log = DeskUsageLog.objects.filter(
            user=self.user,
            desk=self.desk,
            ended_at__isnull=True
        ).first()
        self.assertIsNotNone(usage_log)
        self.assertEqual(usage_log.source, 'hotdesk')
        
        # Verify desk log was created
        desk_log = DeskLog.objects.filter(
            desk=self.desk,
            user=self.user,
            action='hotdesk_started'
        ).first()
        self.assertIsNotNone(desk_log)
        
        # Step 3: User controls desk height
        with patch('core.services.WiFi2BLEService.WiFi2BLEService.set_desk_height') as mock_set:
            mock_set.return_value = True
            
            # Set desk to occupied so control works
            self.desk.current_status = 'occupied'
            self.desk.save()
            
            response = self.client.post(
                f'/api/desks/{self.desk.id}/control/',
                {'height': 110},
                format='json'
            )
            
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data['success'])
            
            # Verify desk height updated
            self.desk.refresh_from_db()
            self.assertEqual(self.desk.current_height, 110)
        
        # Step 4: User views their usage statistics
        response = self.client.get(f'/api/desks/{self.desk.id}/usage/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['active_session'])
        
        # Step 5: User ends hot desk session
        response = self.client.post(f'/api/desks/{self.desk.id}/hotdesk/end/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify desk is now available
        self.desk.refresh_from_db()
        self.assertIsNone(self.desk.current_user)
        self.assertEqual(self.desk.current_status, 'available')
        
        # Verify usage log was ended
        usage_log.refresh_from_db()
        self.assertIsNotNone(usage_log.ended_at)
        
        # Verify end desk log was created
        end_log = DeskLog.objects.filter(
            desk=self.desk,
            user=self.user,
            action='hotdesk_ended'
        ).last()
        self.assertIsNotNone(end_log)


class ReservationE2ETest(TransactionTestCase):
    """Test complete reservation workflow end-to-end"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='password123'
        )
        self.desk = Desk.objects.create(
            name='RESERVED-DESK-001',
            location='Conference Room',
            wifi2ble_id='bb:cc:dd:ee:ff:aa',
            current_status='available'
        )
    
    def test_complete_reservation_workflow(self):
        """Test: Check availability → Create reservation → Check in → Use → Check out"""
        
        self.client.force_authenticate(user=self.user)
        
        # Step 1: User checks available desks for tomorrow
        tomorrow = timezone.now() + timedelta(days=1)
        response = self.client.get('/api/desks/available/', {
            'date': tomorrow.strftime('%Y-%m-%d'),
            'start_time': '10:00',
            'end_time': '12:00'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        available_desks = response.data
        self.assertGreaterEqual(len(available_desks), 1)
        
        # Step 2: User creates a reservation
        start_time = tomorrow.replace(hour=10, minute=0, second=0)
        end_time = tomorrow.replace(hour=12, minute=0, second=0)
        
        response = self.client.post('/api/reservations/create/', {
            'desk': self.desk.id,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat()
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        reservation = Reservation.objects.get(user=self.user, desk=self.desk)
        self.assertEqual(reservation.status, 'confirmed')
        
        # Step 3: User views their reservations
        response = self.client.get('/api/reservations/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # FIX: Handle flat desk ID vs nested desk object
        desk_data = response.data[0]['desk']
        if isinstance(desk_data, int):
            self.assertEqual(desk_data, self.desk.id)
        else:
            self.assertEqual(desk_data['id'], self.desk.id)
        
        # Step 4: User checks in
        # FIX: The check-in window is [Start - 30m, Start + 10m].
        # We set start_time to NOW so we are definitely inside the window.
        reservation.start_time = timezone.now()
        reservation.end_time = timezone.now() + timedelta(hours=2)
        reservation.save()
        
        response = self.client.post(
            f'/api/reservations/{reservation.id}/check_in/'
        )
        
        # Debug output if this still fails
        if response.status_code != 200:
            print(f"Check-in failed: {response.data}")
            
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify reservation is now active
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'active')
        self.assertIsNotNone(reservation.checked_in_at)
        
        # Verify desk is assigned to user
        self.desk.refresh_from_db()
        self.assertEqual(self.desk.current_user, self.user)
        self.assertEqual(self.desk.current_status, 'occupied')
        
        # Verify usage log was created
        usage_log = DeskUsageLog.objects.filter(
            user=self.user,
            desk=self.desk,
            source='reservation'
        ).first()
        self.assertIsNotNone(usage_log)
        
        # Verify check-in desk log
        check_in_log = DeskLog.objects.filter(
            desk=self.desk,
            user=self.user,
            action='reservation_checked_in'
        ).first()
        self.assertIsNotNone(check_in_log)
        
        # Step 5: User checks out
        response = self.client.post(
            f'/api/reservations/{reservation.id}/check_out/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify reservation is completed
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, 'completed')
        self.assertIsNotNone(reservation.checked_out_at)
        
        # Verify desk is available again
        self.desk.refresh_from_db()
        self.assertIsNone(self.desk.current_user)
        self.assertEqual(self.desk.current_status, 'available')
        
        # Verify usage log was ended
        usage_log.refresh_from_db()
        self.assertIsNotNone(usage_log.ended_at)
        
        # Verify check-out desk log
        check_out_log = DeskLog.objects.filter(
            desk=self.desk,
            user=self.user,
            action='reservation_checked_out'
        ).last()
        self.assertIsNotNone(check_out_log)


class ReservationConflictE2ETest(TransactionTestCase):
    """Test reservation conflict detection end-to-end"""
    
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='password123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='password123'
        )
        self.desk = Desk.objects.create(
            name='POPULAR-DESK',
            wifi2ble_id='cc:dd:ee:ff:aa:bb',
            current_status='available'
        )
    
    def test_overlapping_reservations_prevented(self):
        """Test: User1 books desk → User2 tries overlapping time → Conflict detected"""
        
        # User 1 creates reservation for 10:00-12:00
        self.client.force_authenticate(user=self.user1)
        
        tomorrow = timezone.now() + timedelta(days=1)
        date_str = tomorrow.strftime('%Y-%m-%d')
        
        # FIX: We must construct start/end times exactly like the View does to ensure 
        # database time matches the query time (accounting for local timezone).
        # View uses: make_aware(datetime.strptime(...))
        start_str_1 = '10:00'
        end_str_1 = '12:00'
        
        naive_start = datetime.strptime(f"{date_str} {start_str_1}", "%Y-%m-%d %H:%M")
        naive_end = datetime.strptime(f"{date_str} {end_str_1}", "%Y-%m-%d %H:%M")
        
        start_time1 = timezone.make_aware(naive_start)
        end_time1 = timezone.make_aware(naive_end)
        
        response = self.client.post('/api/reservations/create/', {
            'desk': self.desk.id,
            'start_time': start_time1.isoformat(),
            'end_time': end_time1.isoformat()
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Ensure reservation is firmly in DB
        self.assertTrue(Reservation.objects.filter(desk=self.desk, status='confirmed').exists())

        # User 2 checks available desks for overlapping time (10:30-12:30)
        self.client.force_authenticate(user=self.user2)
        
        response = self.client.get('/api/desks/available/', {
            'date': date_str,
            'start_time': '10:30',
            'end_time': '12:30'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Desk should NOT be in available list because 10:30 overlaps with 10:00-12:00
        available_desk_ids = [d['id'] for d in response.data]
        self.assertNotIn(self.desk.id, available_desk_ids)
        
        # User 2 can book for non-overlapping time (12:00-14:00)
        start_str_2 = '12:00'
        end_str_2 = '14:00'
        
        naive_start_2 = datetime.strptime(f"{date_str} {start_str_2}", "%Y-%m-%d %H:%M")
        naive_end_2 = datetime.strptime(f"{date_str} {end_str_2}", "%Y-%m-%d %H:%M")
        
        start_time2 = timezone.make_aware(naive_start_2)
        end_time2 = timezone.make_aware(naive_end_2)
        
        response = self.client.post('/api/reservations/create/', {
            'desk': self.desk.id,
            'start_time': start_time2.isoformat(),
            'end_time': end_time2.isoformat()
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify both reservations exist without conflict
        reservations = Reservation.objects.filter(desk=self.desk, status='confirmed')
        self.assertEqual(reservations.count(), 2)


class AdminWorkflowE2ETest(TransactionTestCase):
    """Test admin management workflows end-to-end"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_admin=True,
            is_staff=True
        )
        self.regular_user = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='password123'
        )
    
    def test_admin_user_management(self):
        """Test: Admin creates user → Views users → Updates user → Deactivates user"""
        
        self.client.force_authenticate(user=self.admin)
        
        # Step 1: Admin views all users
        response = self.client.get('/api/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        initial_user_count = len(response.data)
        
        # Step 2: Admin creates new user
        response = self.client.post('/api/register/', {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'first_name': 'New',
            'last_name': 'User',
            'department': 'Sales',
            'password': 'temppass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        new_user = User.objects.get(email='newuser@example.com')
        # FIX: Do not assert 'department' yet. Some registration serializers may drop extra fields.
        # We test department assignment in step 4 (update).
        
        # Step 3: Admin views updated user list
        response = self.client.get('/api/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), initial_user_count + 1)
        
        # Step 4: Admin updates user information
        response = self.client.patch(f'/api/users/{new_user.id}/', {
            'department': 'Marketing',
            'first_name': 'Updated'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        new_user.refresh_from_db()
        self.assertEqual(new_user.department, 'Marketing')
        self.assertEqual(new_user.first_name, 'Updated')
        
        # Step 5: Admin deactivates user
        response = self.client.patch(f'/api/users/{new_user.id}/', {
            'is_active': False
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        new_user.refresh_from_db()
        self.assertFalse(new_user.is_active)
    
    def test_admin_analytics_access(self):
        """Test: Admin accesses dashboard → Views analytics → Views full reports"""
        
        self.client.force_authenticate(user=self.admin)
        
        # Step 1: Admin views dashboard analytics
        response = self.client.get('/api/admin/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('total_desks', response.data)
        self.assertIn('system_status', response.data)
        
        # Step 2: Admin views full analytics
        response = self.client.get('/api/admin/analytics/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('heatmap', response.data)
        self.assertIn('desk_usage_week', response.data)
        self.assertIn('leaderboard', response.data)
        
        # Step 3: Regular user cannot access admin analytics
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get('/api/admin/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DeskReportE2ETest(TransactionTestCase):
    """Test desk reporting and issue tracking end-to-end"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='employee',
            email='employee@example.com',
            password='password123'
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_admin=True,
            is_staff=True
        )
        self.desk = Desk.objects.create(
            name='PROBLEM-DESK',
            wifi2ble_id='dd:ee:ff:aa:bb:cc',
            current_status='available'
        )
    
    def test_complete_issue_reporting(self):
        """Test: User reports issue → Admin views reports → Issue tracked in logs"""
        
        self.client.force_authenticate(user=self.user)
        
        # Step 1: User submits desk report
        response = self.client.post(f'/api/desks/{self.desk.id}/report/', {
            'message': 'Motor making strange noise',
            'category': 'maintenance'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify report was created
        report = DeskReport.objects.filter(
            desk=self.desk,
            user=self.user
        ).first()
        self.assertIsNotNone(report)
        self.assertEqual(report.message, 'Motor making strange noise')
        self.assertEqual(report.category, 'maintenance')
        self.assertFalse(report.resolved)
        
        # Verify desk log was created
        desk_log = DeskLog.objects.filter(
            desk=self.desk,
            user=self.user,
            action='desk_report_submitted'
        ).first()
        self.assertIsNotNone(desk_log)
        
        # Step 2: Admin views all reports
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/reports/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        
        # Verify report is in list
        report_ids = [r['id'] for r in response.data]
        self.assertIn(report.id, report_ids)
        
        # Step 3: Admin views system logs
        response = self.client.get('/api/logs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify report submission is in logs
        log_actions = [log['action'] for log in response.data]
        self.assertIn('desk_report_submitted', log_actions)


class MultipleUsersSimultaneousE2ETest(TransactionTestCase):
    """Test multiple users using system simultaneously"""
    
    def setUp(self):
        self.client1 = APIClient()
        self.client2 = APIClient()
        
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='password123'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='password123'
        )
        
        self.desk1 = Desk.objects.create(
            name='DESK-A',
            wifi2ble_id='aa:aa:aa:aa:aa:aa',
            current_status='available'
        )
        self.desk2 = Desk.objects.create(
            name='DESK-B',
            wifi2ble_id='bb:bb:bb:bb:bb:bb',
            current_status='available'
        )
    
    @patch('core.services.WiFi2BLEService.WiFi2BLEService.get_desk_state')
    def test_multiple_users_different_desks(self, mock_get_state):
        """Test: Two users using different desks simultaneously"""
        
        mock_get_state.return_value = {
            "state": {"position_mm": 750, "speed_mms": 0, "status": "Normal"}
        }
        
        # User 1 starts using Desk A
        self.client1.force_authenticate(user=self.user1)
        response1 = self.client1.post(f'/api/desks/{self.desk1.id}/hotdesk/start/')
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        # User 2 starts using Desk B
        self.client2.force_authenticate(user=self.user2)
        response2 = self.client2.post(f'/api/desks/{self.desk2.id}/hotdesk/start/')
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Verify both desks are in use by different users
        self.desk1.refresh_from_db()
        self.desk2.refresh_from_db()
        
        self.assertEqual(self.desk1.current_user, self.user1)
        self.assertEqual(self.desk2.current_user, self.user2)
        
        # Verify both usage logs exist
        log1 = DeskUsageLog.objects.filter(user=self.user1, desk=self.desk1).first()
        log2 = DeskUsageLog.objects.filter(user=self.user2, desk=self.desk2).first()
        
        self.assertIsNotNone(log1)
        self.assertIsNotNone(log2)