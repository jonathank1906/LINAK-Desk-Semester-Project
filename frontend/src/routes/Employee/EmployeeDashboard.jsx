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

    // Track selected desk ID (null if none selected)
    const [selectedDeskId, setSelectedDeskId] = useState(null);
    const [deskStatus, setDeskStatus] = useState(null);
    const [usageStats, setUsageStats] = useState(null);

    // small local state for demo/upcoming reservations list
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

    // Modal state for pending verification
    const [verificationModalOpen, setVerificationModalOpen] = useState(false);
    const [pendingDeskId, setPendingDeskId] = useState(null);

    // Fetch desk status and usage only if the user is logged in and a desk is selected
    useEffect(() => {
        if (!user || !selectedDeskId) {
            setDeskStatus(null);
            setUsageStats(null);
            return;
        }

        const fetchDeskStatus = async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` },
                    withCredentials: true,
                };

                const statusRes = await axios.get(
                    `http://localhost:8000/api/desks/${selectedDeskId}/status/`,
                    config
                );
                setDeskStatus(statusRes.data);

                try {
                    const usageRes = await axios.get(
                        `http://localhost:8000/api/desks/${selectedDeskId}/usage/`,
                        config
                    );
                    setUsageStats(usageRes.data);
                } catch {
                    setUsageStats(null);
                }
            } catch (err) {
                setDeskStatus(null);
                setUsageStats(null);
            }
        };

        fetchDeskStatus();

        const interval = setInterval(fetchDeskStatus, 30000);
        return () => clearInterval(interval);
    }, [user, selectedDeskId]);

    function handleEditReservation(id) {
        // TODO: open edit modal / navigate to edit form
    }

    function handleDeleteReservation(id) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
        // TODO: call API to delete on backend
    }

    function handleCheckInReservation(id) {
        // For demo, use the selected deskId if available
        setPendingDeskId(selectedDeskId);
        setVerificationModalOpen(true);

        setUpcomingReservations((prev) =>
            prev.map((r) => (r.id === id ? { ...r, checkedIn: true } : r))
        );
        // TODO: call backend API to record check-in
    }

    function handleReleaseReservation(id) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== id));
        // TODO: call backend API to release/cancel the reservation
    }

    function goToMyDesk() {
        setSelectedSection("mydesk");
    }

    function goToReservations() {
        setSelectedSection("reservations");
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
                            </CardHeader>

                            <CardContent className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-sm font-medium">
                                        {selectedDeskId
                                            ? deskStatus?.name ?? `Desk #${selectedDeskId}`
                                            : "No desk selected"}
                                    </div>
                                    {selectedDeskId && usageStats ? (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Current usage: {usageStats.usageMinutes ?? "—"} mins
                                        </div>
                                    ) : null}
                                    {selectedDeskId && usageStats ? (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Time remaining: {usageStats.usageMinutes ?? "—"} mins
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
                                                className="px-3 py-1 rounded-md bg-primary text-white text-sm hover:opacity-90"
                                                aria-label="Select a Desk"
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