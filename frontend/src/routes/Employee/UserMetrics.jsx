import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/useAuth";
import { StandingSittingChart } from "@/components/charts/StandingSittingChart";
import { StandingLeaderboard } from "@/components/charts/StandingLeaderboard";
import { MostUsedDesksChart } from "@/components/charts/MostUsedDesksChart";
import { WeeklyUsageChart } from "@/components/charts/WeeklyUsageChart";
import { OverallStatsCards } from "@/components/charts/OverallStatsCards";
import { Button } from "@/components/ui/button";
import { IconRefresh } from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserMetrics() {
  const { user } = useAuth();
  const [metricsData, setMetricsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7");

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        withCredentials: true,
      };
      
      const response = await axios.get(
        `http://localhost:8000/api/user/metrics/?days=${timeRange}`,
        config
      );
      
      setMetricsData(response.data);
    } catch (error) {
      console.error("Failed to fetch user metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMetrics();
    }
  }, [user, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (!metricsData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load metrics</p>
        <Button onClick={fetchMetrics} className="mt-4">
          <IconRefresh className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Your Metrics</h2>
          <p className="text-muted-foreground">
            Track your desk usage and health statistics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchMetrics}>
            <IconRefresh className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overall Stats Cards */}
      <OverallStatsCards stats={metricsData.overall_stats} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Standing/Sitting Chart */}
        <StandingSittingChart 
          data={metricsData.standing_sitting_chart}
          title="Standing vs Sitting Time"
        />

        {/* Weekly Usage Chart */}
        <WeeklyUsageChart 
          data={metricsData.weekly_usage}
          title="Weekly Usage Pattern"
        />

        {/* Most Used Desks */}
        <MostUsedDesksChart 
          desks={metricsData.most_used_desks}
          title="Most Used Desks"
        />

        {/* Leaderboard */}
        <StandingLeaderboard 
          leaderboard={metricsData.leaderboard}
          title="Standing Time Leaderboard"
        />
      </div>
    </div>
  );
}
