import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";

export default function MyDesk() {
  const { user } = useAuth();
  const [deskStatus, setDeskStatus] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDeskData = async () => {
      try {
        const deskId = 1;
        const config = {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        };

        // Fetch both status and usage
        const [statusRes, usageRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/desks/${deskId}/status/`, config),
          axios.get(`http://localhost:8000/api/desks/${deskId}/usage/`, config),
        ]);

        console.log('Desk Status Response:', statusRes.data);
        console.log('Usage Stats Response:', usageRes.data);

        setDeskStatus(statusRes.data);
        setUsageStats(usageRes.data);
      } catch (err) {
        console.error("Error fetching desk data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeskData();

    // Optional: Poll every 5 seconds for live updates
    const interval = setInterval(fetchDeskData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="text-lg">Loading desk information...</div>
      </div>
    );
  }

  const currentHeight = deskStatus?.current_height || 85;
  const minHeight = 60;
  const maxHeight = 120;
  const heightPercentage = ((currentHeight - minHeight) / (maxHeight - minHeight)) * 100;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

      {/* Current Desk Status Header */}
      <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {deskStatus?.name || "Desk #23"}
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${deskStatus?.is_moving ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
            <span className={`text-sm font-medium ${deskStatus?.is_moving ? 'text-yellow-600' : 'text-green-600'}`}>
              {deskStatus?.is_moving ? 'Moving' : 'Connected'}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {currentHeight}cm
            </div>
            <div className="text-sm text-gray-500">Current Height</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">
              {deskStatus?.status || "Idle"}
            </div>
            <div className="text-sm text-gray-500">Status</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">
              {usageStats?.current_standing || "2h 45min"}
            </div>
            <div className="text-sm text-gray-500">Session Time</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left Column - Height Controls */}
        <div className="space-y-4">

          {/* Manual Height Control */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Height Control</h3>
            <div className="space-y-4">

              {/* Height Display with Visual */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Min: {minHeight}cm</span>
                  <span className="text-lg font-bold">{currentHeight}cm</span>
                  <span className="text-sm text-gray-600">Max: {maxHeight}cm</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${heightPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Manual Controls */}
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors">
                  ↑ Up
                </button>
                <button className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors">
                  ↓ Down
                </button>
              </div>

              {/* Emergency Stop */}
              <button className="w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors font-semibold">
                🛑 EMERGENCY STOP
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Quick Presets</h3>
            <div className="grid grid-cols-1 gap-3">
              <button className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                <div>
                  <div className="font-medium text-green-800">Sitting Position</div>
                  <div className="text-sm text-green-600">72cm</div>
                </div>
                <div className="text-green-600">Go →</div>
              </button>

              <button className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                <div>
                  <div className="font-medium text-blue-800">Standing Position</div>
                  <div className="text-sm text-blue-600">110cm</div>
                </div>
                <div className="text-blue-600">Go →</div>
              </button>

              <button className="flex justify-between items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                <div>
                  <div className="font-medium text-purple-800">Meeting Height</div>
                  <div className="text-sm text-purple-600">95cm</div>
                </div>
                <div className="text-purple-600">Go →</div>
              </button>
            </div>
          </div>

        </div>

        {/* Right Column - Settings & Info */}
        <div className="space-y-4">

          {/* Personal Presets Management */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">My Personal Presets</h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm">+ Add New</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">My Sitting</div>
                  <div className="text-sm text-gray-600">74cm - Perfect for typing</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                  <button className="text-green-600 text-sm hover:text-green-700">Use</button>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">My Standing</div>
                  <div className="text-sm text-gray-600">108cm - Comfortable standing</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                  <button className="text-green-600 text-sm hover:text-green-700">Use</button>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Presentation Mode</div>
                  <div className="text-sm text-gray-600">98cm - Screen sharing height</div>
                </div>
                <div className="flex gap-2">
                  <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                  <button className="text-green-600 text-sm hover:text-green-700">Use</button>
                </div>
              </div>
            </div>
          </div>

          {/* Desk Information */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Desk Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Desk ID:</span>
                <span className="font-medium">#{deskStatus?.desk_id || "1"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Name:</span>
                <span className="font-medium">{deskStatus?.name || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-medium">{deskStatus?.status || "Idle"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Speed:</span>
                <span className="font-medium">{deskStatus?.speed || 0} mm/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Activations:</span>
                <span className="font-medium">{usageStats?.total_activations || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sit/Stand Counter:</span>
                <span className="font-medium">{usageStats?.sit_stand_counter || 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-muted/50 rounded-xl p-6 shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Today's Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {usageStats?.sitting_time || "0h 0m"}
                </div>
                <div className="text-sm text-green-700">Sitting Time</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {usageStats?.standing_time || "0h 0m"}
                </div>
                <div className="text-sm text-blue-700">Standing Time</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-purple-50 rounded-lg text-center">
              <div className="text-sm text-purple-700 font-medium">
                Position Changes: {usageStats?.position_changes || 0}
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-center">
              <div className="text-sm text-yellow-700">
                Current session: {usageStats?.current_standing || "N/A"}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}