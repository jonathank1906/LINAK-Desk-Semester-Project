import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/useAuth";
import axios from "axios";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { IconPlus, IconEdit, IconTrash, IconRefresh, IconAlertCircle, IconCheck, IconX, IconDotsVertical, IconTool, IconCpu } from "@tabler/icons-react";
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
import { Spinner } from "@/components/ui/shadcn-io/spinner";
// Ensure you have a standard Dialog component or reuse AlertDialog if necessary, 
// but standard Dialog is better for forms.
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function DeskManagement() {
  const { user } = useAuth();
  const [desks, setDesks] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Modals State ---
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [picoOpen, setPicoOpen] = useState(false); // New Pico Modal

  // Confirmation Dialog States
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);

  const [selectedDesk, setSelectedDesk] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({ name: "", location: "", current_status: "available" });

  // Pico Form Data
  const [picoData, setPicoData] = useState({ ip_address: "", mac_address: "" });

  useEffect(() => {
    fetchDesks();
  }, []);

  const fetchDesks = async () => {
    setLoading(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.get("http://localhost:8000/api/desks/", config);
      setDesks(res.data);
    } catch (err) {
      toast.error("Failed to load desks");
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  const handleCreate = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post("http://localhost:8000/api/admin/desks/create/", formData, config);
      toast.success("Desk created successfully");
      setCreateOpen(false);
      setFormData({ name: "", location: "", current_status: "available" });
      fetchDesks();
    } catch (err) {
      toast.error("Failed to create desk");
    }
  };

  const handleUpdate = async () => {
    if (!selectedDesk) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.patch(`http://localhost:8000/api/admin/desks/${selectedDesk.id}/update/`, formData, config);
      toast.success("Desk updated");
      setEditOpen(false);
      fetchDesks();
    } catch (err) {
      toast.error("Failed to update desk");
    }
  };

  // --- Pico Actions ---

  const [deletePicoOpen, setDeletePicoOpen] = useState(false); // Pico delete dialog state

  const handleSavePico = async () => {
    if (!selectedDesk) return;
    // Check if updating existing or adding new
    const existingPico = selectedDesk.pico && selectedDesk.pico.length > 0 ? selectedDesk.pico[0] : null;
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    try {
      if (existingPico) {
        // Update
        await axios.patch(`http://localhost:8000/api/admin/pico/${existingPico.id}/update/`, picoData, config);
        toast.success("Pico updated");
      } else {
        // Create
        await axios.post(`http://localhost:8000/api/admin/desks/${selectedDesk.id}/add-pico/`, picoData, config);
        toast.success("Pico added to desk");
      }
      setPicoOpen(false);
      fetchDesks();
    } catch (err) {
      // Extract validation errors from response
      const errorData = err.response?.data;
      if (errorData && typeof errorData === 'object') {
        const errors = [];
        if (errorData.ip_address) errors.push(`IP: ${Array.isArray(errorData.ip_address) ? errorData.ip_address[0] : errorData.ip_address}`);
        if (errorData.mac_address) errors.push(`MAC: ${Array.isArray(errorData.mac_address) ? errorData.mac_address[0] : errorData.mac_address}`);
        if (errorData.error) errors.push(errorData.error);

        if (errors.length > 0) {
          toast.error(errors.join(' | '));
        } else {
          toast.error("Failed to save Pico settings");
        }
      } else {
        toast.error("Failed to save Pico settings");
      }
    }
  };

  const handleDeletePico = async () => {
    if (!selectedDesk) return;
    const existingPico = selectedDesk.pico && selectedDesk.pico.length > 0 ? selectedDesk.pico[0] : null;
    if (!existingPico) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`http://localhost:8000/api/admin/pico/${existingPico.id}/remove/`, config);
      toast.success("Pico removed");
      setPicoOpen(false);
      fetchDesks();
    } catch (err) {
      toast.error("Failed to remove Pico");
    }
    setDeletePicoOpen(false);
  };

  // --- Standard Actions ---

  const executeDelete = async () => {
    if (!selectedDesk) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.delete(`http://localhost:8000/api/admin/desks/${selectedDesk.id}/delete/`, config);
      toast.success("Desk deleted");
      setDeleteOpen(false);
      fetchDesks();
    } catch (err) {
      toast.error("Failed to delete desk");
    }
  };

  const executeForceRelease = async () => {
    if (!selectedDesk) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.post(`http://localhost:8000/api/admin/desks/${selectedDesk.id}/force-release/`, {}, config);
      toast.success("Desk released forcefully");
      setReleaseOpen(false);
      fetchDesks();
    } catch (err) {
      toast.error("Failed to release desk");
    }
  };

  const executeClearReservations = async () => {
    if (!selectedDesk) return;
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const res = await axios.post(`http://localhost:8000/api/admin/desks/${selectedDesk.id}/clear-reservations/`, {}, config);
      toast.success(res.data.message);
      setClearOpen(false);
      fetchDesks();
    } catch (err) {
      toast.error("Failed to clear reservations");
    }
  };

  const executeMaintenanceToggle = async () => {
    if (!selectedDesk) return;
    const newStatus = selectedDesk.current_status === "maintenance" ? "available" : "maintenance";
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      await axios.patch(`http://localhost:8000/api/admin/desks/${selectedDesk.id}/update/`, { current_status: newStatus }, config);
      toast.success(newStatus === "maintenance" ? "Desk set to maintenance" : "Desk activated");
      setMaintenanceOpen(false);
      fetchDesks();
    } catch (err) {
      toast.error("Failed to change status");
    }
  };

  // --- Trigger Functions (Open Modals) ---

  const openEdit = (desk) => {
    setSelectedDesk(desk);
    setFormData({
      name: desk.name,
      location: desk.location || "",
      current_status: desk.current_status || "available"
    });
    setEditOpen(true);
  };

  const openPicoManagement = (desk) => {
    setSelectedDesk(desk);
    // Check if desk already has a pico (assuming serializer returns a list 'pico')
    const existingPico = desk.pico && desk.pico.length > 0 ? desk.pico[0] : null;

    if (existingPico) {
      setPicoData({
        ip_address: existingPico.ip_address,
        mac_address: existingPico.mac_address
      });
    } else {
      setPicoData({ ip_address: "", mac_address: "" });
    }
    setPicoOpen(true);
  }

  const openDelete = (desk) => {
    setSelectedDesk(desk);
    setDeleteOpen(true);
  };

  const openForceRelease = (desk) => {
    setSelectedDesk(desk);
    setReleaseOpen(true);
  };

  const openClearReservations = (desk) => {
    setSelectedDesk(desk);
    setClearOpen(true);
  };

  const openMaintenance = (desk) => {
    setSelectedDesk(desk);
    setMaintenanceOpen(true);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pb-12 pt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Desk Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage inventory, assignments, and hardware.</p>
        </div>

        {/* CREATE DIALOG */}
        <AlertDialog open={createOpen} onOpenChange={setCreateOpen}>
          <AlertDialogTrigger asChild>
            <Button onClick={() => setCreateOpen(true)}>
              <IconPlus className="h-5 w-5 mr-2" /> Create Desk
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create Desk</AlertDialogTitle>
              <AlertDialogDescription>Add a new desk to the system.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Desk Name</label>
                <Input
                  placeholder="e.g. DESK 4004"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  placeholder="e.g. Floor 2, North Wing"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handleCreate(); }}>Create Desk</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory ({desks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Spinner variant="circle" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="py-3 px-4 text-left font-medium">Name</th>
                    <th className="py-3 px-4 text-left font-medium">Location</th>
                    <th className="py-3 px-4 text-left font-medium">Hardware</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">Current User</th>
                    <th className="py-3 px-4 text-left font-medium">Health</th>
                    <th className="py-3 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {desks.map((desk) => {
                    const status = desk.current_status || "available";
                    const isError = status === "Collision" || status === "Offline" || status === "Error" || status === "error";
                    const isOccupied = status === "occupied" || status === "in_use";
                    const isMaintenance = status === "maintenance";

                    // Check for Pico
                    const pico = desk.pico && desk.pico.length > 0 ? desk.pico[0] : null;

                    return (
                      <tr key={desk.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{desk.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{desk.location || "—"}</td>
                        <td className="py-3 px-4">
                          {pico ? (
                            <div className="flex items-center gap-2" title={`MAC: ${pico.mac_address}`}>
                              <IconCpu className={`h-4 w-4 ${pico.status === 'online' ? 'text-green-500' :
                                pico.status === 'error' ? 'text-red-500' : 'text-gray-400'
                                }`} />
                              <span className="text-xs font-mono text-muted-foreground">{pico.ip_address}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            isMaintenance ? "destructive" :
                              isOccupied ? "secondary" :
                                isError ? "destructive" : "outline"
                          } className={!isMaintenance && !isOccupied && !isError ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" : ""}>
                            {status.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {desk.current_user ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{desk.current_user.email}</span>
                              {(desk.current_user.first_name || desk.current_user.last_name) && (
                                <span className="text-xs text-muted-foreground">
                                  {desk.current_user.first_name} {desk.current_user.last_name}
                                </span>
                              )}
                            </div>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-3 px-4">
                          {isError ? (
                            <span className="flex items-center gap-1.5 text-red-600 font-medium">
                              <IconAlertCircle size={16} /> {desk.last_error || "System Error"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-green-600">
                              <IconCheck size={16} /> OK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <IconDotsVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Manage Desk</DropdownMenuLabel>

                              <DropdownMenuItem onClick={() => openEdit(desk)}>
                                <IconEdit className="mr-2 h-4 w-4" /> Edit Details
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => openPicoManagement(desk)}>
                                <IconCpu className="mr-2 h-4 w-4" /> {pico ? 'Manage Pico' : 'Add Pico'}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => openForceRelease(desk)} className="text-orange-600 focus:text-orange-600">
                                <IconRefresh className="mr-2 h-4 w-4" /> Force Release
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => openClearReservations(desk)}>
                                <IconX className="mr-2 h-4 w-4" /> Clear Reservations
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => openMaintenance(desk)}>
                                {isMaintenance ? (
                                  <><IconCheck className="mr-2 h-4 w-4 text-green-600" /> Activate Desk</>
                                ) : (
                                  <><IconTool className="mr-2 h-4 w-4" /> Set Maintenance</>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => openDelete(desk)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                <IconTrash className="mr-2 h-4 w-4" /> Delete Desk
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Desk</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Desk Name</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Override</label>
              <Select
                value={formData.current_status}
                onValueChange={v => setFormData({ ...formData, current_status: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="occupied">Occupied (Manual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEditOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleUpdate(); }}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PICO MANAGEMENT DIALOG (Using Dialog instead of AlertDialog for forms) */}
      <Dialog open={picoOpen} onOpenChange={setPicoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Pico Device</DialogTitle>
            <DialogDescription>
              {selectedDesk?.pico && selectedDesk.pico.length > 0
                ? `Managing Pico for ${selectedDesk.name}`
                : `Add a new Pico controller to ${selectedDesk?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="ip" className="text-right text-sm font-medium">IP Address</label>
              <Input
                id="ip"
                value={picoData.ip_address}
                onChange={(e) => setPicoData({ ...picoData, ip_address: e.target.value })}
                className="col-span-3"
                placeholder="192.168.x.x"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="mac" className="text-right text-sm font-medium">MAC Address</label>
              <Input
                id="mac"
                value={picoData.mac_address}
                onChange={(e) => setPicoData({ ...picoData, mac_address: e.target.value })}
                className="col-span-3"
                placeholder="00:00:00:00:00:00"
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between w-full">
            {selectedDesk?.pico && selectedDesk.pico.length > 0 ? (
              <>
                <Button variant="destructive" onClick={() => setDeletePicoOpen(true)}>Remove Pico</Button>
                {/* Pico Remove Confirmation Dialog */}
                <AlertDialog open={deletePicoOpen} onOpenChange={setDeletePicoOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Pico Device?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove this Pico device from <span className="font-bold text-foreground">{selectedDesk?.name}</span>? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeletePico}>
                        Remove Pico
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : <div></div>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPicoOpen(false)}>Cancel</Button>
              <Button onClick={handleSavePico}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              <span className="font-bold text-foreground"> {selectedDesk?.name} </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Desk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FORCE RELEASE CONFIRMATION */}
      <AlertDialog open={releaseOpen} onOpenChange={setReleaseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force Release Desk?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately kick off the current user from
              <span className="font-bold text-foreground"> {selectedDesk?.name}</span>.
              The desk will become available for new check-ins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeForceRelease}>
              Confirm Release
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CLEAR RESERVATIONS CONFIRMATION */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Future Reservations?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to cancel <span className="font-bold text-foreground">ALL</span> upcoming reservations for
              <span className="font-bold text-foreground"> {selectedDesk?.name}</span>.
              Affected users will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeClearReservations}>
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MAINTENANCE / ACTIVATE CONFIRMATION */}
      <AlertDialog open={maintenanceOpen} onOpenChange={setMaintenanceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedDesk?.current_status === "maintenance"
                ? "Activate Desk?"
                : "Set to Maintenance?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedDesk?.current_status === "maintenance" ? (
                <span>
                  This will make <span className="font-bold text-foreground">{selectedDesk?.name}</span> available for check-ins again.
                </span>
              ) : (
                <span className="flex flex-col gap-2">
                  <span>
                    Are you sure you want to mark <span className="font-bold text-foreground">{selectedDesk?.name}</span> for
                    <span className="font-semibold text-red-600"> Maintenance</span>?
                  </span>
                  {(selectedDesk?.current_status === 'occupied' || selectedDesk?.current_status === 'in_use') && (
                    <span className="bg-yellow-50 text-yellow-800 p-2 rounded-md border border-yellow-200 text-xs font-semibold flex items-center">
                      <IconAlertCircle className="w-4 h-4 mr-1.5" />
                      Warning: This desk is currently occupied.
                    </span>
                  )}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeMaintenanceToggle}>
              {selectedDesk?.current_status === "maintenance" ? "Activate" : "Set Maintenance"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}