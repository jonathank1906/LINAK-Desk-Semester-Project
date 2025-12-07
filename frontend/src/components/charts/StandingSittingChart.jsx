import { Bar } from "react-chartjs-2";
import { useTheme } from "@/components/theme-provider";
import { MetricCard } from "./MetricCard";

export function StandingSittingChart({ data, title = "Standing vs Sitting Time" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const chartData = {
    labels: data.labels || [],
    datasets: [
      {
        label: "Standing (min)",
        data: data.standing || [],
        backgroundColor: isDark ? "rgba(34, 197, 94, 0.8)" : "rgba(34, 197, 94, 0.9)",
        borderColor: isDark ? "rgba(34, 197, 94, 1)" : "rgba(34, 197, 94, 1)",
        borderWidth: 1,
      },
      {
        label: "Sitting (min)",
        data: data.sitting || [],
        backgroundColor: isDark ? "rgba(59, 130, 246, 0.8)" : "rgba(59, 130, 246, 0.9)",
        borderColor: isDark ? "rgba(59, 130, 246, 1)" : "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: isDark ? "#e5e7eb" : "#374151",
          font: {
            size: 12,
          },
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
            return `${context.dataset.label}: ${context.parsed.y} min`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDark ? "#9ca3af" : "#6b7280",
        },
      },
      y: {
        stacked: true,
        grid: {
          color: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          color: isDark ? "#9ca3af" : "#6b7280",
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <MetricCard title={title} description="Your daily standing and sitting time breakdown">
      <div className="h-[300px]">
        <Bar data={chartData} options={options} />
      </div>
    </MetricCard>
  );
}
