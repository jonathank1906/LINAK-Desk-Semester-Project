import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/useAuth";
import { usePostureReminder } from "@/contexts/usePostureReminder";
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
  Armchair,
  PersonStanding
} from "lucide-react"

import {
  IconArrowBigUpFilled,
  IconArrowBigDownFilled,
} from "@tabler/icons-react"

// Desk height constants (in cm)
export const STANDING_HEIGHT = 110;
export const SITTING_HEIGHT = 72;

export default function MyDesk({ selectedDeskId, onNavigate }) {
  const { user } = useAuth();
  const { pendingHeightChange } = usePostureReminder();
  const [deskStatus, setDeskStatus] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [isControlling, setIsControlling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  
  const [reportModal, setReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportCategory, setReportCategory] = useState("other");

  const isMounted = useRef(true);
  const pollingIntervalRef = useRef(null);
  const hasRedirected = useRef(false);
  const lastPendingHeightRef = useRef(null);

  useEffect(() => {
    isMounted.current = true;
    return () => { 
        isMounted.current = false; 
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // --- HELPER: SAFE REDIRECT ---
  const handleSessionExpiry = () => {
    setUsageStats({ active_session: false });
    
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    toast("Session Ended", {
      description: "Your desk reservation time has expired.",
      duration: 5000,
    });
  };

  // --- HELPER: TIME FORMATTING ---
  // Format seconds as "Xh Ym" or "Xm" (no seconds)
  const formatHM = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    }
    return `${m}m`;
  };

  // Format elapsed or remaining time (dateString) as h m
  const formatTime = (dateString, isDiff = false) => {
    if (!dateString) return "0m";
    try {
      const target = new Date(dateString);
      if (isNaN(target.getTime())) return "0m";
      const now = new Date();
      const diffInSeconds = isDiff
        ? Math.floor((target - now) / 1000)
        : Math.floor((now - target) / 1000);
      const seconds = Math.max(0, diffInSeconds);
      return formatHM(seconds);
    } catch (e) { return "0m"; }
  };

  const formatMinutes = (seconds) => {
    if (!seconds || isNaN(seconds)) return 0;
    return Math.floor(seconds / 60);
  };

  // --- 1. INITIAL FETCH & DATA SYNC ---
  useEffect(() => {
    // Reset state when desk ID changes to ensure fresh load
    setLoading(true);
    setDeskStatus(null);
    setUsageStats(null);
    hasRedirected.current = false;

    if (!user || !selectedDeskId) {
        setLoading(false);
        return;
    }

    const fetchDeskData = async () => {
      try {
        const deskId = selectedDeskId;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };

        // We fetch status and usage. 
        // Note: Usage failing shouldn't block the desk controls if status works.
        const statusReq = axios.get(`http://localhost:8000/api/desks/${deskId}/status/`, config);
        const usageReq = axios.get(`http://localhost:8000/api/desks/${deskId}/usage/`, config);

        // Await status primarily
        const statusRes = await statusReq;

        if (isMounted.current) {
            setDeskStatus(statusRes.data);
        }

        // Handle usage separately to prevent usage 500s from blocking UI
        try {
            const usageRes = await usageReq;
            
            // CHECK: Only block if API EXPLICITLY says false.
            if (usageRes.data.active_session === false) {
                if (isMounted.current) handleSessionExpiry();
                return;
            }
            if (isMounted.current) {
                setUsageStats(usageRes.data);
            }
        } catch (usageErr) {
            console.warn("Usage stats failed to load, but desk is connected:", usageErr);
        }

      } catch (err) {
        console.error("Error fetching desk status:", err);
        // If 404/403 on the STATUS endpoint, the desk is genuinely inaccessible
        if (err.response && (err.response.status === 404 || err.response.status === 403)) {
            if (isMounted.current) handleSessionExpiry();
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchDeskData();
    const interval = setInterval(fetchDeskData, 5000);
    return () => clearInterval(interval);
  }, [user, selectedDeskId]);


  // --- 2. POLLING FOR MOVEMENT ---
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
        
        if (isMounted.current) {
          setDeskStatus(prev => {
            if (!prev) return null;
            return {
              ...prev,
              current_height: data.height,
              is_moving: data.is_moving,
              status: data.status
            };
          });

          if (!data.is_moving) stopMovementPolling();
        }
      } catch (error) {
        stopMovementPolling();
      }
    }, 500);
  };

  const stopMovementPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (isMounted.current) setIsMoving(false);
  };

  // --- ACTIONS ---
  const controlDeskHeight = useCallback(async (targetHeight) => {
    setIsControlling(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const response = await axios.post(
        `http://localhost:8000/api/desks/${selectedDeskId}/control/`,
        { height: targetHeight },
        config
      );

      if (response.data.status === 'moving') startMovementPolling();
      
      if (isMounted.current) {
        setDeskStatus(prev => ({ ...prev, is_moving: true }));
      }
      toast.success(`Moving desk to ${targetHeight}cm`);

    } catch (err) {
      toast.error("Failed to control desk");
      stopMovementPolling();
    } finally {
      if (isMounted.current) setIsControlling(false);
    }
  }, [user, selectedDeskId]);

  // Handle pending height change from posture reminder
  useEffect(() => {
    if (pendingHeightChange && 
        pendingHeightChange.timestamp && 
        pendingHeightChange.timestamp !== lastPendingHeightRef.current && 
        !loading && 
        deskStatus && 
        selectedDeskId) {
      lastPendingHeightRef.current = pendingHeightChange.timestamp;
      if (pendingHeightChange.height) {
        controlDeskHeight(pendingHeightChange.height);
      }
    }
  }, [pendingHeightChange, loading, deskStatus, selectedDeskId, controlDeskHeight]);

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
        { height: deskStatus?.current_height || 85 }, 
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

  // --- VIEW LOGIC GATES ---

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 h-full">
         <Card className="w-full max-w-4xl p-8 flex flex-col items-center justify-center gap-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-64 w-full" />
            <p className="text-muted-foreground animate-pulse">Connecting to desk...</p>
         </Card>
      </div>
    );
  }

  // 2. Error / Session Ended State
  // We only show this if:
  // a) No desk is selected (shouldn't happen if parent passes ID)
  // b) We loaded successfully, but have NO desk status (API 404/403)
  // c) The usage stats explicitly said "active_session: false"
  const sessionExplicitlyEnded = usageStats && usageStats.active_session === false;
  
  if (!selectedDeskId || !deskStatus || sessionExplicitlyEnded) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 h-full">
        <Card className="max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
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
            {onNavigate && (
                <Button onClick={() => onNavigate("hotdesk")}>
                    Go to Hot Desk
                </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- MAIN RENDER ---
  const currentHeight = deskStatus?.current_height || SITTING_HEIGHT;
  const minHeight = 60;
  const maxHeight = 120;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 h-[calc(100vh-100px)]"> 
      
      {/* HEADER */}
      <Card className="shrink-0">
        <CardHeader className="py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl">
                {deskStatus?.name || `Desk #${selectedDeskId}`}
              </CardTitle>
              <Pill>
                <PillIndicator pulse variant={isMoving ? 'warning' : 'success'} />
                {isMoving ? 'Moving' : 'Connected'}
              </Pill>
            </div>

            <div className="flex items-center gap-4 self-end md:self-auto">
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

                <div className="hidden lg:flex items-center gap-3 rounded-full bg-gray-100 dark:bg-gray-800 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <PersonStanding className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                      {(() => {
                        const mins = formatMinutes(usageStats?.standing_time);
                        if (mins >= 60) {
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          return `${h}h${m > 0 ? ` ${m}m` : ''}`;
                        }
                        return `${mins}m`;
                      })()}
                    </span>
                  </div>
                  <span className="text-gray-300 dark:text-gray-700">|</span>
                  <div className="flex items-center gap-2">
                    <Armchair className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                      {(() => {
                        const mins = formatMinutes(usageStats?.sitting_time);
                        if (mins >= 60) {
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          return `${h}h${m > 0 ? ` ${m}m` : ''}`;
                        }
                        return `${mins}m`;
                      })()}
                    </span>
                  </div>
                </div>

                <Dialog open={reportModal} onOpenChange={setReportModal}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
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
          </div>
        </CardHeader>
      </Card>

      {/* CONTROLS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 grow">
        
        {/* LEFT PANEL */}
        <Card className="h-full flex flex-col overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ArrowUpDown className="w-5 h-5" />
              <CardTitle className="text-lg">Height Controls</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0"> 
              <div className="flex flex-col h-full">
                <button
                  className="flex-1 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.99]"
                  onClick={moveUp}
                  disabled={isControlling || isMoving || currentHeight >= maxHeight}
                >
                  <IconArrowBigUpFilled className="w-24 h-24 text-gray-700 dark:text-gray-300 opacity-80" />
                </button>

                <div className="flex-none py-8 flex flex-col items-center justify-center bg-white dark:bg-black z-10 border-y relative">
                  <div className="text-6xl font-extrabold tracking-tight">
                    {currentHeight}
                    <span className="text-2xl font-medium text-muted-foreground ml-2">cm</span>
                  </div>
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

                <button
                  className="flex-1 w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.99]"
                  onClick={moveDown}
                  disabled={isControlling || isMoving || currentHeight <= minHeight}
                >
                  <IconArrowBigDownFilled className="w-24 h-24 text-gray-700 dark:text-gray-300 opacity-80" />
                </button>
              </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Settings2 className="w-5 h-5" />
              <CardTitle className="text-lg">Quick Presets</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
              <button
                  onClick={() => controlDeskHeight(STANDING_HEIGHT)}
                  disabled={isControlling || isMoving}
                  className="flex-1 w-full relative group overflow-hidden rounded-xl border-2 border-transparent hover:border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-all text-left p-8"
                >
                  <div className="flex flex-col h-full justify-between relative z-10">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold text-lg uppercase tracking-wide">Standing Position</span>
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">{STANDING_HEIGHT}<span className="text-2xl text-muted-foreground ml-1">cm</span></span>
                  </div>
                  <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <IconArrowBigUpFilled size={120} />
                  </div>
                </button>

                <button
                  onClick={() => controlDeskHeight(SITTING_HEIGHT)}
                  disabled={isControlling || isMoving}
                  className="flex-1 w-full relative group overflow-hidden rounded-xl border-2 border-transparent hover:border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-all text-left p-8"
                >
                  <div className="flex flex-col h-full justify-between relative z-10">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg uppercase tracking-wide">Sitting Position</span>
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">{SITTING_HEIGHT}<span className="text-2xl text-muted-foreground ml-1">cm</span></span>
                  </div>
                    <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <IconArrowBigDownFilled size={120} />
                  </div>
                </button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}