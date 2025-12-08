import { AppSidebar } from "@/components/app-sidebar-employee";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/useAuth";
import MyDesk from "./MyDesk";
import Reservations from "./Reservations";
import Hotdesk from "./Hotdesk";
import { formatNiceDate } from "@/utils/date";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { Progress } from "@/components/ui/progress"
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

    const [releasingDesk, setReleasingDesk] = useState(false);
    const [checkingInReservation, setCheckingInReservation] = useState({});

    // Track pending confirmation reservations in a ref so fetchReservations can't overwrite them
    const pendingConfirmationRef = useRef({});

    // User metrics state
    const [metricsData, setMetricsData] = useState(null);
    const [metricsLoading, setMetricsLoading] = useState(false);
    const [metricsTimeRange, setMetricsTimeRange] = useState("7");
    const [lastUpdated, setLastUpdated] = useState(null);

    function formatMinutes(mins) {
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return `${h}hr${h > 1 ? 's' : ''}${m > 0 ? ` ${m}m` : ''}`;
        }
        return `${mins}m`;
    }

    function formatTimeLeft(endTime) {
        if (!endTime) return null;
        const now = new Date();
        const end = new Date(endTime);
        const diffMs = end - now;
        if (diffMs <= 0) return "00:00:00";
        const diffSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(diffSeconds / 3600);
        const minutes = Math.floor((diffSeconds % 3600) / 60);
        const seconds = diffSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

    useEffect(() => {
        if (!user) return;
        const fetchOccupiedDesk = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };
                const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
                let occupiedDesk = desksRes.data.find(
                    (desk) => {
                        const isOwnedByUser = desk.current_user && String(desk.current_user.id) === String(user.id);
                        const isOccupied = desk.current_status === "occupied" || desk.current_status === "in_use";
                        return (isOwnedByUser || isOccupied) && desk.current_status !== "available";
                    }
                );
                if (!occupiedDesk) {
                    try {
                        const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
                        const active = (res.data || []).find(r => {
                            if (!(r.status === 'active' || r.status === 'confirmed')) return false;
                            const rUserId = r.user_id || (r.user && (typeof r.user === 'object' ? r.user.id : r.user)) || r.owner;
                            return rUserId && String(rUserId) === String(user.id);
                        });
                        if (active) {
                            const deskId = active.desk_id || active.desk;
                            if (deskId) {
                                occupiedDesk = { id: deskId };
                            }
                        }
                    } catch (err) {
                        console.warn('Failed to query reservations while finding occupied desk:', err);
                    }
                }
                if (occupiedDesk) {
                    try {
                        const statusCheck = await axios.get(`http://localhost:8000/api/desks/${occupiedDesk.id}/`, config);
                        if (statusCheck && statusCheck.status === 200) {
                            setSelectedDeskId(occupiedDesk.id);
                        } else {
                            console.warn('Desk details not accessible, skipping setting selectedDeskId for', occupiedDesk.id);
                            setSelectedDeskId(null);
                        }
                    } catch (err) {
                        console.warn('Could not access desk details for', occupiedDesk.id, err);
                        setSelectedDeskId(null);
                    }
                } else {
                    setSelectedDeskId(null);
                    setSessionStartTime(null);
                }
            } catch (err) {
                console.error("API error:", err);
                setSelectedDeskId(null);
                setSessionStartTime(null);
            }
        };
        fetchOccupiedDesk();
    }, [user]);

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
            setDeskStatus(null);
            setUsageStats(null);
            setSessionStartTime(null);
            return;
        }
        const fetchDeskStatus = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };
                const statusRes = await axios.get(
                    `http://localhost:8000/api/desks/${selectedDeskId}/`,
                    config
                );
                setDeskStatus(statusRes.data);
                setCurrentHeight(statusRes.data.current_height);
                try {
                    const usageRes = await axios.get(
                        `http://localhost:8000/api/desks/${selectedDeskId}/usage/`,
                        config
                    );
                    setUsageStats(usageRes.data);
                    if (usageRes.data.active_session && usageRes.data.started_at) {
                        setSessionStartTime(new Date(usageRes.data.started_at));
                        setBaseSittingSeconds(usageRes.data.sitting_time || 0);
                        setBaseStandingSeconds(usageRes.data.standing_time || 0);
                        setLastFetchTime(new Date());
                    } else {
                        setSessionStartTime(null);
                        setBaseSittingSeconds(0);
                        setBaseStandingSeconds(0);
                        setLiveSittingSeconds(0);
                        setLiveStandingSeconds(0);
                        setLastFetchTime(null);
                    }
                } catch {
                    setUsageStats(null);
                    setSessionStartTime(null);
                    setBaseSittingSeconds(0);
                    setBaseStandingSeconds(0);
                    setLiveSittingSeconds(0);
                    setLiveStandingSeconds(0);
                    setLastFetchTime(null);
                }
            } catch (err) {
                console.error("API error:", err);
                setDeskStatus(null);
                setUsageStats(null);
                setSessionStartTime(null);
                setBaseSittingSeconds(0);
                setBaseStandingSeconds(0);
                setLiveSittingSeconds(0);
                setLiveStandingSeconds(0);
                setLastFetchTime(null);
            }
        };
        fetchDeskStatus();
        const interval = setInterval(fetchDeskStatus, 30000);
        return () => clearInterval(interval);
    }, [user, selectedDeskId]);

    useEffect(() => {
        if (!sessionStartTime) {
            setElapsedTime("00:00:00");
            return;
        }
        const updateElapsedTime = () => {
            const now = new Date();
            const diffMs = now - sessionStartTime;
            const diffSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(diffSeconds / 3600);
            const minutes = Math.floor((diffSeconds % 3600) / 60);
            const seconds = diffSeconds % 60;
            setElapsedTime(
                `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
            );
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
                    // Remove pending state from ref
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
        setCheckingInReservation(prev => ({ ...prev, [reservationId]: true }));
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
                withCredentials: true,
            };
            try {
                const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
                const existing = desksRes.data.find(d => d.current_user && String(d.current_user.id) === String(user.id) && d.current_status !== 'available');
                if (existing) {
                    toast.error('You already have an active desk. Release it before checking into another.');
                    return;
                }
            } catch (err) {
                // Silent
            }

            await axios.post(
                `http://localhost:8000/api/reservations/${reservationId}/check_in/`,
                {},
                config
            );

            // Fetch desk details to check requires_confirmation
            let deskId = null;
            let requiresConfirmation = false;
            try {
                // Get reservation to find desk id
                const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
                const reservation = (res.data || []).find(r => r.id === reservationId);
                deskId = reservation?.desk_id || reservation?.desk;

                if (deskId) {
                    const deskRes = await axios.get(`http://localhost:8000/api/desks/${deskId}/`, config);
                    requiresConfirmation = !!deskRes.data.requires_confirmation;
                }
            } catch (err) {
                // Silent
            }

            if (deskId && requiresConfirmation) {
                // Mark as pending confirmation in both state and ref
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
                // No confirmation needed, mark as checked in immediately
                pendingConfirmationRef.current[reservationId] = false;
                setUpcomingReservations((prev) =>
                    prev.map((r) =>
                        r.id === reservationId ? { ...r, checkedIn: true, pendingConfirmation: false } : r
                    )
                );
                if (deskId) setSelectedDeskId(deskId);
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

    async function handleReleaseReservation(id) {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
                withCredentials: true,
            };
            await axios.post(`http://localhost:8000/api/reservations/${id}/cancel/`, {}, config);
            setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
            toast.success('Reservation cancelled');
        } catch (err) {
            toast.error('Failed to cancel reservation', { description: err?.response?.data?.error || err?.message });
        }
    }

    function goToMyDesk() {
        setSelectedSection("mydesk");
    }

    function goToHotDesk() {
        setSelectedSection("hotdesk");
    }

    // We use useCallback to prevent this function from being recreated on every render
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
            setLastUpdated(new Date()); // Update the timestamp on success
        } catch (error) {
            console.error("Failed to fetch user metrics:", error);
        } finally {
            setMetricsLoading(false);
        }
    }, [user, selectedSection, metricsTimeRange]);


    useEffect(() => {
        fetchMetrics();

        const onFocus = () => {
            fetchMetrics();
        };

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
                                                {/* Show time left only for reservation sessions */}
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
                                            <Button
                                                onClick={goToHotDesk}
                                                aria-label="Select a Desk"
                                            >
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
                                                            await axios.post(
                                                                `http://localhost:8000/api/desks/${selectedDeskId}/release/`,
                                                                {},
                                                                config
                                                            );
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
                                                                toast.error('Released desk but failed to cancel reservation', { description: err?.response?.data?.error || err?.message });
                                                            }
                                                            window.dispatchEvent(new Event('reservation-updated'));
                                                            setSelectedDeskId(null);
                                                            setSessionStartTime(null);
                                                            setElapsedTime("00:00:00");
                                                            setLiveSittingSeconds(0);
                                                            setLiveStandingSeconds(0);
                                                            setBaseSittingSeconds(0);
                                                            setBaseStandingSeconds(0);
                                                            setLastFetchTime(null);
                                                            toast.success("Desk released successfully");
                                                        } catch (err) {
                                                            if (err?.response?.status === 403) {
                                                                toast.error('Not authorized to release this desk (403)');
                                                            }
                                                        } finally {
                                                            setReleasingDesk(false);
                                                        }
                                                    }}
                                                    className="variant-outline"
                                                    aria-label="Release desk"
                                                    disabled={releasingDesk}
                                                >
                                                    {releasingDesk ? (
                                                        <span style={{ display: "inline-block", width: "7em", textAlign: "center" }}>
                                                            <Spinner variant="circle" className="h-4 w-4 mx-auto" />
                                                        </span>
                                                    ) : (
                                                        <span style={{ display: "inline-block", width: "7em", textAlign: "center" }}>
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
                                                    {/* 1. Date as the "Header" - bolder and brighter */}
                                                    <span className="text-sm font-semibold text-foreground">
                                                        {r.date}
                                                    </span>

                                                    {/* 2. Row of "Pills" for details */}
                                                    <div className="flex items-center gap-2">

                                                        {/* Desk Pill */}
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                                                            {r.desk_name}
                                                        </div>

                                                        {/* Time Pill */}
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

                                    {/* Healthiness Score & No Show Table */}
                                    {/*
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <HealthinessScore
                                            data={metricsData.healthiness}
                                            isDarkMode={document.documentElement.classList.contains('dark')}
                                        />
                                        <NoShowTable
                                            data={metricsData.no_shows}
                                            isDarkMode={document.documentElement.classList.contains('dark')}
                                        />
                                    </div>
                                    */}

                                    {/* Charts Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Standing/Sitting Chart */}
                                        <StandingSittingChart
                                            data={metricsData.standing_sitting_chart}
                                            title="Standing vs Sitting Time"
                                        />

                                        {/* Weekly Usage Chart */}
                                        {/*
                                        <WeeklyUsageChart
                                            data={metricsData.weekly_usage}
                                            title="Weekly Usage Pattern"
                                        />
                                        */}

                                        {/* Most Used Desks */}
                                        <MostUsedDesksChart
                                            desks={metricsData.most_used_desks}
                                            title="Most Used Desks"
                                        />

                                        {/* Leaderboard */}
                                        {/*}
                                        <StandingLeaderboard
                                            leaderboard={metricsData.leaderboard}
                                            title="Standing Time Leaderboard"
                                        />
                                        */}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case "reservations":
                return <Reservations setSelectedDeskId={setSelectedDeskId} />;
            case "hotdesk":
                return <Hotdesk setSelectedDeskId={setSelectedDeskId} />;
            case "mydesk":
                return <MyDesk selectedDeskId={selectedDeskId} />;
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
                    }}
                />
            </SidebarInset>
        </SidebarProvider>
    );
}