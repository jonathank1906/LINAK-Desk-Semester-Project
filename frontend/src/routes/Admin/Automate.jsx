import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IconPlus, IconLoader2 } from "@tabler/icons-react";
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
import { getDeskSchedules, createDeskSchedule, updateDeskSchedule, deleteDeskSchedule, executeDeskSchedule } from "@/endpoints/api";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { DataTable } from "./Automate/data-table";
import { columns as columnsFunc } from "./Automate/columns";

const WEEKDAYS = [
  { value: 0, label: 'Monday', short: 'Mon' },
  { value: 1, label: 'Tuesday', short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday', short: 'Thu' },
  { value: 4, label: 'Friday', short: 'Fri' },
  { value: 5, label: 'Saturday', short: 'Sat' },
  { value: 6, label: 'Sunday', short: 'Sun' },
];

export default function Automate() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState(null);
  const [executingScheduleId, setExecutingScheduleId] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    time: '',
    weekdays: [],
    target_height: 120,
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch schedules on mount
  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await getDeskSchedules();
      setSchedules(data);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast.error("Failed to load schedules", {
        description: "Please refresh the page and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      time: '',
      weekdays: [],
      target_height: 120,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Schedule name is required';
    }
    
    if (!formData.time) {
      errors.time = 'Time is required';
    }
    
    if (formData.weekdays.length === 0) {
      errors.weekdays = 'Select at least one day';
    }
    
    if (!formData.target_height || formData.target_height < 60 || formData.target_height > 130) {
      errors.target_height = 'Height must be between 60 and 130 cm';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      await createDeskSchedule(formData);
      await fetchSchedules();
      setShowCreateDialog(false);
      resetForm();
      toast.success("Schedule created", {
        description: `"${formData.name}" has been added successfully.`,
      });
    } catch (error) {
      console.error("Error creating schedule:", error);
      toast.error("Failed to create schedule", {
        description: "Please check your input and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm()) return;
    
    try {
      setSubmitting(true);
      await updateDeskSchedule(selectedSchedule.id, formData);
      await fetchSchedules();
      setShowEditDialog(false);
      resetForm();
      setSelectedSchedule(null);
      toast.success("Schedule updated", {
        description: `"${formData.name}" has been updated successfully.`,
      });
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule", {
        description: "Please check your input and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheduleId) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      await deleteDeskSchedule(scheduleId);
      await fetchSchedules();
      setDeleteScheduleId(null);
      toast.success("Schedule deleted", {
        description: `"${schedule?.name || 'Schedule'}" has been removed.`,
      });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule", {
        description: "Please try again.",
      });
    }
  };

  const toggleActive = async (scheduleId, isActive) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      await updateDeskSchedule(scheduleId, { is_active: isActive });
      await fetchSchedules();
      toast.success(isActive ? "Schedule activated" : "Schedule deactivated", {
        description: `"${schedule?.name || 'Schedule'}" is now ${isActive ? 'active' : 'inactive'}.`,
      });
    } catch (error) {
      console.error("Error toggling schedule:", error);
      toast.error("Failed to update schedule status");
    }
  };

  const openEditDialog = (schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      name: schedule.name,
      time: schedule.time,
      weekdays: schedule.weekdays,
      target_height: schedule.target_height,
    });
    setShowEditDialog(true);
  };

  const toggleWeekday = (dayValue) => {
    setFormData(prev => ({
      ...prev,
      weekdays: prev.weekdays.includes(dayValue)
        ? prev.weekdays.filter(d => d !== dayValue)
        : [...prev.weekdays, dayValue].sort()
    }));
  };

  const handleExecuteNow = async (scheduleId, scheduleName) => {
    try {
      setExecutingScheduleId(scheduleId);
      const result = await executeDeskSchedule(scheduleId);
      
      toast.success("Schedule executed", {
        description: `${result.summary.successful} desk(s) moved successfully. ${result.summary.skipped} skipped, ${result.summary.failed} failed.`,
      });
      
      await fetchSchedules();
    } catch (error) {
      console.error("Error executing schedule:", error);
      toast.error("Failed to execute schedule", {
        description: "Please try again later.",
      });
    } finally {
      setExecutingScheduleId(null);
    }
  };

  // Create columns with handlers
  const columns = columnsFunc({
    handleExecuteNow,
    openEditDialog,
    setDeleteScheduleId,
    executingScheduleId,
    toggleActive,
  });

  return (
    <div className="flex flex-col gap-6 px-6 pb-12 pt-4 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Automation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automated desk cleaning schedules
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 flex-shrink-0">
              <IconPlus className="w-4 h-4" /> Create Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle>Create Cleaning Schedule</DialogTitle>
            <div className="space-y-5 mt-6">
              <div>
                <Label htmlFor="name" className="mb-2 block font-medium">Schedule Name</Label>
                <Input 
                  id="name"
                  placeholder="e.g., Morning Cleaning"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={formErrors.name ? "border-destructive" : ""}
                />
                {formErrors.name && (
                  <p className="text-sm text-destructive mt-1.5">{formErrors.name}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="time" className="mb-2 block font-medium">Execution Time</Label>
                  <TimePicker
                    id="time"
                    value={formData.time || "00:00"}
                    onChange={(time) => setFormData({...formData, time})}
                    className={formErrors.time ? "border-destructive" : ""}
                  />
                  {formErrors.time && (
                    <p className="text-sm text-destructive mt-1.5">{formErrors.time}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="height" className="mb-2 block font-medium">Target Height (cm)</Label>
                  <Select
                    value={formData.target_height?.toString() || "120"}
                    onValueChange={(value) => setFormData({...formData, target_height: parseInt(value)})}
                  >
                    <SelectTrigger 
                      id="height"
                      className={formErrors.target_height ? "border-destructive" : ""}
                    >
                      <SelectValue placeholder="Select height" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 15 }, (_, i) => {
                        const height = 60 + (i * 5);
                        return (
                          <SelectItem key={height} value={height.toString()}>
                            {height} cm
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formErrors.target_height && (
                    <p className="text-sm text-destructive mt-1.5">{formErrors.target_height}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label className="mb-2 block font-medium">Recurring Days</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 p-4 border rounded-lg bg-muted/30">
                  {WEEKDAYS.map(day => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`day-${day.value}`}
                        checked={formData.weekdays.includes(day.value)}
                        onCheckedChange={() => toggleWeekday(day.value)}
                      />
                      <label 
                        htmlFor={`day-${day.value}`} 
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {day.short}
                      </label>
                    </div>
                  ))}
                </div>
                {formErrors.weekdays && (
                  <p className="text-sm text-destructive mt-1.5">{formErrors.weekdays}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? (
                  <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Schedule"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table Section */}
      <Card>
        <CardHeader>
          <CardTitle>Cleaning Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <IconLoader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No schedules yet</p>
            </div>
          ) : (
            <DataTable columns={columns} data={schedules} />
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          resetForm();
          setSelectedSchedule(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle>Edit Cleaning Schedule</DialogTitle>
          <div className="space-y-5 mt-6">
            <div>
              <Label htmlFor="edit-name" className="mb-2 block font-medium">Schedule Name</Label>
              <Input 
                id="edit-name"
                placeholder="e.g., Morning Cleaning, End of Day Reset" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && (
                <p className="text-sm text-destructive mt-1.5">{formErrors.name}</p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-time" className="mb-2 block font-medium">Execution Time</Label>
                <TimePicker
                  id="edit-time"
                  value={formData.time || "00:00"}
                  onChange={(time) => setFormData({...formData, time})}
                  className={formErrors.time ? "border-destructive" : ""}
                />
                {formErrors.time && (
                  <p className="text-sm text-destructive mt-1.5">{formErrors.time}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="edit-height" className="mb-2 block font-medium">Target Height (cm)</Label>
                <Select
                  value={formData.target_height?.toString() || "120"}
                  onValueChange={(value) => setFormData({...formData, target_height: parseInt(value)})}
                >
                  <SelectTrigger 
                    id="edit-height"
                    className={formErrors.target_height ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select height" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 15 }, (_, i) => {
                      const height = 60 + (i * 5);
                      return (
                        <SelectItem key={height} value={height.toString()}>
                          {height} cm
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {formErrors.target_height && (
                  <p className="text-sm text-destructive mt-1.5">{formErrors.target_height}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label className="mb-2 block font-medium">Recurring Days</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 p-4 border rounded-lg bg-muted/30">
                {WEEKDAYS.map(day => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`edit-day-${day.value}`}
                      checked={formData.weekdays.includes(day.value)}
                      onCheckedChange={() => toggleWeekday(day.value)}
                    />
                    <label 
                      htmlFor={`edit-day-${day.value}`} 
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {day.short}
                    </label>
                  </div>
                ))}
              </div>
              {formErrors.weekdays && (
                <p className="text-sm text-destructive mt-1.5">{formErrors.weekdays}</p>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? (
                <>
                  <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteScheduleId} onOpenChange={(open) => !open && setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this cleaning schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteScheduleId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => handleDelete(deleteScheduleId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}