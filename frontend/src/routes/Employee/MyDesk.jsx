import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/useAuth";
import { usePostureReminder } from "@/contexts/usePostureReminder";
import axios from "axios";
import { toast } from "sonner";
import { Pill, PillIndicator } from '@/components/ui/shadcn-io/pill';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  fetchPreferences, 
  createPreference, 
  updatePreference, 
  deletePreference 
} from "@/endpoints/preferences";
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
  ArrowUpDown
} from "lucide-react"

import StandingIcon from "@/assets/Standing.svg";
import SittingIcon from "@/assets/Sitting.svg";

import {
  IconArrowBigUpFilled,
  IconArrowBigDownFilled,
} from "@tabler/icons-react"

// Desk height constants (in cm)
export const STANDING_HEIGHT = 110;
export const SITTING_HEIGHT = 72;
const DEFAULT_STANDING_NAME = "Standing Position";
const DEFAULT_SITTING_NAME = "Sitting Position";

export default function MyDesk({ selectedDeskId, onNavigate, initialDeskStatus, initialUsageStats }) {
  const { user } = useAuth();
  const { pendingHeightChange } = usePostureReminder();
  
  // Initialize state with props if available to prevent flash/race conditions
  const [deskStatus, setDeskStatus] = useState(initialDeskStatus || null);
  const [usageStats, setUsageStats] = useState(initialUsageStats || null);
  
  // Only load if we don't have initial data
  const [loading, setLoading] = useState(!initialDeskStatus);
  
  const [isControlling, setIsControlling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  
  const [reportModal, setReportModal] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportCategory, setReportCategory] = useState("other");

  const isMounted = useRef(true);
  const pollingIntervalRef = useRef(null);
  const hasRedirected = useRef(false);
  const lastPendingHeightRef = useRef(null);
  
  // Track mount time to ignore immediate "session ended" errors due to race conditions
  const mountTimeRef = useRef(Date.now());

  // --- USER PREFERENCE STATE ---
  const [pref, setPref] = useState(null);
  const [loadingPref, setLoadingPref] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formState, setFormState] = useState({
    custom_height_1: "",
    custom_height_1_name: "",
    custom_height_2: "",
    custom_height_2_name: "",
    custom_height_3: "",
    custom_height_3_name: "",
  });

  const standing = pref?.custom_height_1 ?? pref?.standing_height ?? STANDING_HEIGHT;
  const standingLabel = pref?.custom_height_1_name || DEFAULT_STANDING_NAME;
  const sitting = pref?.custom_height_2 ?? pref?.sitting_height ?? SITTING_HEIGHT;
  const sittingLabel = pref?.custom_height_2_name || DEFAULT_SITTING_NAME;
  const custom = pref?.custom_height_3;  
  const customLabel = pref?.custom_height_3_name || "Custom Preset";

  const minHeight = 60;
  const maxHeight = 120;
  const currentHeight = deskStatus?.current_height || SITTING_HEIGHT;

  useEffect(() => {
    setLoadingPref(true);
    fetchPreferences()
      .then((data) => setPref(data[0] || null))
      .finally(() => setLoadingPref(false));
  }, []);

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

  // --- PRESET HANDLERS ---
  const openEditPresets = () => {
    setFormState({
      custom_height_1: pref?.custom_height_1 ?? standing,
      custom_height_1_name: pref?.custom_height_1_name || standingLabel,
      custom_height_2: pref?.custom_height_2 ?? sitting,
      custom_height_2_name: pref?.custom_height_2_name || sittingLabel,
      custom_height_3: pref?.custom_height_3 ?? "",
      custom_height_3_name: pref?.custom_height_3_name || "",
    });
    setEditOpen(true);
  };

  // Check if form currently matches system defaults exactly
  const isAtDefaults = 
    Number(formState.custom_height_1) === STANDING_HEIGHT &&
    formState.custom_height_1_name === DEFAULT_STANDING_NAME &&
    Number(formState.custom_height_2) === SITTING_HEIGHT &&
    formState.custom_height_2_name === DEFAULT_SITTING_NAME &&
    (formState.custom_height_3 === "" || formState.custom_height_3 === null || formState.custom_height_3 === 0) &&
    (formState.custom_height_3_name === "" || formState.custom_height_3_name === null);

  const handleResetPresets = () => {
    // Only update the form state. Do NOT close modal. Do NOT save to API yet.
    setFormState({
      custom_height_1: STANDING_HEIGHT,
      custom_height_1_name: DEFAULT_STANDING_NAME,
      custom_height_2: SITTING_HEIGHT,
      custom_height_2_name: DEFAULT_SITTING_NAME,
      custom_height_3: "",
      custom_height_3_name: "",
    });
    toast.info("Values reset to default. Click Save to apply.");
  };

  const handleSave = async (form) => {
    if (pref?.id) {
      const updated = await updatePreference(pref.id, form);
      setPref(updated);
    } else {
      const created = await createPreference(form);
      setPref(created);
    }
  };

  const handleSubmitPresets = async () => {
    const heights = [
      { value: formState.custom_height_1, name: "Preset 1" },
      { value: formState.custom_height_2, name: "Preset 2" },
      { value: formState.custom_height_3, name: "Preset 3" }
    ];
  
    for (const height of heights) {
      if (height.value && height.value !== "") {
        const numValue = Number(height.value);
        if (numValue < minHeight || numValue > maxHeight) {
          toast.error(`${height.name} must be between ${minHeight} and ${maxHeight} cm`);
          return;
        }
      }
    }
    const payload = {
      custom_height_1: Number(formState.custom_height_1) || null,
      custom_height_1_name: formState.custom_height_1_name || null,
      custom_height_2: Number(formState.custom_height_2) || null,
      custom_height_2_name: formState.custom_height_2_name || null,
      custom_height_3: Number(formState.custom_height_3) || null, 
      custom_height_3_name: formState.custom_height_3_name || null,
    };

    try {
      await handleSave(payload);
      toast.success("Presets saved");
      setEditOpen(false);
    } catch (e) {
      toast.error("Failed to save presets");
    }
  };

  // --- HELPER: TIME FORMATTING ---
  const formatHM = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) {
      return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    }
    return `${m}m`;
  };

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
    // Only set loading if we didn't receive initial data props
    if (!initialDeskStatus) {
      setLoading(true);
    }
    
    hasRedirected.current = false;

    if (!user || !selectedDeskId) {
        setLoading(false);
        return;
    }

    const fetchDeskData = async () => {
      try {
        const deskId = selectedDeskId;
        const config = { headers: { Authorization: `Bearer ${user.token}` } };

        const statusReq = axios.get(`http://localhost:8000/api/desks/${deskId}/status/`, config);
        const usageReq = axios.get(`http://localhost:8000/api/desks/${deskId}/usage/`, config);

        const statusRes = await statusReq;

        if (isMounted.current) {
            setDeskStatus(statusRes.data);
        }

        try {
            const usageRes = await usageReq;
            
            if (usageRes.data.active_session === false) {
                // RACE CONDITION FIX:
                // If the user just navigated here (within last 3 seconds), ignore the "active_session: false"
                // signal from the backend, as the DB might still be committing the transaction from the Dashboard.
                // We trust the props passed from Dashboard initially.
                if (Date.now() - mountTimeRef.current < 3000) {
                   console.log("Ignoring premature session end signal due to race condition");
                   return;
                }

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
        if (err.response && (err.response.status === 404 || err.response.status === 403)) {
            // Also apply race condition guard here
            if (Date.now() - mountTimeRef.current < 3000) return;
            if (isMounted.current) handleSessionExpiry();
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    fetchDeskData();
    const interval = setInterval(fetchDeskData, 5000);
    return () => clearInterval(interval);
  }, [user, selectedDeskId]); // Removed initialDeskStatus from dependency array to avoid loops

  // --- 2. POLLING FOR MOVEMENT ---
  const startMovementPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setIsMoving(true);
    let stoppedCount = 0; // Track consecutive stopped states

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

          // CRITICAL FIX: Continue polling for 2 more cycles after movement stops
          if (!data.is_moving) {
            stoppedCount++;
            console.log(`Movement stopped, count: ${stoppedCount}/2`);
            if (stoppedCount >= 2) {
              console.log('Stopping polling after confirmation');
              stopMovementPolling();
            }
          } else {
            stoppedCount = 0; // Reset if movement resumes
          }
        }
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

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 h-full">
         <Card className="w-full max-w-4xl p-8 flex flex-col items-center justify-center gap-4">
            <Skeleton className="h-96 w-full" />
            <p className="text-muted-foreground animate-pulse">Connecting to desk...</p>
         </Card>
      </div>
    );
  }

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
                    <img src={StandingIcon} alt="Standing" className="w-5 h-5" />
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
                    <img src={SittingIcon} alt="Sitting" className="w-5 h-5" />
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
                    <Button variant="destructive" size="sm">
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
                      <Button variant="outline" onClick={() => setReportModal(false)}>Cancel</Button>
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

        {/* RIGHT PANEL - PRESETS */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" />
                <CardTitle className="text-lg">Quick Presets</CardTitle>
              </div>

              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingPref}
                    onClick={openEditPresets}
                  >
                    Edit Presets
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Desk Presets</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Preset 1 Name</label>
                        <input
                          className="w-full border rounded px-3 py-2 bg-background"
                          placeholder="Standing Position"
                          value={formState.custom_height_1_name}
                          onChange={(e) =>
                            setFormState((f) => ({
                              ...f,
                              custom_height_1_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Height (cm)</label>
                        <input
                          type="number"
                          min={minHeight}
                          max={maxHeight}
                          className="w-full border rounded px-3 py-2 bg-background"
                          value={formState.custom_height_1}
                          onChange={(e) =>
                            setFormState((f) => ({
                              ...f,
                              custom_height_1: e.target.value,
                            }))
                          }
                        />
                      </div>

                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Preset 2 Name</label>
                        <input
                          className="w-full border rounded px-3 py-2 bg-background"
                          placeholder="Sitting Position"
                          value={formState.custom_height_2_name}
                          onChange={(e) =>
                            setFormState((f) => ({
                              ...f,
                              custom_height_2_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Height (cm)</label>
                        <input
                          type="number"
                          min={minHeight}
                          max={maxHeight}
                          className="w-full border rounded px-3 py-2 bg-background"
                          value={formState.custom_height_2}
                          onChange={(e) =>
                            setFormState((f) => ({
                              ...f,
                              custom_height_2: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Preset 3 Name (Optional)</label>
                        <input
                          className="w-full border rounded px-3 py-2 bg-background"
                          placeholder="My Custom Height"
                          value={formState.custom_height_3_name}
                          onChange={(e) =>
                            setFormState((f) => ({
                              ...f,
                              custom_height_3_name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Height (cm)</label>
                        <input
                          type="number"
                          min={minHeight}
                          max={maxHeight}
                          className="w-full border rounded px-3 py-2 bg-background"
                          placeholder="Optional"
                          value={formState.custom_height_3}
                          onChange={(e) =>
                            setFormState((f) => ({
                              ...f,
                              custom_height_3: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetPresets}
                      disabled={isAtDefaults}
                    >
                      Reset to Defaults
                    </Button>
                    <div className="space-x-2">
                      <Button variant="outline" onClick={() => setEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitPresets}>
                        Save
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <button
              onClick={() => controlDeskHeight(standing)}
              title={standingLabel}
              disabled={isControlling || isMoving}
              className="flex-1 w-full relative group overflow-hidden rounded-xl border-2 border-transparent hover:border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-all text-left p-8"
            >
              <div className="flex flex-col h-full justify-between relative z-10">
                <span className="text-orange-600 dark:text-orange-400 font-semibold text-lg uppercase tracking-wide">
                  {standingLabel}
                </span>
                <span className="text-5xl font-bold text-gray-900 dark:text-white">
                  {standing}<span className="text-2xl text-muted-foreground ml-1">cm</span>
                </span>
              </div>
              <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <IconArrowBigUpFilled size={120} />
              </div>
            </button>

            <button
              onClick={() => controlDeskHeight(sitting)}
              title={sittingLabel}
              disabled={isControlling || isMoving}
              className="flex-1 w-full relative group overflow-hidden rounded-xl border-2 border-transparent hover:border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/40 transition-all text-left p-8"
            >
              <div className="flex flex-col h-full justify-between relative z-10">
                <span className="text-blue-600 dark:text-blue-400 font-semibold text-lg uppercase tracking-wide">
                  {sittingLabel}
                </span>
                <span className="text-5xl font-bold text-gray-900 dark:text-white">
                  {sitting}<span className="text-2xl text-muted-foreground ml-1">cm</span>
                </span>
              </div>
              <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <IconArrowBigDownFilled size={120} />
              </div>
            </button>
            <button
              onClick={() => controlDeskHeight(custom)}
              title={customLabel}
              disabled={isControlling || isMoving || !custom}  
              className="flex-1 w-full relative group overflow-hidden rounded-xl border-2 border-transparent hover:border-purple-500/50 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-all text-left p-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col h-full justify-between relative z-10">
                <span className="text-purple-600 dark:text-purple-400 font-semibold text-lg uppercase tracking-wide">
                  {customLabel}
                </span>
                <span className="text-5xl font-bold text-gray-900 dark:text-white">
                  {custom ? (
                    <>{custom}<span className="text-2xl text-muted-foreground ml-1">cm</span></>
                  ) : (
                    <span className="text-2xl text-muted-foreground">Not set</span>
                  )}
                </span>
              </div>
              <div className="absolute right-4 bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Settings2 size={120} />
              </div>
            </button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}