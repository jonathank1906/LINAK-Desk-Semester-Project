import { AppSidebar } from "@/components/app-sidebar-admin";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { useAuth } from "@/contexts/useAuth";
import { useEffect, useState } from "react";
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
  const { user } = useAuth();

  // Dashboard metrics and charts from backend
  const [metrics, setMetrics] = useState({
    total_users: 0,
    active_users: 0,
    available_desks: 0,
    desks_in_use_online: 0,
    system_status: "operational",
  });

  const [hourlyUtilizationData, setHourlyUtilizationData] = useState({
    labels: [],
    datasets: [],
  });

  const [activeUsersByDeptData, setActiveUsersByDeptData] = useState({
    labels: [],
    datasets: [],
  });

  const [todayBookingTimelineData, setTodayBookingTimelineData] = useState({
    labels: [],
    datasets: [],
  });

  const [recentBookings, setRecentBookings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const openComplaintsCount = complaints.filter((c) => c.status !== "solved").length;
  const hasOpenComplaints = openComplaintsCount > 0;

  useEffect(() => {
    const fetchDashboardAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/api/admin/dashboard/", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load admin dashboard analytics");
        const data = await res.json();

        setMetrics({
          total_users: data.total_users ?? 0,
          active_users: data.active_users ?? 0,
          available_desks: data.available_desks ?? 0,
          desks_in_use_online: data.desks_in_use_online ?? 0,
          system_status: data.system_status ?? "operational",
        });

        if (data.hourly_utilization) {
          setHourlyUtilizationData({
            labels: data.hourly_utilization.labels || [],
            datasets: [
              {
                label: "Utilization %",
                data: data.hourly_utilization.values || [],
                borderColor: "#22d3ee",
                backgroundColor: "#22d3ee",
                tension: 0.4,
                fill: false,
              },
            ],
          });
        }

        if (data.active_users_by_department) {
          const labels = data.active_users_by_department.map((d) => d.department);
          const values = data.active_users_by_department.map((d) => d.active_users);
          setActiveUsersByDeptData({
            labels,
            datasets: [
              {
                label: "Active Users",
                data: values,
                backgroundColor: "#6366f1",
              },
            ],
          });
        }

        if (data.today_bookings_timeline) {
          setTodayBookingTimelineData({
            labels: data.today_bookings_timeline.labels || [],
            datasets: [
              {
                label: "Bookings",
                data: data.today_bookings_timeline.values || [],
                backgroundColor: "#10b981",
              },
            ],
          });
        }

        setRecentBookings(data.recent_bookings || []);
        setComplaints(data.complaints || []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Could not load admin dashboard analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardAnalytics();
  }, []);

  const handleSolveComplaint = async (complaintId) => {
    if (!complaintId) return;
    try {
      const res = await fetch(
        `http://localhost:8000/api/admin/complaints/${complaintId}/solve/`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to mark complaint as solved");
      const updated = await res.json();
      setComplaints((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    } catch (err) {
      console.error(err);
      setError("Could not update complaint status.");
    }
  };

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
            {/* SYSTEM STATUS + COMPLAINTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <SystemStatusCard status={metrics.system_status} />

              <div className="bg-muted/50 rounded-xl p-4 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Complaints and Reports</h3>
                  <div className="flex items-center gap-2 mb-4">
                    {hasOpenComplaints ? (
                      <IconAlertCircle size={40} className="text-red-500" />
                    ) : (
                      <IconCheck size={40} className="text-emerald-500" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Open complaints
                      </span>
                      <span className="text-2xl font-bold">{openComplaintsCount}</span>
                    </div>
                  </div>
                </div>
                <ul className="text-sm space-y-2 max-h-40 overflow-y-auto overflow-x-hidden pr-1">
                  {complaints.map((c) => (
                    <li
                      key={c.id ?? c.note}
                      className="flex items-start gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium block break-words">
                          {c.user_display || c.user}
                        </span>
                        <span className="text-muted-foreground text-xs break-words">
                          {c.message || c.note}
                        </span>
                      </div>
                      {c.status === "solved" ? (
                        <span className="text-xs text-emerald-500 flex items-center gap-1 whitespace-nowrap self-start">
                          <IconCheck size={14} /> Solved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSolveComplaint(c.id)}
                          className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap self-start"
                        >
                          Mark solved
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* TOP METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card
                title="Total Active Users"
                icon={<IconUsers size={32} />}
                value={metrics.active_users}
              />
              <Card
                title="Available Desks"
                icon={<IconDesk size={32} />}
                value={metrics.available_desks}
              />
              <Card
                title="Desks In Use Online"
                icon={<IconDesk size={32} />}
                value={metrics.desks_in_use_online}
              />
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
              <div className="bg-muted/50 rounded-xl p-4 hover:scale-[1.01] transition-transform">
                <h3 className="text-lg font-semibold mb-2">Recent Bookings</h3>
                <ul className="text-sm space-y-2 pr-1">
                  {recentBookings.map((b, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-teal-400">●</span>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{b.user} - {b.desk}</span>
                          <span className="text-xs text-muted-foreground">
                            {b.type === "hotdesk" ? "Hot desk" : "Reservation"}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                  {recentBookings.length === 0 && (
                    <li className="text-sm text-muted-foreground">No recent bookings</li>
                  )}
                </ul>
              </div>

              <ChartCard title="Today's Booking Timeline">
                <Bar data={todayBookingTimelineData} />
              </ChartCard>

              <div className="bg-muted/50 rounded-xl p-4 flex flex-col justify-center hover:scale-[1.01] transition-transform">
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
    <div className="bg-muted/50 p-4 rounded-xl flex items-center gap-4 shadow-sm hover:scale-[1.03] transition-transform">
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
    <div
      className={`rounded-xl p-4 flex flex-col justify-center text-white shadow-sm hover:scale-[1.02] transition-transform ${
        isOperational ? "bg-green-500" : "bg-red-500"
      }`}
    >
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
    <div className="bg-muted/50 p-4 rounded-xl min-h-[250px] hover:scale-[1.01] transition-transform">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
