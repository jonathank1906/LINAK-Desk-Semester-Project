import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { usePostureReminder } from "@/contexts/usePostureReminder";

export function PostureTestButton() {
  const { triggerTestReminder } = usePostureReminder();

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={triggerTestReminder}
      title="Test Posture Reminder"
    >
      <Play className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Test posture reminder</span>
    </Button>
  );
}

