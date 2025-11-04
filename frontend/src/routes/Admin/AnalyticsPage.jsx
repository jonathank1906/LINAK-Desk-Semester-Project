"use client";

import { useAuth } from "@/contexts/useAuth";
import { ModeToggle } from "@/components/mode-toggle";
import { NavUser } from "@/components/nav-user";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

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

  // Mock Data
 const weekDates = [
  "Nov 1", "Nov 2", "Nov 3", "Nov 4", "Nov 5", "Nov 6", "Nov 7", 
  "Nov 8", "Nov 9", "Nov 10", "Nov 11", "Nov 12"
];

const hours = [
  "6AM", "7AM", "8AM", "9AM", "10AM", "11AM", "12PM", "1PM", 
  "2PM", "3PM", "4PM", "5PM", "6PM"
];

  const heatmapData = weekDates.map(() =>
    hours.map(() => Math.floor(Math.random() * 100))
  );

  const deskUsageWeek = {
    labels: weekDates,
    datasets: [
      {
        label: "Desk Usage (hrs)",
        data: [12, 18, 10, 22, 15, 10, 10, 18, 20, 13, 8, 4],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const deskUsageByDept = {
    labels: ["Engineering", "Marketing", "Design", "HR"],
    datasets: [
      {
        label: "Hours",
        data: [210, 160, 130, 90],
        backgroundColor: "#6366f1",
      },
    ],
  };

  const usedDesks = {
    labels: Array.from({ length: 24 }, (_, i) => `Desk ${i + 1}`),
    datasets: [
      {
        label: "Usage Count",
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 12)),
        backgroundColor: "#22c55e",
      },
    ],
  };

  const systemHealth = {
    labels: ["Nov 1", "Nov 2", "Nov 3", "Nov 4", "Nov 5", "Nov 6"],
    datasets: [
      {
        label: "Errors",
        data: [1, 0, 2, 1, 0, 3],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const bookingTypes = {
    labels: ["Ad-hoc", "Recurring"],
    datasets: [
      {
        data: [65, 35],
        backgroundColor: ["#10b981", "#6366f1"],
      },
    ],
  };

  const cancellationRate = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Cancelled",
        data: [4, 6, 3, 7],
        backgroundColor: "#f97316",
      },
    ],
  };

  const leaderboard = [
    { name: "Alice Smith", hours: 40, bookings: 22 },
    { name: "Bob Johnson", hours: 36, bookings: 20 },
    { name: "Carol Williams", hours: 33, bookings: 18 },
  ];

  return (
    <>
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50">
        <div className="flex items-center gap-3">
          <ModeToggle />
          <NavUser user={user} />
        </div>
      </div>

      <SidebarInset>
        <header className="relative flex h-16 items-center gap-2 px-4">
          <h1 className="text-2xl font-bold">Analytics</h1>
        </header>

        <div className="flex flex-col gap-6 px-6 pb-12 pt-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Heatmap (larger) */}
            <div className="lg:col-span-2 bg-muted/50 p-4 rounded-lg shadow hover:scale-[1.01] transition">
              <h2 className="text-lg font-semibold mb-3">Desk Usage Heatmap</h2>
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr>
                      <th className="p-2"></th>
                      {hours.map((h) => (
                        <th key={h} className="p-2 text-center">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmapData.map((row, dayIdx) => (
                      <tr key={dayIdx}>
                        <td className="p-2 font-semibold">{weekDates[dayIdx]}</td>
                        {row.map((value, colIdx) => (
                          <td key={colIdx} className="p-1">
                            <div
                              className="h-6 w-6 text-center text-xs rounded-sm"
                              style={{
                                backgroundColor: `rgba(59,130,246,${value / 100})`,
                                color: value > 70 ? "white" : "black",
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
            </div>

            {/* Right stacked */}
            <div className="flex flex-col gap-6">
              <ChartCard title="Desk Usage This Week">
                <Line data={deskUsageWeek} />
              </ChartCard>
              <ChartCard title="Desk Usage by Department">
                <Bar data={deskUsageByDept} />
              </ChartCard>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Used Desks Count">
              <Bar data={usedDesks} />
            </ChartCard>
            <ChartCard title="System Health Timeline">
              <Line data={systemHealth} />
            </ChartCard>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartCard title="Booking Type Distribution">
              <div className="max-h-[260px]">
                <Doughnut data={bookingTypes} />
            </div>
            </ChartCard>

            <ChartCard title="Booking Cancellation Rate">
              <Bar data={cancellationRate} />
            </ChartCard>

            <div className="bg-muted/50 p-4 rounded-lg shadow hover:scale-[1.02] transition">
              <h2 className="text-lg font-semibold mb-3">Power Users Leaderboard</h2>
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
            </div>
          </div>
        </div>
      </SidebarInset>
    </>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-muted/50 p-4 rounded-lg shadow hover:scale-[1.02] transition min-h-[250px]">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}
