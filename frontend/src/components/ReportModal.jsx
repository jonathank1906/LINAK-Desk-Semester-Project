import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { IconFileReport } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ReportModal({ user, onClose, onReportsResolved }) {
  const [reports, setReports] = useState([]);
  const [selectedReports, setSelectedReports] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [open, setOpen] = useState(true);
  const resolveButtonRef = useRef(null);

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
    setSelectedReports((prev) => {
      const newSelection = prev.includes(id) 
        ? prev.filter((rid) => rid !== id) 
        : [...prev, id];
      
      if (newSelection.length === 0 && resolveButtonRef.current) {
        resolveButtonRef.current.blur();
      }
      
      return newSelection;
    });
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
      
      // Notify parent to refresh reports
      if (onReportsResolved) {
        onReportsResolved();
      }
    } catch (err) {
      toast.error("Failed to resolve reports");
    }
  };

  const handleOpenChange = (isOpen) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => {
        onClose();
      }, 200);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent 
          className="sm:max-w-lg h-[600px] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconFileReport size={24} className="text-primary" />
              Desk Reports
            </DialogTitle>
            <DialogDescription>
              Review and resolve desk reports from users
            </DialogDescription>
          </DialogHeader>

          {/* Report List */}
          <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6">
            {reports.length === 0 ? (
              <p className="text-muted-foreground italic py-3">No reports found</p>
            ) : (
              <div className="space-y-1">
                {reports.map((r) => (
                  <div
                    key={r.id}
                    className="group relative py-3 px-4 flex items-start gap-3 rounded-md cursor-pointer"
                    onClick={() => toggleSelect(r.id)}
                  >
                    <div className="absolute inset-0 bg-accent opacity-0 group-hover:opacity-100 transition-opacity rounded-md -mx-6" />
                    <div className="flex items-start gap-3 flex-1 min-w-0 relative z-10">
                      <div 
                        className="pt-0.5 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedReports.includes(r.id)}
                          onCheckedChange={() => toggleSelect(r.id)}
                          aria-label={`Select report from ${r.user}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-foreground text-sm truncate">
                            {r.user}
                          </span>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {r.created_at}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          Desk: <span className="font-medium text-foreground">{r.desk || 'Unknown'}</span>
                        </div>
                        <p className="text-sm mt-1 text-foreground break-words">{r.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center border-t pt-4 mt-4 gap-4 w-full">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {selectedReports.length > 0 ? `${selectedReports.length} selected` : "No items selected"}
            </p>
            <Button
              ref={resolveButtonRef}
              onClick={() => setShowConfirm(true)}
              variant="destructive"
              disabled={selectedReports.length === 0}
              className="flex-shrink-0"
              tabIndex={selectedReports.length === 0 ? -1 : 0}
              onMouseDown={(e) => {
                if (selectedReports.length === 0) {
                  e.preventDefault();
                }
              }}
            >
              Mark as Resolved
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resolve</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark {selectedReports.length} report(s) as
              resolved?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={resolveReports}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
