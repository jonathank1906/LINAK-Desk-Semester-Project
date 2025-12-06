import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function PendingVerificationModal({ open, deskId, onClose }) {
  // Cancel handler
  const handleCancel = async () => {
    try {
      await axios.post(
        `http://localhost:8000/api/desks/${deskId}/hotdesk/cancel/`
      );
      toast.success("Desk verification cancelled.");
    } catch (err) {
      toast.error("Failed to cancel verification");
    }
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <div className="text-center space-y-4">
          <h2 className="text-lg font-bold">Confirm Desk Usage</h2>
          <p>
            Please press the physical push button on Desk #{deskId} to confirm you're at the desk.
          </p>
          <p className="text-sm text-muted-foreground">
            Waiting for button press...
          </p>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}