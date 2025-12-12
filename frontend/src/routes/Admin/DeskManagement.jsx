import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { IconPlus, IconEdit, IconTrash, IconRefresh, IconAlertCircle, IconEye, IconX } from "@tabler/icons-react";
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

const mockDesks = [
  {
    id: 1,
    name: "Desk 101",
    location: "Floor 1, Room A",
    status: "available",
    error: null,
    isActive: true,
    current_user: null,
    reservations: 2,
  },
  {
    id: 2,
    name: "Desk 102",
    location: "Floor 1, Room B",
    status: "occupied",
    error: "Motor error",
    isActive: true,
    current_user: "John Doe",
    reservations: 1,
  },
  {
    id: 3,
    name: "Desk 103",
    location: "Floor 2, Room C",
    status: "out_of_service",
    error: "Broken leg",
    isActive: false,
    current_user: null,
    reservations: 0,
  },
];

export default function DeskManagement() {
  const [desks, setDesks] = useState(mockDesks);
  const [selectedDesk, setSelectedDesk] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pb-12 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Desk Management</h2>
        <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <AlertDialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)}>
              <IconPlus className="h-5 w-5" /> New Desk
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Create New Desk</AlertDialogTitle>
            <div className="space-y-4 mt-4">
              <Input placeholder="Desk Name" />
              <Input placeholder="Location" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button>Create</Button>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Desks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left">Name</th>
                  <th className="py-2 px-4 text-left">Location</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Active</th>
                  <th className="py-2 px-4 text-left">Current User</th>
                  <th className="py-2 px-4 text-left">Reservations</th>
                  <th className="py-2 px-4 text-left">Error</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {desks.map((desk) => (
                  <tr key={desk.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-4">{desk.name}</td>
                    <td className="py-2 px-4">{desk.location}</td>
                    <td className="py-2 px-4">
                      <Badge variant={
                        desk.status === "available"
                          ? "default"
                          : desk.status === "occupied"
                            ? "secondary"
                            : "destructive"
                      }>
                        {desk.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">
                      {desk.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </td>
                    <td className="py-2 px-4">{desk.current_user || "—"}</td>
                    <td className="py-2 px-4">{desk.reservations}</td>
                    <td className="py-2 px-4">
                      {desk.error ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <IconAlertCircle size={16} /> {desk.error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            Actions
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setSelectedDesk(desk)}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                            <IconEdit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <IconRefresh className="mr-2 h-4 w-4" /> Force Release
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <IconX className="mr-2 h-4 w-4" /> Clear Reservations
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <IconTrash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <IconAlertCircle className="mr-2 h-4 w-4" /> Deactivate
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

      {/* Edit Desk Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Edit Desk</AlertDialogTitle>
          <div className="space-y-4 mt-4">
            <Input placeholder="Desk Name" defaultValue={selectedDesk?.name} />
            <Input placeholder="Location" defaultValue={selectedDesk?.location} />
            <Select defaultValue={selectedDesk?.status}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2 pt-2">
              <AlertDialogCancel asChild>
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              </AlertDialogCancel>
              <Button>Save</Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}