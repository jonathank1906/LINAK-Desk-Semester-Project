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
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {logs.length === 0 && <p className="text-gray-500 dark:text-gray-400">No logs available.</p>}
        {logs.map((log, i) => (
          <li key={i} className="py-2">
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-gray-100">{log.user_name || "System"}</span> →
              <span className="text-blue-600 dark:text-blue-400 ml-1">{log.action}</span> on desk <b className="text-gray-900 dark:text-gray-100">{log.desk_name}</b>
              {log.height && <span className="text-gray-700 dark:text-gray-300"> at <b>{log.height}cm</b></span>}<br />
              <span className="text-gray-500 dark:text-gray-400 text-xs">{log.timestamp}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
