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

    const [upcomingReservations, setUpcomingReservations] = useState([
        {
            id: 1,
            date: "Tuesday, November 9, 2021",
            desk_name: "Desk XXXX",
            start_time: "09:00",
            end_time: "12:00",
        },
        {
            id: 2,
            date: "Thursday, November 11, 2021",
            desk_name: "Desk YYYY",
            start_time: "13:00",
            end_time: "17:00",
        },
    ]);

    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [pendingDeskId, setPendingDeskId] = useState(null);

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
            } catch (err) {
                setSelectedDeskId(null);
                setSessionStartTime(null);
            }
        };

        fetchOccupiedDesk();
    }, [user]);

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

    function handleEditReservation(id) {
        // TODO: open edit modal / navigate to edit form
    }

    function handleDeleteReservation(id) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
    }

    function handleCheckInReservation(id) {
        setPendingDeskId(selectedDeskId);
        setVerificationModalOpen(true);

        setUpcomingReservations((prev) =>
            prev.map((r) => (r.id === id ? { ...r, checkedIn: true } : r))
        );
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
                                        <div className="text-xs text-muted-foreground mt-1">
                                            <span className="font-semibold">
                                                {sittingMinutes}m sitting
                                            </span>
                                            {" | "}
                                            <span className="font-semibold">
                                                {standingMinutes}m standing
                                            </span>
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
                                                    } catch (err) {
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
                                                            <button
                                                                onClick={() => handleCheckInReservation(r.id)}
                                                                className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                                                aria-label="Check in"
                                                            >
                                                                Check in
                                                            </button>
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