import { Doughnut } from "react-chartjs-2";
import { useTheme } from "@/components/theme-provider";
import { MetricCard } from "./MetricCard";

export function MostUsedDesksChart({ desks, title = "Most Used Desks" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = [
    { bg: "rgba(59, 130, 246, 0.8)", border: "rgba(59, 130, 246, 1)" }, // blue
    { bg: "rgba(34, 197, 94, 0.8)", border: "rgba(34, 197, 94, 1)" }, // green
    { bg: "rgba(251, 191, 36, 0.8)", border: "rgba(251, 191, 36, 1)" }, // yellow
    { bg: "rgba(239, 68, 68, 0.8)", border: "rgba(239, 68, 68, 1)" }, // red
    { bg: "rgba(168, 85, 247, 0.8)", border: "rgba(168, 85, 247, 1)" }, // purple
  ];

  const chartData = {
    labels: desks?.map(d => d.desk_name) || [],
    datasets: [
      {
        data: desks?.map(d => d.sessions) || [],
        backgroundColor: colors.map(c => c.bg),
        borderColor: colors.map(c => c.border),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#e5e7eb" : "#374151",
          font: {
            size: 11,
          },
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        titleColor: isDark ? "#f3f4f6" : "#111827",
        bodyColor: isDark ? "#e5e7eb" : "#374151",
        borderColor: isDark ? "#374151" : "#e5e7eb",
        borderWidth: 1,
        callbacks: {
          label: function (context) {
            const desk = desks[context.dataIndex];
            return [
              `Sessions: ${desk.sessions}`,
              `Total: ${desk.total_hours}h`
            ];
          },
        },
      },
    },
  };

  return (
    <MetricCard title={title} description="Your top 5 frequently used desks">
      {desks && desks.length > 0 ? (
        <div className="h-[280px]">
          <Doughnut data={chartData} options={options} />
        </div>
      ) : (
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p>No desk usage yet</p>
            <p className="text-sm mt-1">Start using desks to see statistics</p>
          </div>
        </div>
      )}
    </MetricCard>
  );
}
