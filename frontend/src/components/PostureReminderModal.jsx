import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePostureReminder } from "@/contexts/usePostureReminder";
import { useAuth } from "@/contexts/useAuth";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function PostureReminderModal() {
  const { user } = useAuth();
  const { currentStance, showReminder, changeStanceAndSetDesk, dismissReminder, disableReminders } = usePostureReminder();

  // Only allow to show reminders when user is authenticated and is an employee (not admin)
  if (!user || user.is_admin) {
    return null;
  }

  const nextStance = currentStance === 'sitting' ? 'standing' : 'sitting';
  const nextStanceLabel = nextStance === 'standing' ? 'Standing' : 'Sitting';

  const handleConfirm = () => {
    changeStanceAndSetDesk(nextStance);
  };

  return (
    <Dialog open={showReminder} onOpenChange={(open) => !open && dismissReminder()}>
      <DialogContent className="sm:max-w-md pulse-border-wrapper">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStance === 'sitting' ? (
              <ArrowUp className="h-5 w-5 text-primary" />
            ) : (
              <ArrowDown className="h-5 w-5 text-primary" />
            )}
            Posture Reminder
          </DialogTitle>
          <DialogDescription className="pt-2">
            You have been {currentStance} for 30 minutes. Consider adjusting your desk to the {nextStanceLabel.toLowerCase()} position.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={handleConfirm}
            className="w-full"
          >
            Switch to {nextStanceLabel}
          </Button>
          <div className="flex justify-center">
            <button
              onClick={disableReminders}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
            >
              Do not show again
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

