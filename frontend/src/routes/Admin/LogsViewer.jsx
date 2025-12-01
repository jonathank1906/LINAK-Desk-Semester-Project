import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/contexts/useAuth";

export default function LogsViewer() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` }};
        const res = await axios.get("http://localhost:8000/api/logs/", config);
        setLogs(res.data);
      } catch (err) {
        console.error("Failed to fetch logs", err);
      }
    }

    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="bg-white dark:bg-slate-950 p-4 rounded-lg shadow space-y-3">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Logs</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">User</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Desk</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Action</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Height</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">Date & Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {logs.length === 0 && (
              <tr>
                <td colSpan="5" className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No logs available
                </td>
              </tr>
            )}
            {logs.map((log, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                <td className="py-2 px-2">
                  <div className="text-gray-900 dark:text-gray-100 font-medium">
                    {log.user_full_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {log.user_id}
                  </div>
                </td>
                <td className="py-2 px-2 text-gray-900 dark:text-gray-100">
                  {log.desk_name}
                </td>
                <td className="py-2 px-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    log.action === 'hotdesk_started' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200' :
                    log.action === 'hotdesk_ended' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200' :
                    log.action === 'desk_released' ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200' :
                    log.action === 'reservation_checked_in' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200' :
                    log.action === 'reservation_checked_out' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200' :
                    log.action === 'desk_report_submitted' ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}>
                    {log.action.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </td>
                <td className="py-2 px-2 text-gray-700 dark:text-gray-300">
                  {log.height ? `${log.height}cm` : '—'}
                </td>
                <td className="py-2 px-2 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                  {log.timestamp_formatted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
