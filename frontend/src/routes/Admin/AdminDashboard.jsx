import { AppSidebar } from "@/components/app-sidebar-admin";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useAuth } from "@/contexts/useAuth";
import { useState, useEffect } from "react";
import { getDashboardActiveUsers, getDashboardAvailableDesks, getDashboardDesksInUse } from "@/endpoints/api";
import UserManagement from "./UserManagement";
import AnalyticsPage from "./AnalyticsPage"


import {
  IconUsers,
  IconDesk,
  IconClock,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";

import {
  Line,
  Bar,
  Doughnut,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [selectedSection, setSelectedSection] = useState("dashboard");
  const [activeUsers, setActiveUsers] = useState(0);
  const [availableDesks, setAvailableDesks] = useState(0);
  const [desksInUse, setDesksInUse] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Fetch dashboard data when component mounts
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all dashboard metrics in parallel
        const [activeUsersData, availableDesksData, desksInUseData] = await Promise.all([
          getDashboardActiveUsers(),
          getDashboardAvailableDesks(),
          getDashboardDesksInUse()
        ]);
        
        setActiveUsers(activeUsersData.active_users);
        setAvailableDesks(availableDesksData.available_desks);
        setDesksInUse(desksInUseData.desks_in_use);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

 const hourlyUtilizationData = {
  labels: ["6AM","7AM","8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM"],
  datasets: [
    {
      label: "Utilization %",
      data: [20, 35, 50, 55, 65, 60, 70, 68, 62, 58],
      borderColor: "#22d3ee",
      backgroundColor: "#22d3ee",
      tension: 0.4,
      fill: false,
    },
  ],
};


  const activeUsersByDeptData = {
    labels: ["Engineering", "Design", "Marketing", "HR", "Finance"],
    datasets: [
      {
        label: "Active Users",
        data: [10, 5, 8, 3, 4],
        backgroundColor: "#6366f1",
      },
    ],
  };

  const todayBookingTimelineData = {
    labels: ["8AM", "10AM", "12PM", "2PM", "4PM", "6PM"],
    datasets: [
      {
        label: "Bookings",
        data: [2, 4, 3, 6, 2, 1],
        backgroundColor: "#10b981",
      },
    ],
  };

  const recentBookings = [
    { user: "Daniils", desk: "Desk 5" },
    { user: "Jonathan", desk: "Desk 3" },
    { user: "Lukas", desk: "Desk 12" },
    { user: "Benjamin", desk: "Desk 3" },
  ];
  const complains = [
    { user: "Daniils", note: "Desk 5 is slow and problematic" },
    { user: "Benjamin", note: "I accidentally broke something, oh no!" },
  ];

  function renderContent() {
    switch (selectedSection) {
      case "users":
        return <UserManagement />;
      case "analytics":
        return <AnalyticsPage />;
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
            {/* TOP METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card 
                title="Total Active Users" 
                icon={<IconUsers size={36} />} 
                value={loading ? "..." : error ? "Error" : activeUsers.toString()} 
              />
              <Card 
                title="Available Desks" 
                icon={<IconDesk size={36} />} 
                value={loading ? "..." : error ? "Error" : availableDesks.toString()} 
              />
              <Card 
                title="Desks In Use Online" 
                icon={<IconDesk size={36} />} 
                value={loading ? "..." : error ? "Error" : desksInUse.toString()} 
              />
              <SystemStatusCard status="operational" />
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="Today's Hourly Desk Utilization">
                <Line data={hourlyUtilizationData} />
              </ChartCard>


              <ChartCard title="Active Users by Department">
                <Bar data={activeUsersByDeptData} />
              </ChartCard>
            </div>

            {/* BOTTOM ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-muted/50 rounded-xl p-4 hover:scale-105 transition-transform">
                <h3 className="text-lg font-semibold mb-2">Recent Bookings</h3>
                <ul className="text-sm space-y-2">
                  {recentBookings.map((b, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-teal-400">●</span> {b.user} - {b.desk}
                    </li>
                  ))}
                </ul>
              </div>

              <ChartCard title="Today's Booking Timeline">
                <Bar data={todayBookingTimelineData} />
              </ChartCard>
                  
               <div className="bg-muted/50 rounded-xl p-4 hover:scale-105 transition-transform">
                <h3 className="text-lg font-semibold mb-2">Complains and Report</h3>
                <div className="flex items-center gap-2 mb-2">
                  <IconAlertCircle size={60} className="text-red-500" />
                  <span className="text-xl font-bold">{complains.length}</span>
                </div>
                <ul className="text-sm space-y-2">
                  {complains.map((b, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-teal-400">●</span> {b.user} - {b.note}
                    </li>
                  ))}
                </ul>
              </div>

              
              
            </div>
          </div>
        );
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
      <AppSidebar onSectionSelect={setSelectedSection} activeSection={selectedSection} />
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

function Card({ title, icon, value }) {
  return (
    <div className="bg-muted/50 p-4 rounded-xl flex items-center gap-4 hover:scale-105 transition-transform aspect-video">
      {icon}
      <div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function SystemStatusCard({ status = "operational" }) {
  const isOperational = status === "operational";
  return (
    <div className={`rounded-xl aspect-video p-4 flex flex-col justify-center hover:scale-105 transition-transform text-white ${isOperational ? "bg-green-500" : "bg-red-500"}`}>
      <div className="text-sm font-semibold">System Status</div>
      <div className="text-xl font-bold flex items-center gap-2">
        {isOperational ? <IconCheck size={20} /> : <IconAlertCircle size={20} />}
        {isOperational ? "All systems operational" : "System issues detected"}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-muted/50 p-4 rounded-xl hover:scale-105 transition-transform min-h-[250px]">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
