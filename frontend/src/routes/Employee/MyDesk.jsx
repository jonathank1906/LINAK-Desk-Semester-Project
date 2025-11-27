import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Pill, PillIndicator } from '@/components/ui/shadcn-io/pill';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
// dont touch
// Accept selectedDeskId as a prop
export default function MyDesk({ selectedDeskId }) {
  const { user } = useAuth();
  const [deskStatus, setDeskStatus] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isControlling, setIsControlling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [reportModal, setReportModal] = useState(false);
const [reportMessage, setReportMessage] = useState("");
  
  // Use ref to store polling interval
  const pollingIntervalRef = useRef(null);

  // If no desk is selected, show message and hide all controls
  if (!selectedDeskId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>No Desk Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please select a desk from the Reservations page to use desk controls and view information.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (!user || !selectedDeskId) return;

    const fetchDeskData = async () => {
      try {
        const deskId = selectedDeskId;
        const config = {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        };

        const [statusRes, usageRes] = await Promise.all([
          axios.get(`http://localhost:8000/api/desks/${deskId}/status/`, config), 
          axios.get(`http://localhost:8000/api/desks/${deskId}/usage/`, config),
        ]);

        setDeskStatus(statusRes.data);
        setUsageStats(usageRes.data);
      } catch (err) {
        console.error("Error fetching desk data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeskData();

    const interval = setInterval(fetchDeskData, 5000);
    return () => clearInterval(interval);
  }, [user, selectedDeskId]);

  // ✅ NEW: Start polling when desk movement begins
  const startMovementPolling = () => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setIsMoving(true);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const deskId = selectedDeskId;
        const config = {
          headers: { Authorization: `Bearer ${user.token}` },
          withCredentials: true,
        };

        const response = await axios.get(
          `http://localhost:8000/api/desks/${deskId}/poll-movement/`,
          config
        );

        const data = response.data;

        // Update UI with current height
        setDeskStatus(prev => ({
          ...prev,
          current_height: data.height,
          is_moving: data.is_moving,
          status: data.status
        }));

        // ✅ Stop polling when desk stops moving
        if (!data.is_moving) {
          console.log('✅ Desk stopped moving');
          stopMovementPolling();
        }
      } catch (error) {
        console.error('Movement polling error:', error);
        stopMovementPolling();
      }
    }, 500); // Poll every 500ms
  };


  const submitReport = async () => {
  try {
    const config = { headers: { Authorization: `Bearer ${user.token}` }};
    await axios.post(`http://localhost:8000/api/desks/${selectedDeskId}/report/`, 
    { message: reportMessage }, config);

    toast.success("Report submitted");
    setReportMessage("");
    setReportModal(false);
  } catch (err) {
    toast.error("Failed", { description: err.response?.data });
  }
};

  // ✅ NEW: Stop polling
  const stopMovementPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsMoving(false);
  };

  // ✅ Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopMovementPolling();
    };
  }, []);

  const controlDeskHeight = async (targetHeight) => {
    setIsControlling(true);
    try {
      const deskId = selectedDeskId;
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
      };

      // ✅ Send height control command
      const response = await axios.post(
        `http://localhost:8000/api/desks/${deskId}/control/`,
        { height: targetHeight },
        config
      );

      console.log('Control response:', response.data);

      // ✅ Start polling to track movement
      if (response.data.status === 'moving') {
        startMovementPolling();
      }

      // Update initial status
      const statusRes = await axios.get(
        `http://localhost:8000/api/desks/${deskId}/status/`,
        config
      );
      setDeskStatus(statusRes.data);

      toast.success(`Moving desk to ${targetHeight}cm`, {
        position: "top-center"
      });

    } catch (err) {
      console.error("Error controlling desk:", err);
      toast.error("Failed to control desk", {
        position: "top-center"
      });
      stopMovementPolling();
    } finally {
      setIsControlling(false);
    }
  };

  const moveUp = () => {
    if (currentHeight == null) return;
    const newHeight = Math.min(currentHeight + 5, maxHeight);
    controlDeskHeight(newHeight);
  };

  const moveDown = () => {
    if (currentHeight == null) return;
    const newHeight = Math.max(currentHeight - 5, minHeight);
    controlDeskHeight(newHeight);
  };

  const emergencyStop = async () => {
    try {
      const deskId = selectedDeskId;
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
      };

      // ✅ Stop polling immediately
      stopMovementPolling();

      await axios.post(
        `http://localhost:8000/api/desks/${deskId}/control/`,
        { height: deskStatus?.current_height || 85 },
        config
      );

      toast.error('Emergency stop activated!', {
        position: "top-center"
      });
    } catch (err) {
      console.error("Error stopping desk:", err);
    }
  };

  const currentHeight = deskStatus?.current_height || 85;
  const minHeight = 60;
  const maxHeight = 120;
  const heightPercentage = ((currentHeight - minHeight) / (maxHeight - minHeight)) * 100;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">

      {/* Current Desk Status Header */}
      <Card>
        <CardHeader>
          {loading ? (
            <>
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">
                {deskStatus?.name || `Desk #${selectedDeskId}`}
              </CardTitle>
              <Pill>
                <PillIndicator 
                  pulse 
                  variant={isMoving ? 'warning' : 'success'} 
                />
                {isMoving ? 'Moving' : 'Connected'}
              </Pill>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <Skeleton className="h-9 w-20 mx-auto" />
                <Skeleton className="h-4 w-28 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-7 w-16 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-7 w-24 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {currentHeight != null ? `${currentHeight}cm` : "--"}
                </div>
                <div className="text-sm text-gray-500">Current Height</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">
                  {isMoving ? "Moving" : (deskStatus?.status || "Idle")}
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
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left Column - Height Controls Drawer */}
        <div className="space-y-4">
          <Drawer>
            <DrawerTrigger asChild>
              <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isMoving}>
                {isMoving ? 'Desk Moving...' : 'Manual Height Controls'}
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Manual Height Control</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-6 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : (
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
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isMoving ? 'bg-yellow-500 animate-pulse' : 'bg-blue-500'
                          }`}
                          style={{ width: `${heightPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Manual Controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={moveUp}
                        disabled={isControlling || isMoving || currentHeight >= maxHeight}
                        className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isControlling || isMoving ? '...' : '↑ Up'}
                      </button>
                      <button
                        onClick={moveDown}
                        disabled={isControlling || isMoving || currentHeight <= minHeight}
                        className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isControlling || isMoving ? '...' : '↓ Down'}
                      </button>
                    </div>

                    {/* Emergency Stop */}
                    <button
                      onClick={emergencyStop}
                      disabled={!isMoving}
                      className="w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      🛑 EMERGENCY STOP
                    </button>

                    {isMoving && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                        <p className="text-sm text-yellow-800 font-medium">
                          ⚠️ Desk is moving... Tracking height in real-time
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>

          <Drawer>
            <DrawerTrigger asChild>
              <button 
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isMoving}
              >
                {isMoving ? 'Desk Moving...' : 'Quick Presets'}
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Quick Presets</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 space-y-4">
                {loading ? (
                  <div className="grid grid-cols-1 gap-3">
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-20 w-full rounded-lg" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => controlDeskHeight(72)}
                      disabled={isControlling || isMoving}
                      className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <div className="font-medium text-green-800">Sitting Position</div>
                        <div className="text-sm text-green-600">72cm</div>
                      </div>
                      <div className="text-green-600">{isControlling || isMoving ? '...' : 'Go →'}</div>
                    </button>

                    <button
                      onClick={() => controlDeskHeight(110)}
                      disabled={isControlling || isMoving}
                      className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <div className="font-medium text-blue-800">Standing Position</div>
                        <div className="text-sm text-blue-600">110cm</div>
                      </div>
                      <div className="text-blue-600">{isControlling || isMoving ? '...' : 'Go →'}</div>
                    </button>

                    <button
                      onClick={() => controlDeskHeight(95)}
                      disabled={isControlling || isMoving}
                      className="flex justify-between items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <div className="font-medium text-purple-800">Meeting Height</div>
                        <div className="text-sm text-purple-600">95cm</div>
                      </div>
                      <div className="text-purple-600">{isControlling || isMoving ? '...' : 'Go →'}</div>
                    </button>
                  </div>
                )}
              </div>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Right Column - Settings & Info */}
        <div className="space-y-4">
          {/* Desk Information */}
          <Card>
            <CardHeader>
              <CardTitle>Desk Information</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desk ID:</span>
                    <span className="font-medium">#{deskStatus?.desk_id || selectedDeskId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{deskStatus?.name || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${isMoving ? 'text-yellow-600' : ''}`}>
                      {isMoving ? "Moving" : (deskStatus?.status || "Idle")}
                    </span>
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
              )}
            </CardContent>
          </Card>
            <button 
          onClick={() => setReportModal(true)}
          className="w-full bg-red-600 text-white py-4 rounded-lg hover:bg-red-700"
        >
          Report Issue ⚠️
        </button>
        {reportModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white p-6 rounded-lg w-[350px] space-y-3">
              <h3 className="text-lg font-semibold">Report a Problem</h3>

              <textarea 
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                className="w-full border rounded p-2"
                rows="4"
                placeholder="Describe the problem here..."
              />

              <div className="flex justify-end gap-2">
                <button onClick={() => setReportModal(false)} className="px-3 py-1 bg-gray-200 rounded">
                  Cancel
                </button>
                <button onClick={submitReport} className="px-3 py-1 bg-red-600 text-white rounded">
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
