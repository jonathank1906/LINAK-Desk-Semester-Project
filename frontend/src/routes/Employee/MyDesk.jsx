import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Pill, PillIndicator } from '@/components/ui/shadcn-io/pill';
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MyDesk() {
  const { user } = useAuth();
  const [deskStatus, setDeskStatus] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isControlling, setIsControlling] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchDeskData = async () => {
      try {
        const deskId = 1;
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
  }, [user]);

  const controlDeskHeight = async (targetHeight) => {
    setIsControlling(true);
    try {
      const deskId = 1;
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
      };

      const response = await axios.post(
        `http://localhost:8000/api/desks/${deskId}/control/`,
        { height: targetHeight },
        config
      );

      console.log('Control response:', response.data);

      const statusRes = await axios.get(
        `http://localhost:8000/api/desks/${deskId}/status/`,
        config
      );
      setDeskStatus(statusRes.data);

    } catch (err) {
      console.error("Error controlling desk:", err);
      toast.error("Failed to control desk", {
        position: "top-center"
      });
    } finally {
      setIsControlling(false);
    }
  };

  const moveUp = () => {
    const currentHeight = deskStatus?.current_height || 85;
    const newHeight = Math.min(currentHeight + 5, 120);
    controlDeskHeight(newHeight);
  };

  const moveDown = () => {
    const currentHeight = deskStatus?.current_height || 85;
    const newHeight = Math.max(currentHeight - 5, 60);
    controlDeskHeight(newHeight);
  };

  const emergencyStop = async () => {
    try {
      const deskId = 1;
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
      };

      await axios.post(
        `http://localhost:8000/api/desks/${deskId}/control/`,
        { height: deskStatus?.current_height || 85 },
        config
      );

      alert('Emergency stop activated!');
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
                {deskStatus?.name || "Desk #23"}
              </CardTitle>
              <Pill>
                <PillIndicator pulse variant={deskStatus?.is_moving ? 'warning' : 'success'} />
                {deskStatus?.is_moving ? 'Moving' : 'Connected'}
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
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Left Column - Height Controls */}
        <div className="space-y-4">

          {/* Manual Height Control */}
          <Card>
            <CardHeader>
              <CardTitle>Height Control</CardTitle>
            </CardHeader>
            <CardContent>
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
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${heightPercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Manual Controls */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={moveUp}
                      disabled={isControlling || currentHeight >= maxHeight}
                      className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isControlling ? '...' : '↑ Up'}
                    </button>
                    <button
                      onClick={moveDown}
                      disabled={isControlling || currentHeight <= minHeight}
                      className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isControlling ? '...' : '↓ Down'}
                    </button>
                  </div>

                  {/* Emergency Stop */}
                  <button
                    onClick={emergencyStop}
                    className="w-full bg-red-500 text-white p-3 rounded-lg hover:bg-red-600 transition-colors font-semibold"
                  >
                    🛑 EMERGENCY STOP
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Presets</CardTitle>
            </CardHeader>
            <CardContent>
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
                    disabled={isControlling}
                    className="flex justify-between items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="font-medium text-green-800">Sitting Position</div>
                      <div className="text-sm text-green-600">72cm</div>
                    </div>
                    <div className="text-green-600">{isControlling ? '...' : 'Go →'}</div>
                  </button>

                  <button
                    onClick={() => controlDeskHeight(110)}
                    disabled={isControlling}
                    className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="font-medium text-blue-800">Standing Position</div>
                      <div className="text-sm text-blue-600">110cm</div>
                    </div>
                    <div className="text-blue-600">{isControlling ? '...' : 'Go →'}</div>
                  </button>

                  <button
                    onClick={() => controlDeskHeight(95)}
                    disabled={isControlling}
                    className="flex justify-between items-center p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="font-medium text-purple-800">Meeting Height</div>
                      <div className="text-sm text-purple-600">95cm</div>
                    </div>
                    <div className="text-purple-600">{isControlling ? '...' : 'Go →'}</div>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Settings & Info */}
        <div className="space-y-4">

          {/* Personal Presets Management */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>My Personal Presets</CardTitle>
                <button className="text-blue-600 hover:text-blue-700 text-sm">+ Add New</button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">My Sitting</div>
                      <div className="text-sm text-gray-600">74cm - Perfect for typing</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                      <button
                        onClick={() => controlDeskHeight(74)}
                        disabled={isControlling}
                        className="text-green-600 text-sm hover:text-green-700 disabled:opacity-50"
                      >
                        Use
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">My Standing</div>
                      <div className="text-sm text-gray-600">108cm - Comfortable standing</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                      <button
                        onClick={() => controlDeskHeight(108)}
                        disabled={isControlling}
                        className="text-green-600 text-sm hover:text-green-700 disabled:opacity-50"
                      >
                        Use
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">Presentation Mode</div>
                      <div className="text-sm text-gray-600">98cm - Screen sharing height</div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-blue-600 text-sm hover:text-blue-700">Edit</button>
                      <button
                        onClick={() => controlDeskHeight(98)}
                        disabled={isControlling}
                        className="text-green-600 text-sm hover:text-green-700 disabled:opacity-50"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

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
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-16 w-full rounded-lg mb-4" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </>
              ) : (
                <>
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
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}