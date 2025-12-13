import React, { useState, useEffect, useMemo } from "react";
import { DataTable } from "./SystemLogs/data-table";
import { columns } from "./SystemLogs/columns";
import { Button } from "@/components/ui/button";
import { Spinner } from '@/components/ui/shadcn-io/spinner';
import { IconFilterX, IconRefresh } from "@tabler/icons-react";
import { useAuth } from "@/contexts/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LogsViewer() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/logs/", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
      setLastRefresh(new Date());
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch logs", err);
      setError("Could not load logs");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [user]);

  // Filtering logic
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchMatch =
        log.user_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.desk_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const actionMatch = filterAction ? log.action === filterAction : true;
      const categoryMatch = filterCategory
        ? log.report_category === filterCategory
        : true;

      return searchMatch && actionMatch && categoryMatch;
    });
  }, [logs, searchTerm, filterAction, filterCategory]);

  // Get unique values for filters
  const uniqueActions = [...new Set(logs.map((log) => log.action))].sort();
  const uniqueCategories = [
    ...new Set(logs.map((log) => log.report_category).filter(Boolean)),
  ].sort();


  const resetFilters = () => {
    setSearchTerm("");
    setFilterAction("");
    setFilterCategory("");
  };

  return (
    <div className="flex flex-col gap-6 px-6 pb-12 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor desk activity and user actions
            {lastRefresh && ` • Last updated: ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <IconRefresh className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Filter Row */}
      <Card className="bg-muted/50 py-0">
        <CardContent className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="text"
              placeholder="Search by user or desk"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />

            <Select 
              value={filterAction || "all"} 
              onValueChange={(val) => setFilterAction(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filterCategory || "all"} 
              onValueChange={(val) => setFilterCategory(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="secondary" onClick={resetFilters}>
              <IconFilterX className="mr-2 h-4 w-4" /> Reset Filters
            </Button>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section with Loading/Error states */}
      {loading && logs.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner variant="circle" className="h-8 w-8 text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          {error}
        </div>
      ) : (
        <DataTable columns={columns} data={filteredLogs} />
      )}
    </div>
  );
}
