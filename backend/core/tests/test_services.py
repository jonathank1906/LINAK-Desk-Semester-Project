from django.test import TestCase
from unittest.mock import patch, Mock, MagicMock
from core.services.WiFi2BLEService import WiFi2BLEService
from core.services.MQTTService import MQTTService, get_mqtt_service
import json


class WiFi2BLEServiceTest(TestCase):
    def setUp(self):
        self.service = WiFi2BLEService()
        self.service.base_url = "http://localhost:8001"
        self.service.api_key = "test-api-key"

    @patch('requests.get')
    def test_get_all_desk_ids(self, mock_get):
        """Test retrieving all desk IDs from WiFi2BLE"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            "cd:fb:1a:53:fb:e6",
            "aa:bb:cc:dd:ee:ff",
            "11:22:33:44:55:66"
        ]
        mock_get.return_value = mock_response

        result = self.service.get_all_desk_ids()

        self.assertIsNotNone(result)
        self.assertEqual(len(result), 3)
        self.assertIn("cd:fb:1a:53:fb:e6", result)

    @patch('requests.get')
    def test_get_desk_state_success(self, mock_get):
        """Test successfully getting desk state"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "config": {
                "name": "DESK 4486",
                "manufacturer": "Linak"
            },
            "state": {
                "position_mm": 800,
                "speed_mms": 0,
                "status": "Normal"
            }
        }
        mock_get.return_value = mock_response

        result = self.service.get_desk_state("cd:fb:1a:53:fb:e6")

        self.assertIsNotNone(result)
        self.assertEqual(result['state']['position_mm'], 800)
        self.assertEqual(result['state']['status'], 'Normal')

    @patch('requests.get')
    def test_get_desk_state_failure(self, mock_get):
        """Test handling failed desk state request"""
        mock_get.side_effect = Exception("Connection error")
        with self.assertRaises(Exception):
            self.service.get_desk_state("cd:fb:1a:53:fb:e6")

    @patch('requests.put')
    def test_set_desk_height_success(self, mock_put):
        """Test successfully setting desk height"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        mock_put.return_value = mock_response

        result = self.service.set_desk_height("cd:fb:1a:53:fb:e6", 110)

        self.assertTrue(result)

        # Verify correct conversion from cm to mm
        call_args = mock_put.call_args
        self.assertEqual(call_args[1]['json']['position_mm'], 1100)

    @patch('requests.put')
    def test_set_desk_height_failure(self, mock_put):
        """Test handling failed desk height command"""
        mock_put.side_effect = Exception("Connection error")
        with self.assertRaises(Exception):
            self.service.set_desk_height("cd:fb:1a:53:fb:e6", 110)

    @patch('requests.get')
    def test_get_desk_full_info(self, mock_get):
        """Test getting complete desk information"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "config": {
                "name": "DESK 4486",
                "manufacturer": "Linak"
            },
            "state": {
                "position_mm": 750,
                "speed_mms": 32,
                "status": "Moving"
            },
            "usage": {
                "activationsCounter": 150,
                "sitStandCounter": 75
            }
        }
        mock_get.return_value = mock_response

        result = self.service.get_desk_full_info("cd:fb:1a:53:fb:e6")

        self.assertIsNotNone(result)
        self.assertEqual(result['config']['name'], 'DESK 4486')
        self.assertEqual(result['usage']['activationsCounter'], 150)


class MQTTServiceTest(TestCase):
    @patch('paho.mqtt.client.Client')
    def test_mqtt_service_initialization(self, mock_client_class):
        """Test MQTT service initializes correctly"""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        service = MQTTService()
        service.broker = "localhost"
        service.port = 1883
        service.client = mock_client

        self.assertIsNotNone(service)
        mock_client_class.assert_called_once()

    @patch('paho.mqtt.client.Client')
    def test_mqtt_connect(self, mock_client_class):
        """Test MQTT connection"""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        service = MQTTService()
        service.broker = "localhost"
        service.port = 1883
        service.client = mock_client
        service.connect()

        mock_client.connect.assert_called_once_with("localhost", 1883, 60)

    @patch('paho.mqtt.client.Client')
    def test_mqtt_publish(self, mock_client_class):
        """Test publishing MQTT message"""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        service = MQTTService()
        service.broker = "localhost"
        service.port = 1883
        service.client = mock_client
        service.connected = True  # Ensure publish will actually call client.publish

        topic = "/desk/1/display"
        message = {"action": "update", "height": 110}

        service.publish(topic, json.dumps(message))

        mock_client.publish.assert_called_once_with(
            topic,
            json.dumps(message),
            retain=False
        )

    @patch('paho.mqtt.client.Client')
    def test_mqtt_notify_desk_moving(self, mock_client_class):
        """Test notifying Pico that desk is moving"""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        service = MQTTService()
        service.broker = "localhost"
        service.port = 1883
        service.client = mock_client
        service.connected = True  # Ensure publish will actually call client.publish

        service.notify_desk_moving(
            desk_id=1,
            target_height=110,
            is_moving=True,
            user_name="John Doe"
        )

        # Verify publish was called
        mock_client.publish.assert_called_once()

    @patch('paho.mqtt.client.Client')
    def test_mqtt_notify_desk_available(self, mock_client_class):
        """Test notifying Pico that desk is available"""
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        service = MQTTService()
        service.broker = "localhost"
        service.port = 1883
        service.client = mock_client
        service.connected = True  # Ensure publish will actually call client.publish

        service.notify_desk_available(desk_id=1)

        # Verify publish was called
        mock_client.publish.assert_called_once()

    def test_get_mqtt_service_singleton(self):
        """Test MQTT service singleton pattern"""
        service1 = get_mqtt_service()
        service2 = get_mqtt_service()

        # Should return same instance
        self.assertIs(service1, service2)