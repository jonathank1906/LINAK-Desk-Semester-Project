import requests
import logging

logger = logging.getLogger(__name__)

class WiFi2BLEService:
    """Service to communicate with WiFi2BLE Box simulator"""
    
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.api_key = "E9Y2LxT4g1hQZ7aD8nR3mWx5P0qK6pV7"
        self.version = "v2"
    
    def _build_url(self, endpoint):
        """Helper to build full API URL"""
        return f"{self.base_url}/api/{self.version}/{self.api_key}/{endpoint}"
    
    def get_all_desk_ids(self):
        """Get list of all desk IDs from WiFi2BLE"""
        try:
            url = self._build_url("desks")
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get desk IDs: {e}")
            return []
    
    def get_desk_full_info(self, desk_id):
        """Get complete desk information"""
        try:
            url = self._build_url(f"desks/{desk_id}")
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get desk {desk_id} info: {e}")
            return None
    
    def get_desk_state(self, desk_id):
        """Get current desk state (position, speed, status)"""
        try:
            url = self._build_url(f"desks/{desk_id}/state")
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get desk {desk_id} state: {e}")
            return None
    
    def set_desk_height(self, desk_id, height_cm):
        """Set desk to specific height in centimeters"""
        try:
            height_mm = int(height_cm * 10)
            url = self._build_url(f"desks/{desk_id}/state")
            response = requests.put(
                url, 
                json={"position_mm": height_mm},
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to set desk {desk_id} height: {e}")
            return None