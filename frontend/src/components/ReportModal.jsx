import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import {IconFileReport} from '@tabler/icons-react'


export default function ReportModal({ user, onClose }) {
  const [reports, setReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function fetchReports() {
      try {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        const res = await axios.get("http://localhost:8000/api/reports/", config);
        setReports(res.data);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      }
    }

    fetchReports();
  }, [user]);

  const toggleSelect = (id) => {
    setSelectedReports((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const resolveReports = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };

      for (const reportId of selectedReports) {
        await axios.delete(`http://localhost:8000/api/reports/${reportId}/`, config);
      }

      toast.success(`${selectedReports.length} report(s) resolved`);
      setReports((prev) => prev.filter((r) => !selectedReports.includes(r.id)));
      setSelectedReports([]);
      setShowConfirm(false);
    } catch (err) {
      toast.error("Failed to resolve reports");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div
        className="bg-white w-[600px] max-h-[90vh] p-6 rounded-lg shadow-lg overflow-hidden flex flex-col animate-fade-up transition-all duration-300"
        style={{ minHeight: "550px" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"> 
            <IconFileReport size={24} className="text-blue-600" />
            Desk Reports
        </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✖
          </button>
        </div>

        {/* Report List */}
        <div className="overflow-y-auto pr-2 divide-y border-t border-b border-gray-200 flex-1"
             style={{ maxHeight: "65vh" }}>
          {reports.length === 0 ? (
            <p className="text-gray-500 italic p-3">No reports found</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="py-3 px-1 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">
                    <b>{r.user}</b> • <span className="text-xs">{r.created_at}</span>
                  </div>
                  <p className="text-sm mt-1">{r.message}</p>
                </div>
                <div>
                  <input
                    type="checkbox"
                    checked={selectedReports.includes(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="mt-1"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {selectedReports.length > 0 && (
          <div className="mt-4 flex justify-between items-center flex-shrink-0">
            <p className="text-sm">{selectedReports.length} selected</p>
            <button
              onClick={() => setShowConfirm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Mark as Resolved
            </button>
          </div>
        )}

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-md shadow-lg w-[350px] space-y-4 text-center animate-fade-up">
              <h3 className="font-semibold">Confirm Resolve</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to mark {selectedReports.length} report(s) as resolved?
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1 bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={resolveReports}
                  className="px-3 py-1 bg-red-600 text-white rounded"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
