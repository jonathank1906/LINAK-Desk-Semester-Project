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
        self.broker = getattr(settings, 'MQTT_BROKER', 'localhost')
        self.port = getattr(settings, 'MQTT_PORT', 1883)
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect
        self.connected = False
        
    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        if rc == 0:
            logger.info("Connected to MQTT broker")
            self.connected = True
            # Subscribe to all topics including MAC-prefixed desk confirmations
            client.subscribe("#")  # Subscribe to ALL topics (includes MAC-prefixed)
            logger.info("Subscribed to # (all topics)")
        else:
            logger.error(f"Failed to connect to MQTT broker: {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.connected = False
        logger.warning(f"Disconnected from MQTT broker (rc: {rc})")
        
    def is_connected(self):
        """Check if MQTT client is connected"""
        return self.connected
            
    def on_message(self, client, userdata, msg):
        """Callback when message received from MQTT"""
        try:
            topic = msg.topic
            payload = msg.payload.decode()
            
            print(f"MQTT: topic={topic}, payload={payload}")
            logger.info(f"Received: {topic} = {payload}")

            # --- Desk confirmation handler ---
            # Handle both formats:
            # /desk/1/confirm (direct)
            # /2C:CF:67:DC:07:73/desk/1/confirm (with MAC prefix)
            parts = topic.split('/')
            
            # Check for confirmation message
            if "confirm" in parts:
                try:
                    # Find desk_id - it's right before "confirm"
                    confirm_idx = parts.index("confirm")
                    
                    if confirm_idx > 0:
                        desk_id = int(parts[confirm_idx - 1])
                        data = json.loads(payload)
                        
                        if data.get("action") == "confirm_button":
                            print(f"MQTT: Calling handle_desk_confirm({desk_id})")
                            logger.info(f"Desk confirmation received for desk {desk_id}")
                            self.handle_desk_confirm(desk_id)
                            print(f"MQTT: handle_desk_confirm returned")
                            
                except (ValueError, IndexError) as e:
                    logger.error(f"Error parsing desk confirmation topic: {e}")
                return

            # --- Existing device topic handling ---
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
            import traceback
            traceback.print_exc()
            
    def handle_desk_confirm(self, desk_id):
        """Mark desk as occupied when confirmation is received"""
        logger.error(f"ENTERED handle_desk_confirm FOR DESK {desk_id}")
        print(f"ENTERED handle_desk_confirm FOR DESK {desk_id}")
        
        try:
            from core.models import Reservation, DeskUsageLog, DeskLog
            from django.utils import timezone
            
            logger.error(f"Fetching desk {desk_id}")
            desk = Desk.objects.get(id=desk_id)
            logger.error(f"Found desk: status={desk.current_status}, user={desk.current_user}")
            
            if desk.current_status == "pending_verification":
                logger.error(f"Desk is pending_verification, changing to occupied")
                desk.current_status = "occupied"
                desk.save()
                logger.error(f"Desk {desk_id} saved as OCCUPIED")
                
                # Check if this is a reservation that needs to be activated
                if desk.current_user:
                    logger.error(f"Desk has current_user: {desk.current_user.id}")
                    
                    pending_reservation = Reservation.objects.filter(
                        desk=desk,
                        user=desk.current_user,
                        status="pending_confirmation"
                    ).first()
                    
                    logger.error(f"Found pending_reservation: {pending_reservation}")

                    if pending_reservation:
                        logger.error(f"Activating reservation {pending_reservation.id}")
                        
                        # This is a reservation check-in - complete it now
                        pending_reservation.status = "active"
                        pending_reservation.save()
                        logger.error(f"Reservation saved as ACTIVE")

                        # Create usage log for reservation
                        usage_log = DeskUsageLog.objects.create(
                            user=desk.current_user,
                            desk=desk,
                            started_at=timezone.now(),
                            source="reservation",
                        )
                        logger.error(f"Created usage log: {usage_log.id}")

                        # Desk log entry
                        DeskLog.objects.create(
                            desk=desk,
                            user=desk.current_user,
                            action="reservation_confirmed_via_mqtt"
                        )
                        logger.error(f"Created desk log")
                    else:
                        logger.error(f"No pending reservation (must be hotdesk)")
                else:
                    logger.error(f"No current_user on desk")
                
            else:
                logger.error(f"Desk status is {desk.current_status}, NOT pending_verification")
                
            logger.error(f"EXITING handle_desk_confirm FOR DESK {desk_id}")
                
        except Desk.DoesNotExist:
            logger.error(f"Desk {desk_id} NOT FOUND")
        except Exception as e:
            logger.error(f"Exception in handle_desk_confirm: {e}")
            import traceback
            traceback.print_exc()

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
            logger.info(f"Connecting to MQTT broker at {self.broker}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to MQTT broker: {e}")
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
            logger.info(f"Published to {topic}: {message}")
        else:
            logger.warning("Cannot publish - not connected to MQTT broker")
            
    def control_led(self, device_id, on):
        """Send LED control command to Pico"""
        topic = f"/{device_id}/led"
        message = "On" if on else "Off"
        self.publish(topic, message)

    def notify_desk_moving(self, desk_id, target_height, is_moving, user_name=""):
        """
        Notify Pico that desk is moving or stopped.
        Backend calls this with semantic state, Pico decides LED/buzzer behavior.
        """
        topic = f"/desk/{desk_id}/display"
        message = {
            "action": "update_height",
            "desk_id": desk_id,
            "height": target_height,
            "is_moving": is_moving,  # Pico will set yellow LED + buzzer if True
            "user": user_name
        }
        self.publish(topic, json.dumps(message))
        logger.info(f"Desk {desk_id}: height={target_height}cm, moving={is_moving}")
    
    def notify_desk_available(self, desk_id):
        """Notify Pico that desk is available (green LED)"""
        topic = f"/desk/{desk_id}/display"
        message = {
            "action": "show_available",
            "desk_id": desk_id
        }
        self.publish(topic, json.dumps(message))
        logger.info(f"Desk {desk_id}: Available")
    
    def notify_desk_in_use(self, desk_id, user_name):
        """Notify Pico that desk is occupied (blue LED)"""
        topic = f"/desk/{desk_id}/display"
        message = {
            "action": "show_in_use",
            "desk_id": desk_id,
            "user": user_name
        }
        self.publish(topic, json.dumps(message))
        logger.info(f"Desk {desk_id}: In use by {user_name}")
    
    def notify_desk_error(self, desk_id, error_message):
        """Notify Pico of an error state (red LED)"""
        topic = f"/desk/{desk_id}/display"
        message = {
            "action": "show_error",
            "desk_id": desk_id,
            "error": error_message
        }
        self.publish(topic, json.dumps(message))
        logger.info(f"Desk {desk_id}: Error - {error_message}")

def get_mqtt_service():
    global _mqtt_service_instance
    if _mqtt_service_instance is None:
        _mqtt_service_instance = MQTTService()
        _mqtt_service_instance.connect()
    return _mqtt_service_instance