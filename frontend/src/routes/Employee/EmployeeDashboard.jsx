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
          <div>
          </div>
        );
      case "reservations":
        return <Reservations />;
      case "mydesk":
        return <MyDesk />;
      case "metrics":
        return <Metrics />;
      case "pico_lab":
        return <PicoLab picoId={1}/>;
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