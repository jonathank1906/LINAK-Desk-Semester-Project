import { MetricCard } from "./MetricCard";
import { IconTrophy, IconMedal, IconAward } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";

export function StandingLeaderboard({ leaderboard, title = "Standing Time Leaderboard" }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const getRankIcon = (index) => {
    switch (index) {
      case 0:
        return <IconTrophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <IconMedal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <IconAward className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-semibold">{index + 1}</span>;
    }
  };

  const getPercentageColor = (percentage) => {
    if (percentage >= 60) return "bg-green-500";
    if (percentage >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <MetricCard 
      title={title} 
      description="Compare your standing time with other users"
    >
      <div className="space-y-3">
        {leaderboard && leaderboard.length > 0 ? (
          leaderboard.map((entry, index) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                entry.is_current_user
                  ? isDark
                    ? "bg-blue-950/50 border-2 border-blue-500"
                    : "bg-blue-50 border-2 border-blue-500"
                  : isDark
                  ? "bg-gray-800/50 hover:bg-gray-800"
                  : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-center w-8">
                {getRankIcon(index)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate text-sm">
                    {entry.name}
                  </p>
                  {entry.is_current_user && (
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getPercentageColor(entry.standing_percentage)} transition-all`}
                      style={{ width: `${entry.standing_percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground min-w-[45px] text-right">
                    {entry.standing_percentage}%
                  </span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                  {entry.standing_minutes} min
                </p>
                <p className="text-xs text-muted-foreground">
                  standing
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No data available yet</p>
            <p className="text-sm mt-1">Start using desks to see rankings</p>
          </div>
        )}
      </div>
    </MetricCard>
  );
}
