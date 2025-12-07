from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class UserRegistrationTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
    
    def test_user_registration(self):
        """Test user can register with valid data"""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post('/api/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())
    
    def test_registration_with_duplicate_email(self):
        """Test registration fails with duplicate email"""
        User.objects.create_user(
            username='existing',
            email='test@example.com',
            password='password123'
        )
        
        data = {
            'username': 'newuser',
            'email': 'test@example.com',
            'password': 'securepass123'
        }
        
        response = self.client.post('/api/register/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginLogoutTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_login_with_valid_credentials(self):
        """Test user can login with correct credentials"""
        response = self.client.post('/api/login/', {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))
        
        # Check cookies are set
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
    
    def test_login_with_invalid_credentials(self):
        """Test login fails with wrong password"""
        response = self.client.post('/api/login/', {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_with_nonexistent_user(self):
        """Test login fails with non-existent email"""
        response = self.client.post('/api/login/', {
            'email': 'nonexistent@example.com',
            'password': 'password123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_logout(self):
        """Test user can logout"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post('/api/logout/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('success'))


class TokenAuthenticationTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_access_protected_endpoint_without_auth(self):
        """Test accessing protected endpoint without authentication fails"""
        response = self.client.get('/api/desks/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_access_protected_endpoint_with_auth(self):
        """Test accessing protected endpoint with authentication succeeds"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/desks/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_get_authenticated_user_info(self):
        """Test getting current user information"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get('/api/authenticated/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['username'], 'testuser')


class PasswordResetTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='oldpassword123'
        )
    
    def test_password_reset_request(self):
        """Test requesting password reset sends email"""
        response = self.client.post('/api/auth/users/reset_password/', {
            'email': 'test@example.com'
        })
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
    
    def test_password_reset_with_invalid_token(self):
        """Test password reset fails with invalid token"""
        response = self.client.post('/api/password/reset/confirm/999/invalid-token', {
            'new_password': 'newpassword123',
            're_new_password': 'newpassword123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_password_reset_with_mismatched_passwords(self):
        """Test password reset fails when passwords don't match"""
        response = self.client.post(f'/api/password/reset/confirm/{self.user.id}/valid-token', {
            'new_password': 'newpassword123',
            're_new_password': 'differentpassword'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserPermissionsTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.regular_user = User.objects.create_user(
            username='regular',
            email='regular@example.com',
            password='password123',
            is_admin=False
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='password123',
            is_admin=True,
            is_staff=True
        )
    
    def test_regular_user_cannot_access_admin_endpoints(self):
        """Test regular user cannot access admin-only endpoints"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get('/api/users/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_access_admin_endpoints(self):
        """Test admin user can access admin-only endpoints"""
        self.client.force_authenticate(user=self.admin_user)
        
        response = self.client.get('/api/users/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_regular_user_can_access_own_data(self):
        """Test regular user can access their own data"""
        self.client.force_authenticate(user=self.regular_user)
        
        response = self.client.get('/api/authenticated/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'regular@example.com')


class AccountActivationTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
    
    def test_set_initial_password_with_invalid_token(self):
        """Test that invalid tokens are rejected"""
        # Create a user
        user = User.objects.create_user(
            username='newuser',
            email='newuser@example.com',
            is_active=False
        )
        
        # Use an invalid token - should return 400
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        response = self.client.post(
            f'/api/auth/set-initial-password/{uid}/invalid-token-here/',
            {'password': 'newpassword123'}
        )
        
        # Should fail with invalid token
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_set_initial_password_with_valid_token(self):
        """Test setting password with valid token activates account"""
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        # Create inactive user
        user = User.objects.create_user(
            username='newuser',
            email='newuser@example.com',
            is_active=False
        )
        user.set_unusable_password()
        user.save()
        
        # Generate valid token
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        
        # Set initial password
        response = self.client.post(
            f'/api/auth/set-initial-password/{uid}/{token}/',
            {'password': 'newpassword123'}
        )
        
        # Should succeed
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user is now active and can login
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password('newpassword123'))
    
    def test_set_initial_password_missing_password(self):
        """Test that password field is required"""
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        
        user = User.objects.create_user(
            username='newuser',
            email='newuser@example.com',
            is_active=False
        )
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = 'any-token'
        
        # Try without password field
        response = self.client.post(
            f'/api/auth/set-initial-password/{uid}/{token}/',
            {}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)