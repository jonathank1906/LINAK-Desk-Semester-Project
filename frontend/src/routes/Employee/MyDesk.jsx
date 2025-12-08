import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import { Pill, PillIndicator } from '@/components/ui/shadcn-io/pill';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Settings2,
  ArrowUpDown,
  CircleArrowUp,
  CircleArrowDown,
} from "lucide-react"

import {
  IconArrowBigUpFilled,
  IconArrowBigDownFilled,
} from "@tabler/icons-react"

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
  const [reportCategory, setReportCategory] = useState("other");

  // Use ref to store polling interval
  const pollingIntervalRef = useRef(null);

  // If no desk is selected, show message and hide all controls
  if (!selectedDeskId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>
              <span className="px-3 py-1 rounded-full bg-yellow-200 text-yellow-900 font-semibold inline-block text-sm">
                No Desk Selected
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Please select a desk from the Hot Desk or Reservations page to use desk controls
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
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`http://localhost:8000/api/desks/${selectedDeskId}/report/`,
        { message: reportMessage, category: reportCategory }, config);

      toast.success("Report submitted");
      setReportMessage("");
      setReportCategory("other");
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Dialog open={reportModal} onOpenChange={setReportModal}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    onClick={() => setReportModal(true)}
                    size="sm"
                  >
                    Report Problem
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Report a Problem</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <textarea
                      value={reportMessage}
                      onChange={(e) => setReportMessage(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded p-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2"
                      rows="4"
                      placeholder="Describe the problem here..."
                    />
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Category
                      </label>
                      <Select
                        value={reportCategory}
                        onValueChange={setReportCategory}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desk_doesnt_move">Desk doesn't move</SelectItem>
                          <SelectItem value="desk_uncleaned">Desk uncleaned</SelectItem>
                          <SelectItem value="desk_is_broken">Desk is broken</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setReportModal(false);
                        setReportMessage("");
                        setReportCategory("other");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={submitReport}
                    >
                      Submit
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column - Height Controls only */}
        <div className="space-y-4">
          {/* Height Controls */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5" />
                <CardTitle>Height Controls</CardTitle>
              </div>
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
                  {/* Manual Controls */}
                  <div className="flex flex-col items-center gap-1">
                    <Button
                      className="h-12 w-12"
                      variant="outline"
                      size="lg"
                      onClick={moveUp}
                      disabled={isControlling || isMoving || currentHeight >= maxHeight}
                    >
                      <IconArrowBigUpFilled style={{ width: "30px", height: "30px" }} />
                    </Button>
                    {/* Current Height moved between arrows */}
                    <div className="text-4xl font-bold my-2">
                      {currentHeight != null ? (
                        <>
                          {currentHeight}
                          <span className="text-xl align-bottom">cm</span>
                        </>
                      ) : "--"}
                    </div>
                    <Button
                      className="h-12 w-12"
                      variant="outline"
                      size="lg"
                      onClick={moveDown}
                      disabled={isControlling || isMoving || currentHeight <= minHeight}
                    >
                      <IconArrowBigDownFilled style={{ width: "30px", height: "30px" }} />
                    </Button>
                  </div>

                  {/* Emergency Stop */}
                  <Button
                    onClick={emergencyStop}
                    disabled={!isMoving}
                    variant="destructive"
                    className="p-3 hover:bg-red-600 transition-colors font-semibold disabled:cursor-not-allowed"
                  >
                    Stop
                  </Button>

                  {isMoving && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-yellow-800 font-medium">
                        Desk is moving... Tracking height in real-time
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Quick Presets, Desk Info at bottom */}
        <div className="space-y-4 flex flex-col h-full">
          {/* Quick Presets */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                <CardTitle>Quick Presets</CardTitle>
              </div>
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
                    onClick={() => controlDeskHeight(110)}
                    disabled={isControlling || isMoving}
                    className="flex justify-between items-center p-4 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="font-medium">Standing Position</div>
                      <div className="text-sm">110cm</div>
                    </div>
                  </button>

                  <button
                    onClick={() => controlDeskHeight(72)}
                    disabled={isControlling || isMoving}
                    className="flex justify-between items-center p-4 border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div>
                      <div className="font-medium">Sitting Position</div>
                      <div className="text-sm">72cm</div>
                    </div>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}