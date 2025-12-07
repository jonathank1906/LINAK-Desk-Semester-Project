import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconClock, IconActivity, IconArrowsVertical, IconChartBar } from "@tabler/icons-react";

export function OverallStatsCards({ stats }) {
  const statCards = [
    {
      title: "Total Sessions",
      value: stats?.total_sessions || 0,
      icon: IconChartBar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Hours",
      value: `${stats?.total_hours || 0}h`,
      icon: IconClock,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Standing Time",
      value: `${stats?.standing_percentage || 0}%`,
      icon: IconActivity,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Position Changes",
      value: stats?.total_position_changes || 0,
      icon: IconArrowsVertical,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
