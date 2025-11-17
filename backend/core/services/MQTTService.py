import paho.mqtt.client as mqtt
import json
import logging
from django.conf import settings
from core.models import Pico, SensorReading, Desk

logger = logging.getLogger(__name__)
_mqtt_service_instance = None

class MQTTService:
    """Service to handle MQTT communication with Pico devices"""
    
    def __init__(self):
        self.broker = getattr(settings, 'MQTT_BROKER', '192.168.43.86')
        self.port = getattr(settings, 'MQTT_PORT', 1883)
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect  # ✅ Add disconnect handler
        self.connected = False
        
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            logger.info("✅ Connected to MQTT broker")
            self.connected = True
            # Subscribe to all pico topics and desk confirmations
            client.subscribe("/#")  # Subscribe to all topics
            client.subscribe("/desk/+/confirm")  # Explicitly subscribe to desk confirmations
            logger.info("Subscribed to all topics and /desk/+/confirm")
        else:
            logger.error(f"❌ Failed to connect to MQTT broker: {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        logger.warning(f"⚠️ Disconnected from MQTT broker (rc: {rc})")
        
    def is_connected(self):
        """Check if MQTT client is connected"""
        return self.connected
            
    def on_message(self, client, userdata, msg):
        """Callback when message received from MQTT"""
        try:
            print(f"MQTT DEBUG: Received topic={msg.topic}, payload={msg.payload.decode()}")
            topic = msg.topic
            payload = msg.payload.decode()
            
            logger.info(f"Received: {topic} = {payload}")

            # --- Desk confirmation handler ---
            parts = topic.split('/')
            if len(parts) >= 5 and parts[2] == "desk" and parts[4] == "confirm":
                try:
                    desk_id = int(parts[3])
                    data = json.loads(payload)
                    if data.get("action") == "confirm_button":
                        self.handle_desk_confirm(desk_id)
                except Exception as e:
                    logger.error(f"Error handling desk confirmation: {e}")
                return

            # --- Existing device topic handling ---
            parts = topic.split('/')
            if len(parts) >= 3:
                device_id = parts[1]  # e.g., "picof24d"
                sensor_type = parts[2]
                
                if sensor_type == "temperature":
                    self.handle_temperature(device_id, float(payload))
                elif sensor_type == "led":
                    self.handle_led_state(device_id, payload)
                elif sensor_type == "online":
                    self.handle_online_status(device_id, payload)
                    
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")
            
    def handle_desk_confirm(self, desk_id):
        """Mark desk as occupied when confirmation is received"""
        try:
            desk = Desk.objects.get(id=desk_id)
            if desk.current_status == "pending_verification":
                desk.current_status = "occupied"
                desk.save()
                logger.info(f"✅ Desk {desk_id} confirmed via MQTT and marked as occupied.")
            else:
                logger.warning(f"⚠️ Desk {desk_id} confirm ignored: not pending_verification")
        except Desk.DoesNotExist:
            logger.error(f"❌ Desk {desk_id} not found for confirmation")
        except Exception as e:
            logger.error(f"Error in handle_desk_confirm: {e}")

    def handle_temperature(self, device_id, temperature):
        """Store temperature reading, keeping max 10 per Pico device"""
        try:
            pico = Pico.objects.filter(mac_address__icontains=device_id[:8]).first()
            if pico:
                logger.info(f"Temperature {temperature}°C from device {device_id}")
                from django.utils import timezone
                pico.last_seen = timezone.now()
                pico.save()
                # Check count and delete oldest if needed
                readings = SensorReading.objects.filter(pico_device_id=pico.id).order_by('timestamp')
                if readings.count() >= 10:
                    oldest = readings.first()
                    oldest.delete()
                # Save new temperature reading
                SensorReading.objects.create(
                    pico_device_id=pico.id,
                    temperature=temperature,
                    timestamp=timezone.now()
                )
            else:
                logger.warning(f"Pico device not found: {device_id}")
        except Exception as e:
            logger.error(f"Error handling temperature: {e}")
            
    def handle_led_state(self, device_id, state):
        """Handle LED state update"""
        logger.info(f"LED state for {device_id}: {state}")
        
    def handle_online_status(self, device_id, status):
        """Handle device online/offline status"""
        try:
            pico = Pico.objects.filter(mac_address__icontains=device_id[:8]).first()
            if pico:
                pico.status = 'online' if status == '1' else 'offline'
                from django.utils import timezone
                pico.last_seen = timezone.now()
                pico.save()
                logger.info(f"Updated status for {device_id}: {pico.status}")
            else:
                logger.warning(f"Pico device not found: {device_id}")
        except Exception as e:
            logger.error(f"Error handling online status: {e}")
        
    def connect(self):
        """Connect to MQTT broker"""
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()  # Start background thread
            logger.info(f"🔌 Connecting to MQTT broker at {self.broker}:{self.port}")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MQTT broker: {e}")
            self.connected = False
            
    def disconnect(self):
        """Disconnect from MQTT broker"""
        self.client.loop_stop()
        self.client.disconnect()
        self.connected = False
        logger.info("Disconnected from MQTT broker")
        
    def publish(self, topic, message, retain=False):
        """Publish message to MQTT topic"""
        if self.connected:
            self.client.publish(topic, message, retain=retain)
            logger.info(f"📤 Published to {topic}: {message}")
        else:
            logger.warning("⚠️ Cannot publish - not connected to MQTT broker")
            
    def control_led(self, device_id, on):
        """Send LED control command to Pico"""
        topic = f"/{device_id}/led"
        message = "On" if on else "Off"
        self.publish(topic, message)

def get_mqtt_service():
    global _mqtt_service_instance
    if _mqtt_service_instance is None:
        _mqtt_service_instance = MQTTService()
        _mqtt_service_instance.connect()
    return _mqtt_service_instance