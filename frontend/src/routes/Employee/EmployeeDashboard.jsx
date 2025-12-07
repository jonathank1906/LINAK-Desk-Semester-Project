import { AppSidebar } from "@/components/app-sidebar-employee";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import MyDesk from "./MyDesk";
import Reservations from "./Reservations";
import Hotdesk from "./Hotdesk";
import { formatLocalYYYYMMDD, formatNiceDate, formatTimeFromISO } from "@/utils/date";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { Spinner } from '@/components/ui/shadcn-io/spinner';

import axios from "axios";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { MoreVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

    const [releasingDesk, setReleasingDesk] = useState(false);
    const [checkingInReservation, setCheckingInReservation] = useState({});

    // HELPER: Safely parse Django ISO format date strings
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
                const upcoming = res.data
                    .filter(r => r.status === "confirmed" || r.status === "active")
                    .map(r => {
                        const parsedStartTime = parseDateSafe(r.start_time);
                        const parsedEndTime = parseDateSafe(r.end_time);
                        if (!parsedStartTime || !parsedEndTime) return null;
                        const now = new Date();
                        const startDiffMins = (parsedStartTime.getTime() - now.getTime()) / 1000 / 60;
                        return {
                            id: r.id,
                            date: formatNiceDate(parsedStartTime),
                            desk_name: r.desk_name || `Desk ${r.desk_id}`,
                            start_time: `${String(parsedStartTime.getHours()).padStart(2, '0')}:${String(parsedStartTime.getMinutes()).padStart(2, '0')}`,
                            end_time: `${String(parsedEndTime.getHours()).padStart(2, '0')}:${String(parsedEndTime.getMinutes()).padStart(2, '0')}`,
                            checkedIn: r.status === "active",
                            loadingCheckin: startDiffMins <= 15 && startDiffMins > 14.5,
                            raw_start: r.start_time,
                            raw_status: r.status
                        };
                    })
                    .filter(Boolean);
                setUpcomingReservations(upcoming);
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
                console.warn('Could not verify existing desks before check-in:', err);
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
                console.log('🔍 Found desk ID:', deskId);

                if (deskId) {
                    const deskRes = await axios.get(`http://localhost:8000/api/desks/${deskId}/`, config);
                    console.log('🔍 Desk data:', deskRes.data);
                    console.log('🔍 requires_confirmation field:', deskRes.data.requires_confirmation);
                    requiresConfirmation = !!deskRes.data.requires_confirmation;
                    console.log('🔍 Final requiresConfirmation value:', requiresConfirmation);
                }
            } catch (err) {
                console.warn('Could not fetch desk confirmation status:', err);
            }

            // Update UI state
            setUpcomingReservations((prev) =>
                prev.map((r) =>
                    r.id === reservationId ? { ...r, checkedIn: true } : r
                )
            );

            if (deskId && !requiresConfirmation) {
                setSelectedDeskId(deskId);
            }

            console.log('🔍 About to check modal condition - deskId:', deskId, 'requiresConfirmation:', requiresConfirmation);

            // Only show modal if desk actually requires confirmation
            if (deskId && requiresConfirmation) {
                console.log('✅ Opening verification modal');
                setPendingDeskId(deskId);
                setVerificationModalOpen(true);
                // Don't show success toast yet - wait for confirmation
            } else {
                console.log('❌ Skipping verification modal, showing success toast');
                // No confirmation needed - show success immediately
                toast.success("Checked in successfully");
            }

        } catch (err) {
            toast.error("Failed to check in", {
                description: err.response?.data?.error || err.message,
            });
        }
        finally {
            setCheckingInReservation(prev => ({ ...prev, [reservationId]: false }));
        }
    }

    async function handleCheckOutReservation(reservationId) {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
                withCredentials: true,
            };
            await axios.post(
                `http://localhost:8000/api/reservations/${reservationId}/check_out/`,
                {},
                config
            );
            toast.success("Checked out successfully");
            setSelectedDeskId(null);
            setSessionStartTime(null);
            setElapsedTime("00:00:00");
            setLiveSittingSeconds(0);
            setLiveStandingSeconds(0);
            setBaseSittingSeconds(0);
            setBaseStandingSeconds(0);
            setLastFetchTime(null);
        } catch (err) {
            console.error("API error:", err);
            toast.error("Failed to check out", {
                description: err.response?.data?.error || err.message,
            });
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
            console.error('API error cancelling reservation:', err);
            toast.error('Failed to cancel reservation', { description: err.response?.data?.error || err.message });
        }
    }

    function goToMyDesk() {
        setSelectedSection("mydesk");
    }

    function goToHotDesk() {
        setSelectedSection("hotdesk");
    }

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
                                            <div className="text-xs text-muted-foreground mt-1">
                                                <span className="font-mono font-semibold text-primary">
                                                    {elapsedTime}
                                                </span>
                                                {" "}elapsed
                                            </div>
                                        ) : null}
                                        {selectedDeskId && usageStats?.active_session ? (
                                            <div className="flex flex-col items-start gap-2 mt-2">
                                                <div className="text-xs text-muted-foreground">
                                                    <span className="font-semibold">{sittingMinutes}m sitting</span> |{" "}
                                                    <span className="font-semibold">{standingMinutes}m standing</span>
                                                </div>
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
                                                                console.warn('Failed to auto-cancel reservation after release:', err);
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
                                                        } catch (err) {
                                                            console.error("API error:", err);
                                                            console.error("Error releasing desk:", err);
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
                                                <div className="text-xs text-muted-foreground">
                                                    <div>{r.date}</div>
                                                    <div>
                                                        {r.desk_name}
                                                        <span className="ml-2">
                                                            {r.start_time && r.end_time && (
                                                                <>
                                                                    ({r.start_time} - {r.end_time})
                                                                </>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {idx === 0 ? (
                                                        <>
                                                            {!r.checkedIn ? (
                                                                canCheckIn(r) ? (
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
                                                                <span className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800">Checked in</span>
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
                    onClose={() => setVerificationModalOpen(false)}
                />
            </SidebarInset>
        </SidebarProvider>
    );
}