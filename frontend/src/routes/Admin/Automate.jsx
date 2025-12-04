import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
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
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";

const mockSchedules = [
  {
    id: 1,
    name: "Morning Cleaning",
    time: "07:00",
    days: ["Mon", "Wed", "Fri"],
    targetHeight: 120,
  },
  {
    id: 2,
    name: "Evening Cleaning",
    time: "18:30",
    days: ["Tue", "Thu"],
    targetHeight: 120,
  },
];

export default function Automate() {
  const [schedules, setSchedules] = useState(mockSchedules);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Automation: Cleaning Schedules</h2>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
              <IconPlus className="mr-2 h-5 w-5" /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create Cleaning Schedule</DialogTitle>
            <div className="space-y-4 mt-4">
              <Input placeholder="Schedule Name" />
              <Input placeholder="Time (e.g. 07:00)" />
              <Input placeholder="Days (e.g. Mon,Wed,Fri)" />
              <Input placeholder="Target Height (cm)" type="number" />
              <Button variant="primary">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cleaning Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Time</th>
                  <th className="py-2 px-4 text-left">Days</th>
                  <th className="py-2 px-4 text-left">Target Height</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4">{schedule.name}</td>
                    <td className="py-2 px-4">{schedule.time}</td>
                    <td className="py-2 px-4">{schedule.days.join(", ")}</td>
                    <td className="py-2 px-4">{schedule.targetHeight} cm</td>
                    <td className="py-2 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setShowEditDialog(true);
                            }}
                          >
                            <IconEdit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
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
        </CardContent>
      </Card>

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogTitle>Edit Cleaning Schedule</DialogTitle>
          <div className="space-y-4 mt-4">
            <Input placeholder="Schedule Name" defaultValue={selectedSchedule?.name} />
            <Input placeholder="Time (e.g. 07:00)" defaultValue={selectedSchedule?.time} />
            <Input placeholder="Days (e.g. Mon,Wed,Fri)" defaultValue={selectedSchedule?.days?.join(",")} />
            <Input placeholder="Target Height (cm)" type="number" defaultValue={selectedSchedule?.targetHeight} />
            <Button variant="primary">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}