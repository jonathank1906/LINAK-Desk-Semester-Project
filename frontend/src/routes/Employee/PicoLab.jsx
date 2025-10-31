import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function PicoLab({ picoId }) {
  const [ledState, setLedState] = useState(false);
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [picoId]);

  const fetchSensorData = async () => {
  try {
    console.log(`DEBUG: Fetching sensor data for Pico ID ${picoId}`);
    const response = await axios.get(
      `http://localhost:8000/api/pico/${picoId}/sensors/`
    );
    console.log("DEBUG: Sensor API response", response.data);
    setSensorData(response.data.readings);
  } catch (error) {
    console.error("Failed to fetch sensor data:", error);
  }
};

const toggleLed = async () => {
  setLoading(true);
  try {
    console.log(`DEBUG: Sending LED control to Pico ID ${picoId}, on=${!ledState}`);
    const response = await axios.post(`http://localhost:8000/api/pico/${picoId}/led/`, {
      on: !ledState
    });
    console.log("DEBUG: LED API response", response.data);
    setLedState(!ledState);
    toast.success(`LED turned ${!ledState ? 'on' : 'off'}`);
  } catch (error) {
    console.error("Failed to control LED", error);
    toast.error("Failed to control LED");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>LED Control</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={toggleLed} disabled={loading}>
            Turn LED {ledState ? "OFF" : "ON"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Temperature Readings</CardTitle>
        </CardHeader>
        <CardContent>
          {sensorData.map((reading, idx) => (
            <div key={idx} className="flex justify-between py-2">
              <span>{new Date(reading.timestamp).toLocaleTimeString()}</span>
              <span>{reading.temperature}°C</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}