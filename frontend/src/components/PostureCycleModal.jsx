import { usePostureCycle } from '@/contexts/usePostureCycle';
import { useAuth } from '@/contexts/useAuth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

export default function PostureCycleModal() {
  const { user } = useAuth();
  const {
    showReminder,
    currentStance,
    changeStanceAndSetDesk,
    dismissReminder,
    disablePostureCycles,
    sittingDuration,
    standingDuration
  } = usePostureCycle();

  if (!user || user.is_admin) {
    return null;
  }

  const nextStance = currentStance === 'sitting' ? 'standing' : 'sitting';
  const nextStanceLabel = nextStance === 'standing' ? 'Standing' : 'Sitting';
  const currentDuration = currentStance === 'sitting' ? sittingDuration : standingDuration;

  const handleConfirm = () => {
    changeStanceAndSetDesk(nextStance, false);
    toast.success(`Switching to ${nextStanceLabel.toLowerCase()} position`);
  };

  const handleDisable = async () => {
    await disablePostureCycles();
    toast.success('Posture cycles disabled. You can re-enable them in settings.');
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
            You have been {currentStance} for {currentDuration} minutes. Consider adjusting your desk to the {nextStanceLabel.toLowerCase()} position.
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
              onClick={handleDisable}
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