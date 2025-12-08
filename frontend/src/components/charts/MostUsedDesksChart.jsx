import { MetricCard } from "./MetricCard";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";

export function MostUsedDesksChart({ desks, title = "Most Used Desks" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Only show top 3 desks by sessions
  const topDesks = (desks || [])
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 3);

  return (
    <MetricCard title={title} description="Your top 3 frequently used desks">
      <div className="space-y-3">
        {topDesks && topDesks.length > 0 ? (
          topDesks.map((desk, index) => (
            <div
              key={desk.desk_id || desk.desk_name}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate text-sm">
                    {desk.desk_name}
                  </p>
                  {index === 0 && (
                    <Badge variant="secondary" className="text-xs">Most Used</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-muted-foreground min-w-[45px] text-right">
                    {desk.sessions} sessions
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {desk.total_hours}h
                </p>
                <p className="text-xs text-muted-foreground">
                  total usage
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No desk usage yet</p>
            <p className="text-sm mt-1">Start using desks to see statistics</p>
          </div>
        )}
      </div>
    </MetricCard>
  );
}