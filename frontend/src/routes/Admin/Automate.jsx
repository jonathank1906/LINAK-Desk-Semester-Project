import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { IconPlus, IconEdit, IconTrash, IconLoader2 } from "@tabler/icons-react";
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
} from "@/components/ui/alert-dialog";
import { getDeskSchedules, createDeskSchedule, updateDeskSchedule, deleteDeskSchedule } from "@/endpoints/api";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
    } catch (error) {
      console.error("Error creating schedule:", error);
      alert("Failed to create schedule. Please try again.");
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
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Failed to update schedule. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (scheduleId) => {
    try {
      await deleteDeskSchedule(scheduleId);
      await fetchSchedules();
      setDeleteScheduleId(null);
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Failed to delete schedule. Please try again.");
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Automation: Cleaning Schedules</h2>
        <Dialog open={showCreateDialog} onOpenChange={(open) => {
          setShowCreateDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <IconPlus className="h-5 w-5 mr-2"/> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create Cleaning Schedule</DialogTitle>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Schedule Name</Label>
                <Input 
                  id="name"
                  placeholder="e.g., Morning Cleaning" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
                {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <Label htmlFor="time">Time</Label>
                <Input 
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                />
                {formErrors.time && <p className="text-sm text-red-500 mt-1">{formErrors.time}</p>}
              </div>
              
              <div>
                <Label>Days</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {WEEKDAYS.map(day => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`day-${day.value}`}
                        checked={formData.weekdays.includes(day.value)}
                        onCheckedChange={() => toggleWeekday(day.value)}
                      />
                      <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
                {formErrors.weekdays && <p className="text-sm text-red-500 mt-1">{formErrors.weekdays}</p>}
              </div>
              
              <div>
                <Label htmlFor="height">Target Height (cm)</Label>
                <Input 
                  id="height"
                  type="number"
                  min="60"
                  max="130"
                  value={formData.target_height}
                  onChange={(e) => setFormData({...formData, target_height: parseInt(e.target.value)})}
                />
                {formErrors.target_height && <p className="text-sm text-red-500 mt-1">{formErrors.target_height}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? <IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
            <div className="text-center py-8 text-muted-foreground">
              No schedules configured. Create one to automate desk cleaning.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">Name</th>
                    <th className="py-2 px-4 text-left">Time</th>
                    <th className="py-2 px-4 text-left">Days</th>
                    <th className="py-2 px-4 text-left">Target Height</th>
                    <th className="py-2 px-4 text-left">Status</th>
                    <th className="py-2 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4">{schedule.name}</td>
                      <td className="py-2 px-4">{schedule.time}</td>
                      <td className="py-2 px-4">{schedule.weekday_names?.join(", ")}</td>
                      <td className="py-2 px-4">{schedule.target_height} cm</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEditDialog(schedule)}>
                              <IconEdit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteScheduleId(schedule.id)}>
                              <IconTrash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        <DialogContent>
          <DialogTitle>Edit Cleaning Schedule</DialogTitle>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-name">Schedule Name</Label>
              <Input 
                id="edit-name"
                placeholder="e.g., Morning Cleaning" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
              {formErrors.name && <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>}
            </div>
            
            <div>
              <Label htmlFor="edit-time">Time</Label>
              <Input 
                id="edit-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
              />
              {formErrors.time && <p className="text-sm text-red-500 mt-1">{formErrors.time}</p>}
            </div>
            
            <div>
              <Label>Days</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {WEEKDAYS.map(day => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`edit-day-${day.value}`}
                      checked={formData.weekdays.includes(day.value)}
                      onCheckedChange={() => toggleWeekday(day.value)}
                    />
                    <label htmlFor={`edit-day-${day.value}`} className="text-sm cursor-pointer">
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
              {formErrors.weekdays && <p className="text-sm text-red-500 mt-1">{formErrors.weekdays}</p>}
            </div>
            
            <div>
              <Label htmlFor="edit-height">Target Height (cm)</Label>
              <Input 
                id="edit-height"
                type="number"
                min="60"
                max="130"
                value={formData.target_height}
                onChange={(e) => setFormData({...formData, target_height: parseInt(e.target.value)})}
              />
              {formErrors.target_height && <p className="text-sm text-red-500 mt-1">{formErrors.target_height}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? <IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
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
            <AlertDialogAction onClick={() => handleDelete(deleteScheduleId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}