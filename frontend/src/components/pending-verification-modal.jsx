import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function PendingVerificationModal({ open, deskId, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <div className="text-center space-y-4">
          <h2 className="text-lg font-bold">Confirm Desk Usage</h2>
          <p>
            Please press the physical push button on Desk #{deskId} to confirm you're at the desk.
          </p>
          <p className="text-sm text-muted-foreground">
            Waiting for button press...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}