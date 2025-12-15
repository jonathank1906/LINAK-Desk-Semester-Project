import { useState, useEffect } from 'react';
import { usePostureCycle } from '@/contexts/usePostureCycle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function PostureCycleSettings({ open, onOpenChange }) {
  const {
    postureCyclesEnabled,
    sittingDuration,
    standingDuration,
    automaticMovement,
    updateSettings,
    resetSettingsToDefaults,
    enablePostureCycles,
    disablePostureCycles,
  } = usePostureCycle();

  const [localPostureCyclesEnabled, setLocalPostureCyclesEnabled] = useState(postureCyclesEnabled);
  const [localSittingDuration, setLocalSittingDuration] = useState(sittingDuration);
  const [localStandingDuration, setLocalStandingDuration] = useState(standingDuration);
  const [localAutomaticMovement, setLocalAutomaticMovement] = useState(automaticMovement);

  // Sync local state when modal opens or props change
  useEffect(() => {
    if (open) {
      setLocalPostureCyclesEnabled(postureCyclesEnabled);
      setLocalSittingDuration(sittingDuration);
      setLocalStandingDuration(standingDuration);
      setLocalAutomaticMovement(automaticMovement);
    }
  }, [open, postureCyclesEnabled, sittingDuration, standingDuration, automaticMovement]);

  const handleSave = async () => {
    try {
      await updateSettings({
        sittingDuration: localSittingDuration,
        standingDuration: localStandingDuration,
        automaticMovement: localAutomaticMovement,
      });
      
      if (!localPostureCyclesEnabled && postureCyclesEnabled) {
        await disablePostureCycles();
      } else if (localPostureCyclesEnabled && !postureCyclesEnabled) {
        await enablePostureCycles();
      }
      
      toast.success('Settings saved successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleReset = () => {
    setLocalPostureCyclesEnabled(true);
    setLocalSittingDuration(30);
    setLocalStandingDuration(5);
    setLocalAutomaticMovement(false);
    toast.info('Settings reset to defaults. Click Save to apply.');
  };

  const handleCancel = () => {
    setLocalPostureCyclesEnabled(postureCyclesEnabled);
    setLocalSittingDuration(sittingDuration);
    setLocalStandingDuration(standingDuration);
    setLocalAutomaticMovement(automaticMovement);
    onOpenChange(false);
  };

  const handleEnableToggle = (enabled) => {
    setLocalPostureCyclesEnabled(enabled);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Posture Cycle Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Enable Posture Cycles - Top */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-cycles" className="text-sm font-semibold">Enable Posture Cycles</Label>
                <p className="text-sm text-muted-foreground">
                  Cycle between sitting and standing positions at regular intervals
                </p>
              </div>
              <Switch
                id="enable-cycles"
                checked={localPostureCyclesEnabled}
                onCheckedChange={handleEnableToggle}
              />
            </div>
          </div>

          {/* Duration Sliders */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="sitting-duration" className={!localPostureCyclesEnabled ? "opacity-50 text-sm font-semibold" : "text-sm font-semibold"}>Sitting Duration</Label>
                <span className={`text-sm font-semibold ${!localPostureCyclesEnabled ? "opacity-50" : ""}`}>{localSittingDuration} minutes</span>
              </div>
              <Slider
                id="sitting-duration"
                min={1}
                max={120}
                step={1}
                value={[localSittingDuration]}
                onValueChange={(value) => setLocalSittingDuration(value[0])}
                disabled={!localPostureCyclesEnabled}
                className={`w-full ${!localPostureCyclesEnabled ? "opacity-50" : ""}`}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="standing-duration" className={!localPostureCyclesEnabled ? "opacity-50 text-sm font-semibold" : "text-sm font-semibold"}>Standing Duration</Label>
                <span className={`text-sm font-semibold ${!localPostureCyclesEnabled ? "opacity-50" : ""}`}>{localStandingDuration} minutes</span>
              </div>
              <Slider
                id="standing-duration"
                min={1}
                max={120}
                step={1}
                value={[localStandingDuration]}
                onValueChange={(value) => setLocalStandingDuration(value[0])}
                disabled={!localPostureCyclesEnabled}
                className={`w-full ${!localPostureCyclesEnabled ? "opacity-50" : ""}`}
              />
            </div>
          </div>

          {/* Automatic Switching - Bottom */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="automatic-switching" className={!localPostureCyclesEnabled ? "opacity-50 text-sm font-semibold" : "text-sm font-semibold"}>Automatic Switching</Label>
                <p className={`text-sm text-muted-foreground ${!localPostureCyclesEnabled ? "opacity-50" : ""}`}>
                  Automatically move the desk instead of showing reminders
                </p>
              </div>
              <Switch
                id="automatic-switching"
                checked={localAutomaticMovement}
                onCheckedChange={setLocalAutomaticMovement}
                disabled={!localPostureCyclesEnabled}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="!justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}