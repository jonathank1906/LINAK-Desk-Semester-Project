import { AppSidebar } from "@/components/app-sidebar-employee";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import MyDesk from "./MyDesk";
import Reservations from "./Reservations";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function EmployeeDashboard() {
  const [selectedSection, setSelectedSection] = useState("dashboard");
  const { user } = useAuth();

  const [deskStatus, setDeskStatus] = useState(null);
  const [usageStats, setUsageStats] = useState(null);

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
    const interval = setInterval(fetchDeskStatus, 500);
    return () => clearInterval(interval);
  }, [user]);

  function renderContent() {
    switch (selectedSection) {
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {/* Top Cards */}
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              {/* Desk Status Card */}
              <Card className="animate-fade-up">
                <CardHeader className="pb-3">
                  <CardTitle className="text-2xl font-bold text-green-600">
                    {deskStatus ? `Desk #${deskStatus.desk_id}` : "Desk #--"}
                  </CardTitle>
                  <CardDescription>Current Desk Status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-lg">
                      Height: {deskStatus ? `${deskStatus.current_height}cm` : "--"}
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: {deskStatus ? deskStatus.status : "--"}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-gray-500">
                    Working for {deskStatus ? deskStatus.session_duration : "--"}
                  </p>
                </CardFooter>
              </Card>

              {/* Usage Stats Card */}
              <Card className="animate-fade-up">
                <CardHeader className="pb-3">
                  <CardTitle>Today's Usage</CardTitle>
                  <CardDescription>Standing & Sitting Time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      Sitting: {usageStats ? usageStats.sitting_time : "--"}
                    </div>
                    <div className="text-sm">
                      Standing: {usageStats ? usageStats.standing_time : "--"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {usageStats
                        ? `${usageStats.position_changes} position changes`
                        : "--"}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-green-600">
                    Currently standing {usageStats ? usageStats.current_standing : "--"}
                  </p>
                </CardFooter>
              </Card>

              {/* Health Tip Card */}
              <Card className="animate-fade-up">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-600">Health Tip</CardTitle>
                  <CardDescription>Great progress today!</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    You've met your 2-hour standing goal. Consider a 5-minute walk break.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section - Quick Actions & Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animation-delay-100 animate-fade-up">
              {/* Next Reservation */}
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-blue-800">Next Reservation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-blue-700">Today 2:00-4:00 PM</div>
                  <div className="text-sm text-blue-600">Conference Room Desk A</div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="bg-green-100 text-green-700 p-2 rounded text-sm hover:bg-green-200">
                      Go Sitting
                    </button>
                    <button className="bg-blue-100 text-blue-700 p-2 rounded text-sm hover:bg-blue-200">
                      Go Standing
                    </button>
                    <button className="bg-orange-100 text-orange-700 p-2 rounded text-sm hover:bg-orange-200">
                      Book Desk
                    </button>
                    <button className="bg-purple-100 text-purple-700 p-2 rounded text-sm hover:bg-purple-200">
                      View Health
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>This Week</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div>Total desk time: 32.5 hours</div>
                    <div>Standing time: 8.2 hours (25%)</div>
                    <div>Most productive day: Wednesday</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case "reservations":
        return <Reservations />;
      case "mydesk":
        return <MyDesk />;
      case "analytics":
        return <div className="p-4">Health & Analytics</div>;
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
      </SidebarInset>
    </SidebarProvider>
  );
}