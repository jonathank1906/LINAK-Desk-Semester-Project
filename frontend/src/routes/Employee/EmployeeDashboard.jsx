import { AppSidebar } from "@/components/app-sidebar-employee";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import MyDesk from "./MyDesk";
import Reservations from "./Reservations";
import PicoLab from "./PicoLab";
import Metrics from "./Metrics";
import { formatLocalYYYYMMDD, formatNiceDate } from "@/utils/date";

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

    // HELPER: Safely parse Django date strings (handles " " vs "T")
    const parseDateSafe = (dateString) => {
        if (!dateString) return new Date();
        // Django sometimes returns "YYYY-MM-DD HH:MM:SS" which JS hates. Replace space with T.
        const isoLike = dateString.replace(' ', 'T'); 
        return new Date(isoLike);
    };

    const canCheckIn = (reservation) => {
        if (!reservation.start_time) return false;
        
        // 1. Get the current time as a simple numeric timestamp (milliseconds since epoch).
        // This is always universal and prevents time zone re-interpretation issues.
        const nowMs = new Date().getTime(); 
        
        // 2. Parse the reservation start time string into a Date object.
        // It's effectively treated as UTC/Server time.
        const start = parseDateSafe(reservation.start_time);
        
        // 3. Get the reservation start time in milliseconds since epoch.
        const startMs = start.getTime(); 
        
        // Calculate the difference: (Start Time MS) - (Current Time MS)
        // A positive result means the start time is in the future.
        const diffMs = startMs - nowMs;
        const diffMins = diffMs / 1000 / 60;
        
        // Check if the difference is 15 minutes or less (including negative/past time).
        return diffMins <= 15 && diffMins >= -15 && reservation.status === "confirmed";
    };

    // Fetch user's occupied desk on login/page load
    useEffect(() => {
        if (!user) return;

        const fetchOccupiedDesk = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };
                const res = await axios.get(
                    "http://localhost:8000/api/desks/",
                    config
                );
                const occupiedDesk = res.data.find(
                    (desk) =>
                        desk.current_user &&
                        desk.current_user.id === user.id &&
                        desk.current_status !== "available"
                );
                if (occupiedDesk) {
                    setSelectedDeskId(occupiedDesk.id);
                } else {
                    setSelectedDeskId(null);
                    setSessionStartTime(null);
                }
            } catch (err) {  console.error("API error:", err);
                setSelectedDeskId(null);
                setSessionStartTime(null);
            }
        };

        fetchOccupiedDesk();
    }, [user]);

    // 🔥 Live polling reservations every 10s
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

                    // --- FIX APPLIED HERE ---
                    const startHours = String(parsedStartTime.getHours()).padStart(2, '0');
                    const startMinutes = String(parsedStartTime.getMinutes()).padStart(2, '0');
                    const endHours = String(parsedEndTime.getHours()).padStart(2, '0');
                    const endMinutes = String(parsedEndTime.getMinutes()).padStart(2, '0');

                    // ------------------------

                    return {
                        id: r.id,
                        date: formatNiceDate(parsedStartTime),
                        desk_name: r.desk_name || `Desk ${r.desk_id}`,
                        
                        start_time: `${startHours}:${startMinutes}`, // Use fixed format
                        end_time: `${endHours}:${endMinutes}`,       // Use fixed format
                        checkedIn: r.status === "active"
                    };
                });

            setUpcomingReservations(upcoming);
        } catch (err) { console.error("API error:", err);}
    };

    fetchReservations();
    const interval = setInterval(fetchReservations, 10000);

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
            } catch (err) {  console.error("API error:", err);
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

    function handleDeleteReservation(id) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
    }

    async function handleCheckInReservation(reservationId) {
    try {
        const config = {
        headers: { Authorization: `Bearer ${user?.token}` },
        withCredentials: true,
    };

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
  } catch (err) {  console.error("API error:", err);
    toast.error("Failed to check out", {
      description: err.response?.data?.error || err.message,
    });
  }
}


    function handleReleaseReservation(id) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
    }

    function goToMyDesk() {
        setSelectedSection("mydesk");
    }

    function goToReservations() {
        setSelectedSection("reservations");
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

                                        <button
                                        onClick={() => handleCheckOutReservation(usageStats?.reservation_id)}
                                        className="px-3 py-1 rounded-md bg-destructive text-white text-sm hover:opacity-90"
                                        >
                                        Check Out
                                        </button>
                                    </div>
                                    ) : null}
                                </div>

                                <div>
                                    {!selectedDeskId ? (
                                        <button
                                            onClick={goToReservations}
                                            className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                            aria-label="Select a Desk"
                                        >
                                            Select a Desk
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={async () => {
                                                    if (!selectedDeskId) return;
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
                                                        setSelectedDeskId(null);
                                                        setSessionStartTime(null);
                                                        setElapsedTime("00:00:00");
                                                        setLiveSittingSeconds(0);
                                                        setLiveStandingSeconds(0);
                                                        setBaseSittingSeconds(0);
                                                        setBaseStandingSeconds(0);
                                                        setLastFetchTime(null);
                                                    } catch (err) {  console.error("API error:", err);
                                                        console.error("Error releasing desk:", err);
                                                    }
                                                }}
                                                className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                                aria-label="Release desk"
                                            >
                                                Release
                                            </button>
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
                                                        {!r.checkedIn && canCheckIn(r) ? (
                                                        <button
                                                            onClick={() => handleCheckInReservation(r.id)}
                                                            className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                                            aria-label="Check in"
                                                        >
                                                            Check in
                                                        </button>
                                                        ) : !r.checkedIn ? (
                                                        <span className="text-xs text-muted-foreground">Check-in available 15 mins before</span>
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
                                    <div className="text-sm text-muted-foreground">No upcoming reservations</div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );
            case "reservations":
                return <Reservations setSelectedDeskId={setSelectedDeskId} />;
            case "mydesk":
                return <MyDesk selectedDeskId={selectedDeskId} />;
            case "metrics":
                return <Metrics />;
            case "pico_lab":
                return <PicoLab picoId={1} />;
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
            <AppSidebar onSectionSelect={setSelectedSection} />
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