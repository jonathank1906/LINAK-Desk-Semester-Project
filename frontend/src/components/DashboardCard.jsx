import { cn } from "@/lib/utils";

export function DashboardCard({ title, value, icon, color = "primary" }) {
  const bg = {
    primary: "bg-blue-100 text-blue-800 border border-blue-300",
    blue: "bg-blue-50 text-blue-700 border border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    yellow: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    purple: "bg-purple-50 text-purple-700 border border-purple-200",
    red: "bg-red-50 text-red-700 border border-red-200",
    cyan: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    teal: "bg-teal-50 text-teal-700 border border-teal-200",
  }[color];

  return (
    <div className={cn("rounded-xl p-4 flex items-center gap-4", bg)}>
      <div className="">{icon}</div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}
