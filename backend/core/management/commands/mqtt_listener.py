from django.core.management.base import BaseCommand
from core.services.MQTTService import MQTTService
import time
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Start MQTT listener for Pico devices'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting MQTT listener...'))
        self.stdout.write(self.style.SUCCESS(f'Connecting to MQTT broker...'))
        
        mqtt_service = MQTTService()
        mqtt_service.connect()
        
        self.stdout.write(self.style.SUCCESS('MQTT listener started. Press Ctrl+C to stop.'))
        
        try:
            # Keep the service running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nStopping MQTT listener...'))
            mqtt_service.disconnect()
            self.stdout.write(self.style.SUCCESS('MQTT listener stopped'))