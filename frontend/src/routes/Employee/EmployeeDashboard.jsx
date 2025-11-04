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

    const [deskStatus, setDeskStatus] = useState(null);
    const [usageStats, setUsageStats] = useState(null);

    // small local state for demo/upcoming reservations list
    const [upcomingReservations, setUpcomingReservations] = useState([
        {
            id: 1,
            date: "Tuesday, November 9, 2021",
            location: "A3 · Floor 1, HQ San Francisco",
        },
        {
            id: 2,
            date: "Thursday, November 11, 2021",
            location: "A10 · Floor 1, HQ San Francisco",
        },
    ]);

    // Modal state for pending verification
    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [pendingDeskId, setPendingDeskId] = useState(null);

    // Fetch desk status and usage only if the user is logged in
    useEffect(() => {
        if (!user) return;

        const fetchDeskStatus = async () => {
            try {
                const deskId = 1;
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };

                const statusRes = await axios.get(
                    `http://localhost:8000/api/desks/${deskId}/status/`,
                    config
                );
                setDeskStatus(statusRes.data);

                // Optional: separate try/catch so one failing API doesn't break the other
                try {
                    const usageRes = await axios.get(
                        `http://localhost:8000/api/desks/${deskId}/usage/`,
                        config
                    );
                    setUsageStats(usageRes.data);
                } catch {
                    setUsageStats(null);
                }
            } catch (err) {
                console.warn("Error fetching desk data:", err);
                setDeskStatus(null);
                setUsageStats(null);
            }
        };

        fetchDeskStatus();

        // Poll every 500ms for live updates (same as MyDesk)
        const interval = setInterval(fetchDeskStatus, 30000);
        return () => clearInterval(interval);
    }, [user]);

    function handleEditReservation(id) {
        console.log("edit reservation", id);
        // TODO: open edit modal / navigate to edit form
    }

    function handleDeleteReservation(id) {
        console.log("delete reservation", id);
        // simple local delete for UI demo
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
        // TODO: call API to delete on backend
    }

    function handleCheckInReservation(id) {
        console.log("checkin reservation", id);
        // For demo, use deskId 1, or you can map reservation to deskId if available
        setPendingDeskId(1);
        setVerificationModalOpen(true);

        // mark checked-in locally for UI demo
        setUpcomingReservations((prev) =>
            prev.map((r) => (r.id === id ? { ...r, checkedIn: true } : r))
        );
        // TODO: call backend API to record check-in
    }

    function handleReleaseReservation(id) {
        console.log("release reservation", id);
        // remove from upcoming list locally for demo (simulate release)
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
        // TODO: call backend API to release/cancel the reservation
    }

    function goToMyDesk() {
        setSelectedSection("mydesk");
    }

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

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            aria-label="My desk options"
                                            className="p-1 rounded-md hover:bg-muted/50"
                                        >
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => goToMyDesk()}>
                                            Open My Desk
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => console.log("desk settings")}>
                                            Desk settings
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>

                            <CardContent className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-sm font-medium">
                                        {deskStatus?.name ?? "No desk selected or assigned"}
                                    </div>
                                   
                                    {usageStats ? (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Usage: {usageStats.usageMinutes ?? "—"} mins
                                        </div>
                                    ) : null}
                                </div>

                                <div>
                                    <button
                                        onClick={goToMyDesk}
                                        className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                        aria-label="Go to My Desk"
                                    >
                                        Hotdesk Now
                                    </button>
                                     <button
                                        onClick={goToMyDesk}
                                        className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                        aria-label="Go to My Desk"
                                    >
                                        Reserve
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Upcoming Reservations Card */}
                        <Card>
                            <CardHeader className="flex items-start justify-between">
                                <div>
                                    <CardTitle>Upcoming Reservations</CardTitle>
                                    <CardDescription className="text-muted-foreground">
                                        Next bookings assigned to you
                                    </CardDescription>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            aria-label="More"
                                            className="p-1 rounded-md hover:bg-muted/50"
                                        >
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            onClick={() => console.log("open manage reservations")}
                                        >
                                            Manage reservations
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => setUpcomingReservations([])}
                                        >
                                            Clear all
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </CardHeader>

                            <CardContent className="grid gap-3">
                                {upcomingReservations.length ? (
                                    upcomingReservations.map((r, idx) => (
                                        <div
                                            key={r.id}
                                            className="flex items-center justify-between rounded-md border p-3"
                                        >
                                            <div>
                                                <div className="text-sm font-medium">{r.date}</div>
                                                <div className="text-xs text-muted-foreground">{r.location}</div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Topmost reservation gets Check-in + Release */}
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
                                                            Release
                                                        </button>
                                                    </>
                                                ) : null}

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-1 rounded-md hover:bg-muted/50">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditReservation(r.id)}>
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDeleteReservation(r.id)}>
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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
                return <Reservations />;
            case "mydesk":
                return <MyDesk />;
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