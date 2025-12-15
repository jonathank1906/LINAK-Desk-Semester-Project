import { AppSidebar } from "@/components/app-sidebar-employee";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/useAuth";
import { usePostureCycle } from "@/contexts/usePostureCycle";
import MyDesk from "./MyDesk";
import Reservations from "./Reservations";
import Hotdesk from "./HotDesk";
import { formatNiceDate } from "@/utils/date";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, LogOut } from "lucide-react"; 
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Chart components
import { StandingSittingChart } from "@/components/charts/StandingSittingChart";
import { MostUsedDesksChart } from "@/components/charts/MostUsedDesksChart";
import { OverallStatsCards } from "@/components/charts/OverallStatsCards";

import axios from "axios";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import PendingVerificationModal from "@/components/pending-verification-modal";
import { toast } from "sonner";

export default function EmployeeDashboard() {
    const [selectedSection, setSelectedSection] = useState("dashboard");
    const { user } = useAuth();
    const { registerCallbacks, setActiveDeskStatus, triggerTestReminder } = usePostureCycle();

    const [selectedDeskId, setSelectedDeskId] = useState(null);
    const [deskStatus, setDeskStatus] = useState(null);
    const [usageStats, setUsageStats] = useState(null);

    // Live elapsed time state
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState("00:00:00");
    const [timeLeft, setTimeLeft] = useState("00:00:00");

    // Base values from API (updated every 30 seconds)
    const [baseSittingSeconds, setBaseSittingSeconds] = useState(0);
    const [baseStandingSeconds, setBaseStandingSeconds] = useState(0);
    const [lastFetchTime, setLastFetchTime] = useState(null);

    // Live display values (updated every second)
    const [liveSittingSeconds, setLiveSittingSeconds] = useState(0);
    const [liveStandingSeconds, setLiveStandingSeconds] = useState(0);
    const [currentHeight, setCurrentHeight] = useState(null);

    const [upcomingReservations, setUpcomingReservations] = useState([]);

    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [pendingDeskId, setPendingDeskId] = useState(null);
    const [pendingReservationId, setPendingReservationId] = useState(null);
    const [pendingDeskName, setPendingDeskName] = useState(null);

    const [releasingDesk, setReleasingDesk] = useState(false);
    const [checkingInReservation, setCheckingInReservation] = useState({});

    // Track pending confirmation reservations in a ref so fetchReservations can't overwrite them
    const pendingConfirmationRef = useRef({});

    // User metrics state
    const [metricsData, setMetricsData] = useState(null);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsTimeRange, setMetricsTimeRange] = useState("7");
    const [lastUpdated, setLastUpdated] = useState(null);

    // --- FIX: GRACE PERIOD REF ---
    // We track when the desk was selected to prevent immediate "session ended" errors due to DB lag
    const lastSelectionTimeRef = useRef(0);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Only trigger if not typing in an input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            if (e.key === 'T' || e.key === 't') {
                e.preventDefault();
                triggerTestReminder();
            } else if (e.key === 'R' || e.key === 'r') {
                e.preventDefault();
                document.documentElement.style.animation = 'barrelRoll 0.5s ease-in-out';
                setTimeout(() => {
                    document.documentElement.style.animation = '';
                }, 500);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [triggerTestReminder]);

    // Update the timestamp whenever selectedDeskId changes (User selects a desk)
    useEffect(() => {
        if (selectedDeskId) {
            lastSelectionTimeRef.current = Date.now();
        }
    }, [selectedDeskId]);

    function formatMinutes(mins) {
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${h}hr${h > 1 ? 's' : ''}${m > 0 ? ` ${m}m` : ''}`;
        }
        return `${mins}m`;
    }

    // Format seconds as "Xh Ym" or "Xm" (no seconds)
    function formatHM(seconds) {
        if (!seconds || isNaN(seconds)) return "0m";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) {
            return `${h}h${m > 0 ? ` ${m}m` : ''}`;
        }
        return `${m}m`;
    }

    function formatTimeLeft(endTime) {
        if (!endTime) return null;
        const now = new Date();
        const end = new Date(endTime);
        const diffMs = end - now;
        if (diffMs <= 0) return "0m";
        const diffSeconds = Math.floor(diffMs / 1000);
        return formatHM(diffSeconds);
    }

    // Parse Django ISO format date strings
    const parseDateSafe = (dateString) => {
        if (!dateString || typeof dateString !== "string") return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn("Invalid reservation datetime string:", dateString);
                return null;
            }
            return date;
        } catch (err) {
            console.warn("Error parsing datetime string:", dateString, err);
            return null;
        }
    };

    const canCheckIn = (reservation) => {
        if (!reservation?.raw_start || reservation.raw_status !== "confirmed") return false;
        const start = parseDateSafe(reservation.raw_start);
        if (!start) return false;
        const nowMs = new Date().getTime();
        const startMs = start.getTime();
        const diffMins = (startMs - nowMs) / 1000 / 60;
        return diffMins <= 30 && diffMins >= -10;
    };

    useEffect(() => {
        if (!usageStats?.reservation_end_time) {
            setTimeLeft("00:00:00");
            return;
        }
        const update = () => setTimeLeft(formatTimeLeft(usageStats.reservation_end_time));
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [usageStats?.reservation_end_time]);


    // Replace the checkActiveDesk useCallback and its mount effect (around lines 118-165):

    const checkActiveDesk = useCallback(async () => {
        if (!user) return null;
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                withCredentials: true,
            };
            const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
            
            // 1. Check for PHYSICAL Desk Occupancy
            let occupiedDesk = desksRes.data.find((desk) => {
                const deskUserId = desk.current_user?.id || desk.current_user;
                const isOwnedByUser = deskUserId && String(deskUserId) === String(user.id);
                const isOccupied = ["occupied", "in_use", "pending_verification", "moving"].includes(desk.current_status);
                return isOwnedByUser && isOccupied;
            });

            // 2. If no physical desk, check for ACTIVE Reservation
            if (!occupiedDesk) {
                try {
                    const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
                    const active = (res.data || []).find(r => {
                        if (r.status !== 'active') return false; 
                        const rUserId = r.user_id || (r.user && (typeof r.user === 'object' ? r.user.id : r.user)) || r.owner;
                        return rUserId && String(rUserId) === String(user.id);
                    });
                    
                    if (active) {
                        const deskId = active.desk_id || active.desk;
                        if (deskId) occupiedDesk = { id: deskId };
                    }
                } catch (err) {
                    console.warn('Failed to query reservations while finding occupied desk:', err);
                }
            }

            // Return the desk ID or null (don't update state here)
            return occupiedDesk ? occupiedDesk.id : null;
            
        } catch (err) {
            console.error("API error checking active desk:", err);
            return null;
        }
    }, [user]);

    // Initial check on mount - only runs ONCE
    useEffect(() => {
        let mounted = true;
        
        const initialCheck = async () => {
            const deskId = await checkActiveDesk();
            if (mounted && deskId) {
                setSelectedDeskId(deskId);
                // Also set timestamp on initial load
                lastSelectionTimeRef.current = Date.now();
            }
        };
        
        initialCheck();
        
        return () => { mounted = false; };
    }, [user]); // Only depend on user, not checkActiveDesk

    // Initial check on mount
    useEffect(() => {
        checkActiveDesk();
    }, [checkActiveDesk]);


    useEffect(() => {
        if (!user) return;
        const fetchReservations = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };
                const res = await axios.get("http://localhost:8000/api/reservations/", config);
                setUpcomingReservations(prev => {
                    const upcoming = res.data
                        .filter(r => r.status === "confirmed" || r.status === "active" || r.status === "pending_confirmation")
                        .map(r => {
                            const parsedStartTime = parseDateSafe(r.start_time);
                            const parsedEndTime = parseDateSafe(r.end_time);
                            if (!parsedStartTime || !parsedEndTime) return null;
                            const now = new Date();
                            const startDiffMins = (parsedStartTime.getTime() - now.getTime()) / 1000 / 60;

                            const isPendingInRef = !!pendingConfirmationRef.current[r.id];
                            const isPending = isPendingInRef || r.status === "pending_confirmation";

                            return {
                                id: r.id,
                                date: formatNiceDate(parsedStartTime),
                                desk_name: r.desk_name || `Desk ${r.desk_id}`,
                                start_time: `${String(parsedStartTime.getHours()).padStart(2, '0')}:${String(parsedStartTime.getMinutes()).padStart(2, '0')}`,
                                end_time: `${String(parsedEndTime.getHours()).padStart(2, '0')}:${String(parsedEndTime.getMinutes()).padStart(2, '0')}`,
                                checkedIn: isPending ? false : r.status === "active",
                                loadingCheckin: startDiffMins <= 15 && startDiffMins > 14.5,
                                raw_start: r.start_time,
                                raw_status: r.status,
                                pendingConfirmation: isPending,
                            };
                        })
                        .filter(Boolean);
                    return upcoming;
                });
            } catch (err) { console.error("API error:", err); }
        };
        fetchReservations();
        const interval = setInterval(fetchReservations, 4000);
        return () => clearInterval(interval);
    }, [user]);

    useEffect(() => {
        const sync = () => {
            const fetchNow = document.querySelector("#force-res-fetch")?.click();
        };
        window.addEventListener("reservation-updated", sync);
        return () => window.removeEventListener("reservation-updated", sync);
    }, []);

    useEffect(() => {
    if (!user || !selectedDeskId) {
        return;
    }

    let mounted = true;

    const fetchDeskStatus = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                withCredentials: true,
            };

            // 1. Get Status
            const statusRes = await axios.get(
                `http://localhost:8000/api/desks/${selectedDeskId}/`,
                config
            );
            
            if (!mounted) return;
            
            setDeskStatus(statusRes.data);
            setCurrentHeight(statusRes.data.current_height);

            // 2. Get Usage Stats
            try {
                const usageRes = await axios.get(
                    `http://localhost:8000/api/desks/${selectedDeskId}/usage/`,
                    config
                );

                if (!mounted) return;

                // --- FIX: SESSION ENDED HANDLING WITH GRACE PERIOD ---
                if (usageRes.data.active_session === false) {
                    
                    // Check if we selected this desk very recently (last 5 seconds)
                    // If so, we assume the DB is still propagating the "active" status
                    // and we IGNORE this failure.
                    const gracePeriodActive = (Date.now() - lastSelectionTimeRef.current) < 5000;

                    if (gracePeriodActive) {
                        console.log("Grace period active: Ignoring session ended signal");
                        return;
                    }

                    if (lastFetchTime !== null) {
                        toast("Session Ended", {
                            description: "Your reservation time has expired."
                        });
                    }
                    // Reset all state
                    setSelectedDeskId(null);
                    setDeskStatus(null);
                    setUsageStats(null);
                    setSessionStartTime(null);
                    setBaseSittingSeconds(0);
                    setBaseStandingSeconds(0);
                    setLiveSittingSeconds(0);
                    setLiveStandingSeconds(0);
                    setLastFetchTime(null);
                    window.dispatchEvent(new Event('reservation-updated'));
                    return;
                }

                setUsageStats(usageRes.data);

                if (usageRes.data.active_session && usageRes.data.started_at) {
                    setSessionStartTime(new Date(usageRes.data.started_at));
                    setBaseSittingSeconds(usageRes.data.sitting_time || 0);
                    setBaseStandingSeconds(usageRes.data.standing_time || 0);
                    setLastFetchTime(new Date());
                }
            } catch (err) {
                if (!mounted) return;
                // Don't clear deskId on API error, just stats
                setUsageStats(null);
                setSessionStartTime(null);
            }
        } catch (err) {
            if (!mounted) return;
            console.error("API error:", err);
            // If the desk itself is not found/accessible, clear the ID
            // Also apply grace period here just in case
            if(err.response && err.response.status === 404) {
                 if ((Date.now() - lastSelectionTimeRef.current) > 5000) {
                    setSelectedDeskId(null);
                 }
            }
        }
    };

    fetchDeskStatus();
    const interval = setInterval(fetchDeskStatus, 5000);
    
    return () => {
        mounted = false;
        clearInterval(interval);
    };
}, [user, selectedDeskId]); // Removed lastFetchTime from dependencies 

    useEffect(() => {
        if (!sessionStartTime) {
            setElapsedTime("0m");
            return;
        }
        const updateElapsedTime = () => {
            const now = new Date();
            const diffMs = now - sessionStartTime;
            const diffSeconds = Math.floor(diffMs / 1000);
            setElapsedTime(formatHM(diffSeconds));
        };
        updateElapsedTime();
        const timerInterval = setInterval(updateElapsedTime, 1000);
        return () => clearInterval(timerInterval);
    }, [sessionStartTime]);

    useEffect(() => {
        if (!usageStats?.active_session || !lastFetchTime) {
            setLiveSittingSeconds(0);
            setLiveStandingSeconds(0);
            return;
        }
        const updateLiveTimes = () => {
            const now = new Date();
            const elapsedSinceFetch = Math.floor((now - lastFetchTime) / 1000);
            if (currentHeight !== null) {
                if (currentHeight < 95) {
                    setLiveSittingSeconds(baseSittingSeconds + elapsedSinceFetch);
                    setLiveStandingSeconds(baseStandingSeconds);
                } else {
                    setLiveSittingSeconds(baseSittingSeconds);
                    setLiveStandingSeconds(baseStandingSeconds + elapsedSinceFetch);
                }
            }
        };
        updateLiveTimes();
        const liveInterval = setInterval(updateLiveTimes, 1000);
        return () => clearInterval(liveInterval);
    }, [baseSittingSeconds, baseStandingSeconds, lastFetchTime, currentHeight, usageStats]);

    function handleDeleteReservation(id) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
    }

    // ... [Pending Verification Modal Logic remains the same] ...
    useEffect(() => {
        if (!verificationModalOpen || !pendingDeskId || !pendingReservationId || !user) {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };
                const res = await axios.get(`http://localhost:8000/api/desks/${pendingDeskId}/`, config);

                if (res.data.current_status === "occupied") {
                    pendingConfirmationRef.current[pendingReservationId] = false;
                    setUpcomingReservations((prev) =>
                        prev.map((r) =>
                            r.id === pendingReservationId
                                ? { ...r, checkedIn: true, pendingConfirmation: false }
                                : r
                        )
                    );
                    setSelectedDeskId(pendingDeskId);
                    toast.success("Checked in successfully");
                    setVerificationModalOpen(false);
                    setPendingDeskId(null);
                    setPendingReservationId(null);
                }
            } catch (err) {
                // Silent fail
            }
        }, 1000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [verificationModalOpen, pendingDeskId, pendingReservationId, user]);

    async function handleCheckInReservation(reservationId) {
        // ... [Existing check-in logic] ...
         setCheckingInReservation(prev => ({ ...prev, [reservationId]: true }));
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
                withCredentials: true,
            };
            
            try {
                const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
                const existing = desksRes.data.find(d => {
                   const uId = d.current_user?.id || d.current_user;
                   return uId && String(uId) === String(user.id) && d.current_status !== 'available';
                });
                
                if (existing) {
                    toast.error('You already have an active desk. Release it before checking into another.');
                    return;
                }
            } catch (err) {}

            await axios.post(
                `http://localhost:8000/api/reservations/${reservationId}/check_in/`,
                {},
                config
            );

            let deskId = null;
            let requiresConfirmation = false;
            try {
                const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
                const reservation = (res.data || []).find(r => r.id === reservationId);
                deskId = reservation?.desk_id || reservation?.desk;

                if (deskId) {
                    const deskRes = await axios.get(`http://localhost:8000/api/desks/${deskId}/`, config);
                    requiresConfirmation = !!deskRes.data.requires_confirmation;
                    setPendingDeskName(deskRes.data.name); 
                }
            } catch (err) {}

            if (deskId && requiresConfirmation) {
                pendingConfirmationRef.current[reservationId] = true;
                setUpcomingReservations((prev) =>
                    prev.map((r) =>
                        r.id === reservationId ? { ...r, pendingConfirmation: true } : r
                    )
                );
                setPendingDeskId(deskId);
                setPendingReservationId(reservationId);
                setVerificationModalOpen(true);
            } else {
                pendingConfirmationRef.current[reservationId] = false;
                setUpcomingReservations((prev) =>
                    prev.map((r) =>
                        r.id === reservationId ? { ...r, checkedIn: true, pendingConfirmation: false } : r
                    )
                );
                if (deskId) {
                    // Force update selection time to now
                    lastSelectionTimeRef.current = Date.now();
                    setSelectedDeskId(deskId);
                }
                toast.success("Checked in successfully");
            }

        } catch (err) {
            toast.error("Failed to check in", {
                description: err?.response?.data?.error || err?.message,
            });
        }
        finally {
            setCheckingInReservation(prev => ({ ...prev, [reservationId]: false }));
        }
    }

    function goToMyDesk() {
        setSelectedSection("mydesk");
    }

    useEffect(() => {
        registerCallbacks(() => {
            goToMyDesk();
        });
    }, []);

    useEffect(() => {
        setActiveDeskStatus(!!selectedDeskId);
    }, [selectedDeskId, setActiveDeskStatus]);

    function goToHotDesk() {
        setSelectedSection("hotdesk");
    }

    const fetchMetrics = useCallback(async () => {
        if (!user || selectedSection !== "dashboard") return;
        try {
            setMetricsLoading(true);
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
                withCredentials: true,
            };
            const response = await axios.get(
                `http://localhost:8000/api/user/metrics/?days=${metricsTimeRange}`,
                config
            );
            setMetricsData(response.data);
            setLastUpdated(new Date()); 
        } catch (error) {
            console.error("Failed to fetch user metrics:", error);
        } finally {
            setMetricsLoading(false);
        }
    }, [user, selectedSection, metricsTimeRange]);


    useEffect(() => {
        fetchMetrics();
        const onFocus = () => { fetchMetrics(); };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [fetchMetrics]);


    const sittingMinutes = Math.floor(liveSittingSeconds / 60);
    const standingMinutes = Math.floor(liveStandingSeconds / 60);

    function renderContent() {
        switch (selectedSection) {
            case "dashboard":
            default:
                return (
                    <div className="p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                            {/* My Desk Card */}
                            <Card className="flex-1 min-w-[320px] self-start animate-fade-up">
                                <CardHeader className="flex items-start justify-between">
                                    <div>
                                        <CardTitle>My Desk</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-medium">
                                            {selectedDeskId
                                                ? deskStatus?.name ?? `Desk #${selectedDeskId}`
                                                : (
                                                    <span className="px-3 py-1 rounded-full bg-yellow-200 text-yellow-900 font-semibold inline-block">
                                                        No Desk Selected
                                                    </span>
                                                )
                                            }
                                        </div>
                                        {selectedDeskId && sessionStartTime ? (
                                            <div className="text-xs text-muted-foreground mt-1 flex gap-4 items-center">
                                                <span className="flex items-baseline gap-2">
                                                    <span className="text-xs font-medium text-gray-500 font-sans uppercase tracking-wide">
                                                        ELAPSED:
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                                                        {elapsedTime}
                                                    </span>
                                                </span>
                                                {usageStats?.active_session && usageStats?.source === "reservation" && usageStats?.reservation_end_time && (
                                                    <span className="flex items-baseline gap-2">
                                                        <span className="text-xs font-medium text-gray-500 font-sans uppercase tracking-wide">
                                                            LEFT:
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white font-mono tabular-nums">
                                                            {formatTimeLeft(usageStats.reservation_end_time)}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div>
                                        {!selectedDeskId ? (
                                            <Button onClick={goToHotDesk}>
                                                Hot Desk Now
                                            </Button>
                                        ) : (
                                            <>
                                                <Button
                                                    onClick={async () => {
                                                        if (!selectedDeskId) return;
                                                        setReleasingDesk(true);
                                                        try {
                                                            const config = {
                                                                headers: { Authorization: `Bearer ${user.token}` },
                                                                withCredentials: true,
                                                            };
                                                            // 1. Release API Call
                                                            await axios.post(
                                                                `http://localhost:8000/api/desks/${selectedDeskId}/release/`,
                                                                {},
                                                                config
                                                            );
                                                            
                                                            // 2. Try to cancel active reservations to be safe
                                                            try {
                                                                const res = await axios.get(
                                                                    `http://localhost:8000/api/reservations/`,
                                                                    config
                                                                );
                                                                const userReservations = res.data || [];
                                                                const matching = userReservations.find(r => (r.desk_id === selectedDeskId || r.desk === selectedDeskId) && (r.status === 'confirmed' || r.status === 'active'));
                                                                if (matching) {
                                                                    await axios.post(
                                                                        `http://localhost:8000/api/reservations/${matching.id}/cancel/`,
                                                                        {},
                                                                        config
                                                                    );
                                                                    setUpcomingReservations(prev => prev.filter(rr => rr.id !== matching.id));
                                                                }
                                                            } catch (err) {
                                                                // Ignore reservation cancellation errors if release succeeded
                                                            }

                                                            // 3. FORCE STATE CLEAR (Crucial Step)
                                                            setSelectedDeskId(null);
                                                            setDeskStatus(null); // Clear desk status immediately
                                                            setUsageStats(null); // Clear usage stats immediately
                                                            setSessionStartTime(null);
                                                            setElapsedTime("00:00:00");
                                                            
                                                            window.dispatchEvent(new Event('reservation-updated'));
                                                            toast.success("Desk released successfully");

                                                            // 4. Double check backend state after a short delay
                                                            // This ensures hotdesk/reservations pages get fresh data
                                                            setTimeout(async () => {
                                                                const freshDeskId = await checkActiveDesk();
                                                                if (freshDeskId && freshDeskId !== selectedDeskId) {
                                                                    setSelectedDeskId(freshDeskId);
                                                                }
                                                            }, 500);

                                                        } catch (err) {
                                                            if (err?.response?.status === 403) {
                                                                toast.error('Not authorized to release this desk');
                                                            } else {
                                                                toast.error('Failed to release desk');
                                                            }
                                                        } finally {
                                                            setReleasingDesk(false);
                                                        }
                                                    }}
                                                    variant="destructive"
                                                    size="sm"
                                                    className="gap-2 min-w-[130px]"
                                                    disabled={releasingDesk}
                                                >
                                                    {releasingDesk ? (
                                                        <span className="flex items-center justify-center w-full">
                                                            <Spinner variant="circle" className="h-4 w-4" />
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2 w-full justify-center">
                                                            <LogOut className="w-4 h-4" />
                                                            Release Desk
                                                        </span>
                                                    )}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            {/* Upcoming Reservations Card */}
                            <Card className="flex-1 min-w-[320px] animate-fade-up">
                                <CardHeader className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-muted-foreground" />
                                        <CardTitle>Upcoming Reservations</CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button id="force-res-fetch" hidden></button>
                                        {upcomingReservations.length > 0 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedSection("reservations")}
                                                aria-label="Manage Reservations"
                                            >
                                                Manage
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="grid gap-3">
                                    {upcomingReservations.length ? (
                                        upcomingReservations.map((r, idx) => (
                                            <div
                                                key={r.id}
                                                className="flex items-center justify-between rounded-md border p-3"
                                            >
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {r.date}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                                                            {r.desk_name}
                                                        </div>
                                                        {r.start_time && r.end_time && (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-border text-muted-foreground text-xs font-medium">
                                                                <Clock className="w-3 h-3" />
                                                                <span>
                                                                    {r.start_time} - {r.end_time}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {idx === 0 ? (
                                                        <>
                                                            {!r.checkedIn ? (
                                                                (r.pendingConfirmation || r.raw_status === "pending_confirmation") ? (
                                                                    <span className="px-3 py-1 text-xs rounded-full bg-yellow-200 text-yellow-900 font-semibold inline-block">
                                                                        Pending confirmation
                                                                    </span>
                                                                ) : canCheckIn(r) ? (
                                                                    r.loadingCheckin ? (
                                                                        <span className="text-sm text-blue-500 animate-pulse">Loading check-in...</span>
                                                                    ) : (
                                                                        <Button
                                                                            onClick={() => handleCheckInReservation(r.id)}
                                                                            disabled={!!checkingInReservation[r.id]}
                                                                        >
                                                                            {checkingInReservation[r.id] ? (
                                                                                <span style={{ display: "inline-block", width: "4em", textAlign: "center" }}>
                                                                                    <Spinner variant="circle" className="h-4 w-4 mx-auto" />
                                                                                </span>
                                                                            ) : (
                                                                                <span style={{ display: "inline-block", width: "4em", textAlign: "center" }}>
                                                                                    Check in
                                                                                </span>
                                                                            )}
                                                                        </Button>
                                                                    )
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">Check-in available 30 mins before</span>
                                                                )
                                                            ) : (
                                                                <span className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-800 font-semibold inline-block">Checked in</span>
                                                            )}
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-muted-foreground">
                                                No upcoming reservations
                                            </div>
                                            <Button
                                                onClick={() => setSelectedSection("reservations")}
                                                aria-label="Reserve a Desk"
                                            >
                                                Reserve a Desk
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* User Metrics Section */}
                        <div className="mt-8 space-y-6">
                            {/* Header with time range selector */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">Your Metrics</h2>
                                    <p className="text-muted-foreground text-sm">
                                        Track your desk usage and health statistics
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {lastUpdated && (
                                        <span className="text-xs text-muted-foreground">
                                            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                    <Select value={metricsTimeRange} onValueChange={setMetricsTimeRange}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Time range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="7">Last 7 days</SelectItem>
                                            <SelectItem value="14">Last 14 days</SelectItem>
                                            <SelectItem value="30">Last 30 days</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {metricsData && (
                                <>
                                    {/* Overall Stats Cards */}
                                    <OverallStatsCards stats={metricsData.overall_stats} />

                                    {/* Charts Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Standing/Sitting Chart */}
                                        <StandingSittingChart
                                            data={metricsData.standing_sitting_chart}
                                            title="Standing vs Sitting Time"
                                        />

                                        {/* Most Used Desks */}
                                        <MostUsedDesksChart
                                            desks={metricsData.most_used_desks}
                                            title="Most Used Desks"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case "reservations":
                return <Reservations setSelectedDeskId={(id) => {
                    // Update timestamp on manual selection to protect against race conditions
                    lastSelectionTimeRef.current = Date.now();
                    setSelectedDeskId(id);
                }} />;
            case "hotdesk":
                return <Hotdesk setSelectedDeskId={(id) => {
                    // Update timestamp on manual selection to protect against race conditions
                    lastSelectionTimeRef.current = Date.now();
                    setSelectedDeskId(id);
                }} />;
            case "mydesk":
                return (
                    <MyDesk
                        selectedDeskId={selectedDeskId}
                        onNavigate={setSelectedSection}
                        // We still pass these to allow initial render, but the parent now protects the state
                        initialDeskStatus={deskStatus}
                        initialUsageStats={usageStats}
                    />
                );
        }
    }

    return (
        <SidebarProvider>
            <div className="absolute top-4 right-4 z-50">
                <div className="flex items-center gap-3">
                    <ModeToggle />
                    <NavUser user={user} />
                </div>
            </div>
            <AppSidebar
                onSectionSelect={setSelectedSection}
                activeSection={selectedSection}
            />
            <SidebarInset>
                <header className="relative flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                {renderContent()}
                <PendingVerificationModal
                    open={verificationModalOpen}
                    deskId={pendingDeskId}
                    deskName={pendingDeskName}
                    onClose={async () => {
                        // Clean up pending state when modal is closed
                        if (pendingReservationId) {
                            pendingConfirmationRef.current[pendingReservationId] = false;

                            // Fetch the current reservation status from backend
                            try {
                                const config = {
                                    headers: { Authorization: `Bearer ${user?.token}` },
                                    withCredentials: true,
                                };
                                const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
                                const reservation = (res.data || []).find(r => r.id === pendingReservationId);

                                setUpcomingReservations((prev) =>
                                    prev.map((r) =>
                                        r.id === pendingReservationId
                                            ? {
                                                ...r,
                                                pendingConfirmation: false,
                                                checkedIn: reservation?.status === "active",
                                                raw_status: reservation?.status || r.raw_status
                                            }
                                            : r
                                    )
                                );
                            } catch (err) {
                                setUpcomingReservations((prev) =>
                                    prev.map((r) =>
                                        r.id === pendingReservationId ? { ...r, pendingConfirmation: false, checkedIn: false } : r
                                    )
                                );
                            }
                        }
                        setVerificationModalOpen(false);
                        setPendingDeskId(null);
                        setPendingReservationId(null);
                        setPendingDeskName(null);
                    }}
                />
            </SidebarInset>
        </SidebarProvider>
    );
}