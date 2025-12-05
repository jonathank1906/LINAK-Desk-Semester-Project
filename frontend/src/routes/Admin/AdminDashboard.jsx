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
import AnalyticsPage from "./AnalyticsPage";
import Automate from "./Automate";
import DeskManagement from "./DeskManagement";
import axios from "axios";
import LogsViewer from "./LogsViewer";
import ReportModal from "@/components/ReportModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
          withCredentials: true,
        };
        const res = await axios.get("http://localhost:8000/api/reports/", config);
        setReports(res.data);
      } catch (err) {
        console.error("Failed to fetch reports:", err?.response || err);
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
      case "automate":
        return <Automate />;
      case "desks":
        return <DeskManagement />;
      case "dashboard":
      default:
        return (
          <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
            {/* TOP ROW: SYSTEM STATUS + METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <Card
                className={`animate-fade-up rounded-xl p-4 flex flex-col justify-center text-white shadow-sm transition-transform bg-gradient-to-r ${metrics.system_status === "operational"
                    ? "from-green-500 to-green-400"
                    : "from-red-500 to-red-400"
                  }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm font-semibold">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold flex items-center gap-2">
                    {metrics.system_status === "operational" ? (
                      <IconCheck size={20} />
                    ) : (
                      <IconAlertCircle size={20} />
                    )}
                    {metrics.system_status === "operational"
                      ? "All systems operational"
                      : "System issues detected"}
                  </div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-3 gap-4">
                <Card className="animate-fade-up">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <span className="text-sky-400"><IconUsers size={32} /></span>
                    <CardTitle>Total Active Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-3xl font-bold">{metrics.active_users}</span>
                  </CardContent>
                </Card>
                <Card className="animate-fade-up">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <span className="text-green-400"><IconDesk size={32} /></span>
                    <CardTitle>Available Desks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-3xl font-bold">{metrics.available_desks}</span>
                  </CardContent>
                </Card>
                <Card className="animate-fade-up">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <span className="text-indigo-400"><IconDesk size={32} /></span>
                    <CardTitle>Desks In Use Online</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <span className="text-3xl font-bold">{metrics.desks_in_use_online}</span>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="animate-fade-up animation-delay-100 bg-muted/50 min-h-[250px] transition-transform">
                <CardHeader>
                  <CardTitle>Today's Hourly Desk Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <Line data={hourlyUtilizationData} />
                </CardContent>
              </Card>
              <Card className="animate-fade-up animation-delay-100 bg-muted/50 min-h-[250px] transition-transform">
                <CardHeader>
                  <CardTitle>Active Users by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bar data={activeUsersByDeptData} />
                </CardContent>
              </Card>
            </div>

            {/* BOTTOM ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="animate-fade-up animation-delay-200 bg-muted/50 rounded-xl p-4 transition-transform">
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>

              <Card className="animate-fade-up animation-delay-200 bg-muted/50 min-h-[250px] transition-transform">
                <CardHeader>
                  <CardTitle>Today's Booking Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bar data={todayBookingTimelineData} />
                </CardContent>
              </Card>

              <Card className="animate-fade-up animation-delay-200 bg-muted/50 rounded-xl p-4 transition-transform">
                <CardHeader className="flex justify-between items-center mb-2">
                  <CardTitle>Desk Reports</CardTitle>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="text-white bg-blue-400 text-xs px-3 py-1 rounded shadow hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
                  >
                    View All
                  </button>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm divide-y divide-gray-300 dark:divide-gray-700">
                    {reports.slice(0, 5).length === 0 ? (
                      <p className="text-gray-500 italic pt-2">No new reports</p>
                    ) : (
                      reports.slice(0, 5).map((r, i) => (
                        <li key={i} className="py-2 first:pt-0 last:pb-0">
                          <div className="flex flex-col">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex justify-between items-center">
                              <span>{r.user}</span>
                              <span className="text-gray-500 dark:text-gray-400 font-normal">
                                {r.created_at}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-900 dark:text-white line-clamp-2">
                              {r.message}
                            </p>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </CardContent>
              </Card>

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