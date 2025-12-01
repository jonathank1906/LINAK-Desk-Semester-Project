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
import UserManagement from "./UserManagement";
import AnalyticsPage from "./AnalyticsPage"
import axios from "axios"; 
import LogsViewer from "./LogsViewer";
import ReportModal from "@/components/ReportModal";


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
  const [reports, setReports] = useState([]);
  const [showReportModal, setShowReportModal] = useState(false);


useEffect(() => {
  async function fetchReports() {
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true, // 🔥 Include cookies
      };
      const res = await axios.get("http://localhost:8000/api/reports/", config);
      setReports(res.data);
    } catch (err) {
      console.error("📛 Failed to fetch reports:", err?.response || err);
    }
  }

  fetchReports();
  const interval = setInterval(fetchReports, 5000);
  return () => clearInterval(interval);
}, [user]);


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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  function renderContent() {
    switch (selectedSection) {
      case "users":
        return <UserManagement />;
      case "analytics":
        return <AnalyticsPage />;
      case "logs":
        return <LogsViewer />;
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
            {/* TOP ROW: SYSTEM STATUS + METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <SystemStatusCard status={metrics.system_status} />
              <div className="grid grid-cols-3 gap-4">
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
                  
              <div className="bg-muted/50 rounded-xl p-4 hover:scale-105 transition-transform">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">Desk Reports</h3>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="text-white bg-blue-400 text-xs px-3 py-1 rounded shadow hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                  >
                    View All
                  </button>
                </div>
                <ul className="text-sm divide-y divide-gray-300 dark:divide-gray-700"> 
                  {reports.slice(0, 5).length === 0 ? (
                    <p className="text-gray-500 italic pt-2">No new reports</p>
                  ) : (
                    reports.slice(0, 5).map((r, i) => (
                      <li key={i} className="py-2 first:pt-0 last:pb-0"> {/* Use padding for vertical separation */}
                        <div className="flex flex-col">
                          {/* Header with User and Timestamp */}
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex justify-between items-center">
                            <span>{r.user}</span>
                            <span className="text-gray-500 dark:text-gray-400 font-normal">
                              {r.created_at}
                            </span>
                          </div>
                          {/* Report Message/Content */}
                          <p className="mt-1 text-sm text-gray-900 dark:text-white line-clamp-2">
                            {r.message}
                          </p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>

              </div>

              {showReportModal && (
                <ReportModal user={user} onClose={() => setShowReportModal(false)} />
              )}

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
