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
import { Button } from "@/components/ui/button";

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

  const fetchReports = async () => {
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
  };

  useEffect(() => {
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
          <div className="flex flex-1 flex-col gap-6 px-6 pb-12 pt-4">
            {/* TOP ROW: SYSTEM STATUS + DESK REPORTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <Card
                className={`animate-fade-up rounded-xl p-6 flex flex-col justify-center text-white shadow-sm transition-transform bg-gradient-to-r ${metrics.system_status === "operational"
                  ? "from-green-500 to-green-400"
                  : "from-red-500 to-red-400"
                  }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-base font-semibold">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-3">
                    {metrics.system_status === "operational" ? (
                      <IconCheck size={24} />
                    ) : (
                      <IconAlertCircle size={24} />
                    )}
                    {metrics.system_status === "operational"
                      ? "All systems operational"
                      : "System issues detected"}
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-fade-up bg-muted/50 rounded-xl p-4 transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Desk Reports</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4">
                    {reports.length > 0 ? (
                      <IconAlertCircle size={40} className="text-red-500" />
                    ) : (
                      <IconCheck size={40} className="text-emerald-500" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        Open reports
                      </span>
                      <span className="text-2xl font-bold">{reports.length}</span>
                    </div>
                  </div>
                  {reports.length > 0 && (
                    <ul className="text-sm space-y-2 max-h-40 overflow-hidden pr-1 mb-4">
                      {reports.slice(0, 2).map((r, i) => (
                        <li key={i} className="flex items-start gap-3 py-2 first:pt-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-gray-700 dark:text-gray-300 truncate">
                                {r.user}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                                {r.created_at}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Desk: <span className="font-medium text-foreground">{r.desk || 'Unknown'}</span>
                            </div>
                            <span className="text-muted-foreground text-xs block truncate">
                              {r.message}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  {reports.length > 0 && (
                    <Button
                      onClick={() => setShowReportModal(true)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View & Resolve All
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="animate-fade-up">
                <CardHeader className="flex flex-row items-center gap-4">
                  <span><IconUsers size={32} /></span>
                  <CardTitle className="text-lg">Total Active Users</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[30px]">
                  <span className="text-3xl font-bold">{metrics.active_users}</span>
                </CardContent>
              </Card>
              <Card className="animate-fade-up">
                <CardHeader className="flex flex-row items-center gap-4">
                  <span><IconDesk size={32} /></span>
                  <CardTitle className="text-lg">Available Desks</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[30px]">
                  <span className="text-3xl font-bold">{metrics.available_desks}</span>
                </CardContent>
              </Card>
              <Card className="animate-fade-up">
                <CardHeader className="flex flex-row items-center gap-4">
                  <span><IconDesk size={32} /></span>
                  <CardTitle className="text-lg">Desks In Use Online</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center min-h-[30px]">
                  <span className="text-3xl font-bold">{metrics.desks_in_use_online}</span>
                </CardContent>
              </Card>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="animate-fade-up animation-delay-100 bg-muted/50 min-h-[250px] transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Today's Hourly Desk Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <Line data={hourlyUtilizationData} />
                </CardContent>
              </Card>
              <Card className="animate-fade-up animation-delay-100 bg-muted/50 rounded-xl p-4 transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Bookings</CardTitle>
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

            </div>

            {/* BOTTOM ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="animate-fade-up animation-delay-200 bg-muted/50 min-h-[250px] transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Active Users by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bar data={activeUsersByDeptData} />
                </CardContent>
              </Card>

              <Card className="animate-fade-up animation-delay-200 bg-muted/50 min-h-[250px] transition-transform">
                <CardHeader>
                  <CardTitle className="text-lg">Today's Booking Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bar data={todayBookingTimelineData} />
                </CardContent>
              </Card>
            </div>

            {showReportModal && (
              <ReportModal 
                user={user} 
                onClose={() => setShowReportModal(false)}
                onReportsResolved={fetchReports}
              />
            )}
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
      <SidebarInset className="overflow-x-hidden min-w-0">
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