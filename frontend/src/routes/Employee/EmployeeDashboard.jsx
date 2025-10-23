import { AppSidebar } from "@/components/app-sidebar-employee";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import MyDesk from "./MyDesk";
import Reservations from "./Reservations";
import axios from "axios";

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
  }, [user]);

  function renderContent() {
    switch (selectedSection) {
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {/* Top Cards */}
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              {/* Desk Status */}
              <div className="bg-muted/50 aspect-video rounded-xl flex flex-col items-center justify-center gap-2 p-4 animate-fade-up">
                <div className="text-2xl font-bold text-green-600">
                  {deskStatus ? `Desk #${deskStatus.desk_id}` : "Desk #--"}
                </div>
                <div className="text-lg">
                  Height: {deskStatus ? `${deskStatus.current_height}cm` : "--"}
                </div>
                <div className="text-sm text-gray-600">
                  Status: {deskStatus ? deskStatus.status : "--"}
                </div>
                <div className="text-xs text-gray-500">
                  Working for {deskStatus ? deskStatus.session_duration : "--"}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="bg-muted/50 aspect-video rounded-xl flex flex-col items-center justify-center gap-2 p-4 animate-fade-up">
                <div className="text-xl font-semibold">Today's Usage</div>
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
                <div className="text-xs text-green-600">
                  Currently standing {usageStats ? usageStats.current_standing : "--"}
                </div>
              </div>

              {/* Health Tip */}
              <div className="bg-muted/50 aspect-video rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center animate-fade-up">
                <div className="text-lg font-medium text-blue-600">Health Tip</div>
                <div className="text-sm">Great progress today!</div>
                <div className="text-xs text-gray-600">
                  You've met your 2-hour standing goal. Consider a 5-minute walk break.
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min p-6 animation-delay-100 animate-fade-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="text-sm text-gray-600">Adjusted to standing position</span>
                      <span className="text-xs text-gray-500">10:30 AM</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="text-sm text-gray-600">Lowered to sitting position</span>
                      <span className="text-xs text-gray-500">9:45 AM</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                      <span className="text-sm text-gray-600">Started work session at Desk #23</span>
                      <span className="text-xs text-gray-500">9:15 AM</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600">Yesterday: 7.5 hours total usage</span>
                      <span className="text-xs text-gray-500">Sep 19</span>
                    </div>
                  </div>
                </div>

                {/* Upcoming & Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Upcoming & Quick Actions</h3>
                  <div className="space-y-4">
                    {/* Next Reservation */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Next Reservation</h4>
                      <div className="text-sm text-blue-700">Today 2:00-4:00 PM</div>
                      <div className="text-sm text-blue-600">Conference Room Desk A</div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-medium mb-3 text-gray-600">Quick Actions</h4>
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
                    </div>

                    {/* Weekly Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 text-gray-600">This Week</h4>
                      <div className="text-sm text-gray-600">
                        <div>Total desk time: 32.5 hours</div>
                        <div>Standing time: 8.2 hours (25%)</div>
                        <div>Most productive day: Wednesday</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
