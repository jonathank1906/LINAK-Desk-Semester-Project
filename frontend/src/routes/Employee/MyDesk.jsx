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
} from "lucide-react"

import {
  IconArrowBigUpFilled,
  IconArrowBigDownFilled,
} from "@tabler/icons-react"

// Helper function to format seconds into HH:MM:SS
const formatTime = (dateString, isDiff = false) => {
  if (!dateString) return "00:00:00";
  
  const target = new Date(dateString);
  const now = new Date();
  // If isDiff is true (Remaining), we calculate target - now. 
  // If false (Elapsed), we calculate now - target.
  const diffInSeconds = isDiff 
    ? Math.floor((target - now) / 1000) 
    : Math.floor((now - target) / 1000);

  const seconds = Math.max(0, diffInSeconds);
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Helper for simple minutes display
const formatMinutes = (seconds) => Math.floor((seconds || 0) / 60);

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

  const pollingIntervalRef = useRef(null);

  // Check if session is active
  function isSessionActive() {
    if (usageStats && usageStats.reservation_end_time) {
      const now = new Date();
      const end = new Date(usageStats.reservation_end_time);
      if (now > end) return false;
    }
    if (usageStats && usageStats.active_session === false) return false;
    return true;
  }

  // --- No Desk Selected / Session Ended View ---
  if (!selectedDeskId || (!loading && !isSessionActive())) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>
              <span className="px-3 py-1 rounded-full bg-yellow-200 text-yellow-900 font-semibold inline-block text-sm">
                {selectedDeskId ? "Session Ended" : "No Desk Selected"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {selectedDeskId
                ? "Your reservation or session has ended. Please select a desk to continue."
                : "Please select a desk from the Hot Desk or Reservations page."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Data Fetching & Polling Logic ---
  useEffect(() => {
    if (!user || !selectedDeskId) return;

    const fetchDeskData = async () => {
      try {
        const deskId = selectedDeskId;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };

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

  const startMovementPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setIsMoving(true);

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const response = await axios.get(
          `http://localhost:8000/api/desks/${selectedDeskId}/poll-movement/`,
          config
        );
        const data = response.data;
        
        setDeskStatus(prev => ({
          ...prev,
          current_height: data.height,
          is_moving: data.is_moving,
          status: data.status
        }));

        if (!data.is_moving) stopMovementPolling();
      } catch (error) {
        console.error('Polling error:', error);
        stopMovementPolling();
      }
    }, 500);
  };

  const stopMovementPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsMoving(false);
  };

  const controlDeskHeight = async (targetHeight) => {
    setIsControlling(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.post(
        `http://localhost:8000/api/desks/${selectedDeskId}/control/`,
        { height: targetHeight },
        config
      );

      if (response.data.status === 'moving') startMovementPolling();
      
      // Immediate update to show UI feedback
      setDeskStatus(prev => ({ ...prev, is_moving: true }));
      toast.success(`Moving desk to ${targetHeight}cm`);

    } catch (err) {
      toast.error("Failed to control desk");
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
      stopMovementPolling();
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(
        `http://localhost:8000/api/desks/${selectedDeskId}/control/`,
        { height: deskStatus?.current_height || 85 }, // Send current height to force stop
        config
      );
      toast.error('Emergency stop activated!');
    } catch (err) {
      console.error("Error stopping:", err);
    }
  };

  const submitReport = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`http://localhost:8000/api/desks/${selectedDeskId}/report/`,
        { message: reportMessage, category: reportCategory }, config);
      toast.success("Report submitted");
      setReportModal(false);
      setReportMessage("");
    } catch (err) {
      toast.error("Failed to submit report");
    }
  };

  // Derived Values
  const currentHeight = deskStatus?.current_height || 72; // Default to sit height if null
  const minHeight = 60;
  const maxHeight = 120;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 h-[calc(100vh-100px)]"> 
      {/* Added fixed height calculation to ensure full screen usage if needed, or remove h-full class */}

      {/* --- HEADER --- */}
      <Card className="shrink-0">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Title & Connection Status */}
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">
                {deskStatus?.name || `Desk #${selectedDeskId}`}
              </CardTitle>
              {!loading && (
                <Pill>
                  <PillIndicator pulse variant={isMoving ? 'warning' : 'success'} />
                  {isMoving ? 'Moving' : 'Connected'}
                </Pill>
              )}
            </div>

            {/* Stats Pills & Actions */}
            {!loading && (
              <div className="flex items-center gap-4 self-end md:self-auto">
                
                {/* Timer Group */}
                <div className="flex items-center gap-3 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-gray-500 font-sans uppercase tracking-wide">Elapsed:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                            {formatTime(usageStats?.started_at)}
                        </span>
                    </div>
                    {usageStats?.reservation_end_time && (
                        <>
                            <span className="text-gray-300">|</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-medium text-gray-500 font-sans uppercase tracking-wide">Left:</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                                    {formatTime(usageStats.reservation_end_time, true)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Health Stats Group */}
                <div className="hidden lg:flex items-center gap-3 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-gray-500 font-sans">STANDING:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                            {formatMinutes(usageStats?.standing_time)}m
                        </span>
                    </div>
                    <span className="text-gray-300">|</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-gray-500 font-sans">SITTING:</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                            {formatMinutes(usageStats?.sitting_time)}m
                        </span>
                    </div>
                </div>

                {/* Report Button */}
                <Dialog open={reportModal} onOpenChange={setReportModal}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      Report Problem
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Report a Problem</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <textarea
                        value={reportMessage}
                        onChange={(e) => setReportMessage(e.target.value)}
                        className="w-full border rounded p-3 min-h-[100px]"
                        placeholder="Describe the issue..."
                      />
                      <Select value={reportCategory} onValueChange={setReportCategory}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desk_doesnt_move">Desk doesn't move</SelectItem>
                          <SelectItem value="desk_uncleaned">Desk uncleaned</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setReportModal(false)}>Cancel</Button>
                      <Button onClick={submitReport}>Submit</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* --- MAIN CONTROLS GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 grow">
        
        {/* LEFT PANEL: Height Controls */}
        <Card className="h-full flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowUpDown className="w-5 h-5" />
              <CardTitle className="text-lg">Height Controls</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0"> {/* p-0 allows buttons to touch edges */}
            {loading ? (
               <div className="p-6 space-y-4"><Skeleton className="h-full w-full" /></div>
            ) : (
              <div className="flex flex-col h-full">
                
                {/* UP BUTTON (Touch Zone) */}
                <button
                  className="flex-1 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.99]"
                  onClick={moveUp}
                  disabled={isControlling || isMoving || currentHeight >= maxHeight}
                >
                  <IconArrowBigUpFilled className="w-24 h-24 text-gray-700 dark:text-gray-300 opacity-80" />
                </button>

                {/* CENTER DISPLAY & STOP */}
                <div className="flex-none py-8 flex flex-col items-center justify-center bg-white dark:bg-black z-10 border-y relative">
                  <div className="text-6xl font-extrabold tracking-tight">
                    {currentHeight}
                    <span className="text-2xl font-medium text-muted-foreground ml-2">cm</span>
                  </div>
                  
                  {/* Stop Button Centered */}
                  <Button
                    onClick={emergencyStop}
                    disabled={!isMoving}
                    variant="destructive"
                    size="lg"
                    className="mt-4 px-12 rounded-full font-bold uppercase tracking-widest shadow-lg transition-all"
                  >
                    Stop
                  </Button>
                </div>

                {/* DOWN BUTTON (Touch Zone) */}
                <button
                  className="flex-1 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.99]"
                  onClick={moveDown}
                  disabled={isControlling || isMoving || currentHeight <= minHeight}
                >
                  <IconArrowBigDownFilled className="w-24 h-24 text-gray-700 dark:text-gray-300 opacity-80" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT PANEL: Presets */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Settings2 className="w-5 h-5" />
              <CardTitle className="text-lg">Quick Presets</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <>
                {/* Standing Preset Tile */}
                <button
                  onClick={() => controlDeskHeight(110)}
                  disabled={isControlling || isMoving}
                  className="flex-1 w-full relative group overflow-hidden rounded-xl border-2 border-transparent hover:border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-all text-left p-8"
                >
                  <div className="flex flex-col h-full justify-between relative z-10">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold text-lg uppercase tracking-wide">Standing Position</span>
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">110<span className="text-2xl text-muted-foreground ml-1">cm</span></span>
                  </div>
                  <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <IconArrowBigUpFilled size={120} />
                  </div>
                </button>

                {/* Sitting Preset Tile */}
                <button
                  onClick={() => controlDeskHeight(72)}
                  disabled={isControlling || isMoving}
                  className="flex-1 w-full relative group overflow-hidden rounded-xl border-2 border-transparent hover:border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-all text-left p-8"
                >
                  <div className="flex flex-col h-full justify-between relative z-10">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg uppercase tracking-wide">Sitting Position</span>
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">72<span className="text-2xl text-muted-foreground ml-1">cm</span></span>
                  </div>
                   <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <IconArrowBigDownFilled size={120} />
                  </div>
                </button>
              </>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}