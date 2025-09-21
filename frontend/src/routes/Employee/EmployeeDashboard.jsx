import { AppSidebar } from "@/components/app-sidebar-employee"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { NavUser } from "@/components/nav-user"
import { useState } from "react"
import { useAuth } from "@/contexts/useAuth" 

export default function EmployeeDashboard() {
  const [selectedSection, setSelectedSection] = useState("dashboard")
  const { user } = useAuth() 

  function renderContent() {
    switch (selectedSection) {
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">

              {/* Current Desk Status Card */}
              <div className="bg-muted/50 aspect-video rounded-xl flex flex-col items-center justify-center gap-2 p-4">
                <div className="text-2xl font-bold text-green-600">Desk #23</div>
                <div className="text-lg">Height: 110cm</div>
                <div className="text-sm text-gray-600">Status: Standing</div>
                <div className="text-xs text-gray-500">Working for 2h 15min</div>
              </div>

              {/* Today's Usage Stats */}
              <div className="bg-muted/50 aspect-video rounded-xl flex flex-col items-center justify-center gap-2 p-4">
                <div className="text-xl font-semibold">Today's Usage</div>
                <div className="text-sm">Sitting: 4h 32min</div>
                <div className="text-sm">Standing: 1h 28min</div>
                <div className="text-xs text-gray-500">8 position changes</div>
                <div className="text-xs text-green-600">Currently standing 23min</div>
              </div>

              {/* Health Recommendation */}
              <div className="bg-muted/50 aspect-video rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center">
                <div className="text-lg font-medium text-blue-600">Health Tip</div>
                <div className="text-sm">Great progress today!</div>
                <div className="text-xs text-gray-600">You've met your 2-hour standing goal. Consider a 5-minute walk break.</div>
              </div>

            </div>

            {/* Bottom Large Section */}
            <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">

                {/* Recent Activity Timeline */}
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

                {/* Upcoming Reservations & Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Upcoming & Quick Actions</h3>
                  <div className="space-y-4">

                    {/* Upcoming Reservations */}
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
        )
      case "reservations":
        return <div className="p-4">Reservations</div>
      case "mydesk":
        return <div className="p-4">My Desk</div>
      case "analytics":
        return <div className="p-4">Health & Analytics</div>
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
  )
}