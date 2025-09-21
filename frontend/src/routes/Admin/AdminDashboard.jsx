import { AppSidebar } from "@/components/app-sidebar-admin"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"
import { NavUser } from "@/components/nav-user"
import { useState } from "react"
import UserManagement from "./UserManagement" 
import { useAuth } from "@/contexts/useAuth" 
import {
  IconUsers,
  IconDesk,
  IconClock,
} from "@tabler/icons-react"


export default function AdminDashboard() {
  const [selectedSection, setSelectedSection] = useState("dashboard")
  const { user } = useAuth() 

  function renderContent() {
    switch (selectedSection) {
      case "users":
        return <UserManagement />
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="grid auto-rows-min gap-4 md:grid-cols-3">
              <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center gap-4">
                <IconUsers className="text-primary" size={40} />
                <div>
                  <div className="text-lg font-semibold">Total Users</div>
                  <div className="text-3xl font-bold">123</div>
                </div>
              </div>
              <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center gap-4">
                <IconDesk className="text-primary" size={40} />
                <div>
                  <div className="text-lg font-semibold">Desks Currently in Use</div>
                  <div className="text-3xl font-bold">42</div>
                </div>
              </div>
              <div className="bg-muted/50 aspect-video rounded-xl flex items-center justify-center gap-4">
                <IconClock className="text-primary" size={40} />
                <div>
                  <div className="text-lg font-semibold">Average Standing Time</div>
                  <div className="text-3xl font-bold">3.5 hrs</div>
                </div>
              </div>
            </div>
            <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
          </div>
        )
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