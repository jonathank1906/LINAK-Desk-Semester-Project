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

    // HELPER: Safely parse Django ISO format date strings
    // Django returns ISO 8601 format (UTC) like "2025-11-30T19:30:00Z" or "2025-11-30T19:30:00+00:00"
    // JavaScript's Date constructor handles these correctly
    const parseDateSafe = (dateString) => {
        if (!dateString || typeof dateString !== "string") return null;

        try {
            // JavaScript Date constructor properly handles ISO 8601 strings
            // It automatically converts from UTC to the browser's local timezone
            const date = new Date(dateString);

            // Validate the date is valid
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

        // Allow check-in from 30 minutes before to 10 minutes after reservation start
        return diffMins <= 30 && diffMins >= -10;
    };


    // Fetch user's occupied desk on login/page load
    useEffect(() => {
        if (!user) return;
        // Try to reliably find the user's occupied desk by checking desks list
        // and falling back to active reservations. This prevents the UI from
        // losing the selected desk when backend doesn't show current_user on desk.
        const fetchOccupiedDesk = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };

                // 1) Check desks endpoint for any desk with this user as current_user or any desk currently occupied
                // (hotdesk-started desks may not have current_user but will be "occupied" until released)
                const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
                let occupiedDesk = desksRes.data.find(
                    (desk) => {
                        const isOwnedByUser = desk.current_user && String(desk.current_user.id) === String(user.id);
                        const isOccupied = desk.current_status === "occupied" || desk.current_status === "in_use";
                        return (isOwnedByUser || isOccupied) && desk.current_status !== "available";
                    }
                );

                // 2) If not found, check reservations for any active reservation by this user
                if (!occupiedDesk) {
                    try {
                        const res = await axios.get(`http://localhost:8000/api/reservations/`, config);
                        const active = (res.data || []).find(r => {
                            if (!(r.status === 'active' || r.status === 'confirmed')) return false;
                            // Normalize user field: try r.user_id, r.user (object or id), or r.owner
                            const rUserId = r.user_id || (r.user && (typeof r.user === 'object' ? r.user.id : r.user)) || r.owner;
                            return rUserId && String(rUserId) === String(user.id);
                        });
                        if (active) {
                            // Use desk id from reservation to show in dashboard
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
                    // Verify the desk details are accessible before setting it in UI.
                    try {
                        const statusCheck = await axios.get(`http://localhost:8000/api/desks/${occupiedDesk.id}/`, config);
                        // If accessible, set selected desk
                        if (statusCheck && statusCheck.status === 200) {
                            setSelectedDeskId(occupiedDesk.id);
                        } else {
                            console.warn('Desk details not accessible, skipping setting selectedDeskId for', occupiedDesk.id);
                            setSelectedDeskId(null);
                        }
                    } catch (err) {
                        // If the desk endpoint returns 403/404, don't show it as selected
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

                            // Add raw fields back
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
            // Force immediate refresh instead of waiting 10s
            const fetchNow = document.querySelector("#force-res-fetch")?.click();
        };

        window.addEventListener("reservation-updated", sync);
        return () => window.removeEventListener("reservation-updated", sync);
    }, []);



    // Fetch desk status and usage from API (every 30 seconds)
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

                        // Store base values from API
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

        const interval = setInterval(fetchDeskStatus, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, [user, selectedDeskId]);

    // Live timer for session elapsed time
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

    // Live timer for sitting/standing time (updates every second)
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
                    // Currently sitting - add elapsed time to sitting
                    setLiveSittingSeconds(baseSittingSeconds + elapsedSinceFetch);
                    setLiveStandingSeconds(baseStandingSeconds);
                } else {
                    // Currently standing - add elapsed time to standing
                    setLiveSittingSeconds(baseSittingSeconds);
                    setLiveStandingSeconds(baseStandingSeconds + elapsedSinceFetch);
                }
            }
        };

        updateLiveTimes();
        const liveInterval = setInterval(updateLiveTimes, 1000);

        return () => clearInterval(liveInterval);
    }, [baseSittingSeconds, baseStandingSeconds, lastFetchTime, currentHeight, usageStats]);

    // Unused helper kept intentionally for future use (may be used by other flows/tests)
    function handleDeleteReservation(id) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
    }

    async function handleCheckInReservation(reservationId) {
        try {
            const config = {
                headers: { Authorization: `Bearer ${user?.token}` },
                withCredentials: true,
            };

            // Prevent user from checking into another desk if they already have an active desk
            try {
                const desksRes = await axios.get(`http://localhost:8000/api/desks/`, config);
                const existing = desksRes.data.find(d => d.current_user && String(d.current_user.id) === String(user.id) && d.current_status !== 'available');
                if (existing) {
                    toast.error('You already have an active desk. Release it before checking into another.');
                    return;
                }
            } catch (err) {
                // non-fatal, continue to attempt check-in
                console.warn('Could not verify existing desks before check-in:', err);
            }

            await axios.post(
                `http://localhost:8000/api/reservations/${reservationId}/check_in/`,
                {},
                config
            );

            toast.success("Checked in successfully");

            // Refetch session info
            setPendingDeskId(selectedDeskId);
            setVerificationModalOpen(true);

            setUpcomingReservations((prev) =>
                prev.map((r) =>
                    r.id === reservationId ? { ...r, checkedIn: true } : r
                )
            );
        } catch (err) {
            toast.error("Failed to check in", {
                description: err.response?.data?.error || err.message,
            });
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

            // Optionally refetch reservations or usage logs
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

    // Format seconds to minutes
    const sittingMinutes = Math.floor(liveSittingSeconds / 60);
    const standingMinutes = Math.floor(liveStandingSeconds / 60);

    function renderContent() {
        switch (selectedSection) {
            case "dashboard":
            default:
                return (
                    <div className="space-y-4 p-4">
                        {/* My Desk Card */}
                        <Card>
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
                                            : "No desk selected"}
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
                                            {/* Check Out button removed - release flow handles reservation cancellation now */}
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
                                                    try {
                                                        const config = {
                                                            headers: { Authorization: `Bearer ${user.token}` },
                                                            withCredentials: true,
                                                        };
                                                        // Release the desk hardware/session
                                                        await axios.post(
                                                            `http://localhost:8000/api/desks/${selectedDeskId}/release/`,
                                                            {},
                                                            config
                                                        );

                                                        // Then, attempt to find and cancel any reservation the user has for this desk
                                                        try {
                                                            const res = await axios.get(
                                                                `http://localhost:8000/api/reservations/`,
                                                                config
                                                            );
                                                            const userReservations = res.data || [];
                                                            const matching = userReservations.find(r => (r.desk_id === selectedDeskId || r.desk === selectedDeskId) && (r.status === 'confirmed' || r.status === 'active'));
                                                            if (matching) {
                                                                // Cancel the reservation on the server
                                                                await axios.post(
                                                                    `http://localhost:8000/api/reservations/${matching.id}/cancel/`,
                                                                    {},
                                                                    config
                                                                );
                                                                // Update local upcomingReservations state if present
                                                                setUpcomingReservations(prev => prev.filter(rr => rr.id !== matching.id));
                                                            }
                                                        } catch (err) {
                                                            console.warn('Failed to auto-cancel reservation after release:', err);
                                                            toast.error('Released desk but failed to cancel reservation', { description: err?.response?.data?.error || err?.message });
                                                        }

                                                        // Notify other components that reservations changed
                                                        window.dispatchEvent(new Event('reservation-updated'));

                                                        // Clear local desk/session state
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
                                                        // If the release call returns 403, inform the user and do not clear UI state
                                                        if (err?.response?.status === 403) {
                                                            toast.error('Not authorized to release this desk (403)');
                                                        }
                                                    }
                                                }}
                                                className="variant-outline"
                                                aria-label="Release desk"
                                            >
                                                Release Desk
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Upcoming Reservations Card */}
                        <Card>
                            <CardHeader className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Upcoming Reservations</CardTitle>
                                </div>
                                <button id="force-res-fetch" hidden></button>
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
                                                                    <button
                                                                        onClick={() => handleCheckInReservation(r.id)}
                                                                        className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                                                    >
                                                                        Check in
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Check-in available 30 mins before</span>
                                                            )
                                                        ) : (
                                                            <span className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-800">Checked in</span>
                                                        )}


                                                        <button
                                                            onClick={() => handleReleaseReservation(r.id)}
                                                            className="px-3 py-1 rounded-md border text-sm hover:bg-muted/50"
                                                            aria-label="Release reservation"
                                                        >
                                                            Cancel
                                                        </button>
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
                );
            case "reservations":
                return <Reservations setSelectedDeskId={setSelectedDeskId} />;
            case "hotdesk":
                return <Hotdesk setSelectedDeskId={setSelectedDeskId}/>;
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