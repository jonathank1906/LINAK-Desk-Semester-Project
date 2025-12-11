"use client";

import { useAuth } from "@/contexts/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
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
  Filler,
} from "chart.js";
import { Pie, PieChart } from "recharts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [heatmapDates, setHeatmapDates] = useState([]);
  const [heatmapHours, setHeatmapHours] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  const [deskUsageWeek, setDeskUsageWeek] = useState({ labels: [], datasets: [] });
  const [deskUsageByDept, setDeskUsageByDept] = useState({ labels: [], datasets: [] });
  const [usedDesks, setUsedDesks] = useState({ labels: [], datasets: [] });
  const [systemHealth, setSystemHealth] = useState({ labels: [], datasets: [] });
  const [bookingTypes, setBookingTypes] = useState({ labels: [], datasets: [] });
  const [cancellationRate, setCancellationRate] = useState({ labels: [], datasets: [] });
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/api/admin/analytics/", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch admin analytics");
        const data = await res.json();

        if (data.heatmap) {
          setHeatmapDates(data.heatmap.dates || []);
          setHeatmapHours(data.heatmap.hours || []);
          setHeatmapData(data.heatmap.matrix || []);
        }

        if (data.desk_usage_week) {
          setDeskUsageWeek({
            labels: data.desk_usage_week.labels || [],
            datasets: [
              {
                label: "Desk Usage (hrs)",
                data: data.desk_usage_week.values || [],
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                fill: true,
                tension: 0.4,
              },
            ],
          });
        }

        if (data.desk_usage_by_department) {
          setDeskUsageByDept({
            labels: data.desk_usage_by_department.labels || [],
            datasets: [
              {
                label: "Hours",
                data: data.desk_usage_by_department.values || [],
                backgroundColor: "#6366f1",
              },
            ],
          });
        }

        if (data.used_desks) {
          setUsedDesks({
            labels: data.used_desks.labels || [],
            datasets: [
              {
                label: "Usage Count",
                data: data.used_desks.values || [],
                backgroundColor: "#22c55e",
              },
            ],
          });
        }

        if (data.system_health) {
          setSystemHealth({
            labels: data.system_health.labels || [],
            datasets: [
              {
                label: "Errors",
                data: data.system_health.values || [],
                borderColor: "#ef4444",
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                fill: true,
                tension: 0.4,
              },
            ],
          });
        }

        if (data.booking_types) {
          // Backend: index 0 = hot-desk, index 1 = reservations
          setBookingTypes({
            labels: ["Hot desk", "Reservations"],
            datasets: [
              {
                data: data.booking_types.values || [],
                backgroundColor: ["#10b981", "#6366f1"],
              },
            ],
          });
        }

        if (data.cancellation_rate) {
          setCancellationRate({
            labels: data.cancellation_rate.labels || [],
            datasets: [
              {
                label: "Cancelled",
                data: data.cancellation_rate.values || [],
                backgroundColor: "#f97316",
              },
            ],
          });
        }

        setLeaderboard(data.leaderboard || []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Could not load admin analytics.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="flex flex-col gap-6 px-6 pb-12 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View desk usage patterns and system performance metrics
          </p>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap */}
        <Card className="animate-fade-up lg:col-span-2 bg-muted/50 p-4 rounded-xl transition-transform">
          <CardHeader className="flex-shrink-0 p-0 pb-3">
            <CardTitle className="text-lg font-semibold">Desk Usage Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="text-sm w-full table-fixed" style={{ minWidth: "380px" }}>
                <thead>
                  <tr>
                    <th className="px-1 py-1 text-left w-16"></th>
                    {heatmapHours.map((h) => (
                      <th key={h} className="p-2 text-center w-12">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, dayIdx) => (
                    <tr key={dayIdx}>
                      <td className="px-1 py-1 font-semibold whitespace-nowrap w-16">{heatmapDates[dayIdx]}</td>
                      {row.map((value, colIdx) => (
                        <td key={colIdx} className="p-1 text-center w-12">
                          <div
                            className="h-6 w-6 text-center text-xs rounded-sm mx-auto"
                            style={{
                              backgroundColor: `rgba(59,130,246,${value / 100})`,
                              color: value > 0 ? "var(--foreground)" : "var(--muted-foreground)",
                              lineHeight: "1.5rem",
                            }}
                          >
                            {value}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right stacked */}
        <div className="flex flex-col gap-6">
          <Card className="animate-fade-up bg-muted/50 p-4 rounded-xl min-h-[250px]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold mb-2">Desk Usage This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <Line data={deskUsageWeek} />
            </CardContent>
          </Card>
          <Card className="animate-fade-up animation-delay-100 bg-muted/50 p-4 rounded-xl min-h-[250px]">
            <CardHeader>
              <CardTitle className="text-lg font-semibold mb-2">Desk Usage by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <Bar data={deskUsageByDept} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="animate-fade-up animation-delay-200 bg-muted/50 p-4 rounded-xl min-h-[250px]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold mb-2">Used Desks Count</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={usedDesks} />
          </CardContent>
        </Card>
        <Card className="animate-fade-up animation-delay-200 bg-muted/50 p-4 rounded-xl min-h-[250px]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold mb-2">System Health Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <Line data={systemHealth} />
          </CardContent>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="animate-fade-up animation-delay-300 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-muted/50 p-4 rounded-xl min-h-[250px]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold mb-2">Booking Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[260px]">
              <Doughnut data={bookingTypes} />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-up animation-delay-300 bg-muted/50 p-4 rounded-xl min-h-[250px]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold mb-2">Booking Cancellation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={cancellationRate} />
          </CardContent>
        </Card>

        <Card className="animate-fade-up animation-delay-300 bg-muted/50 p-4 rounded-xl min-h-[250px]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold mb-2">Power Users Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">User</th>
                  <th>Bookings</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((u, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2">{u.name}</td>
                    <td>{u.bookings}</td>
                    <td>{u.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}