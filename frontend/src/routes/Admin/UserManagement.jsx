import React, { useState, useEffect, useMemo } from "react";
import { DataTable } from "./Users/data-table";
import { columns as columnsFunc } from "./Users/columns";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { IconPlus, IconFilterX } from "@tabler/icons-react";
import { NewAccountForm } from "@/components/new-account-form";
import { EditUserDialog } from "@/components/EditUserDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react"; // Imported Loader2

export default function UserManagement() {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterCreatedAfter, setFilterCreatedAfter] = useState("");
  const [filterLastLoginAfter, setFilterLastLoginAfter] = useState("");
  const [filterDesk, setFilterDesk] = useState("");

  // Alert dialog state for "no users selected"
  const [noUsersAlertOpen, setNoUsersAlertOpen] = useState(false);

  // State for bulk action confirmation
  const [pendingBulkAction, setPendingBulkAction] = useState(null);

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/users/", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();

        const formatted = data.map((user) => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          department: user.department || "—",
          role: user.is_admin ? "Admin" : "Employee",
          lastLogin: user.last_login
            ? new Date(user.last_login).toLocaleString()
            : "Never",
          deskUsage: user.total_usage_hours ?? 50,
          favoriteDesk: "Unknown",
          deskUsageHistory: user.is_admin ? [1,1] : [2,2],
          status: user.is_active ? "Active" : "Disabled",
          created: new Date(user.created_at).toLocaleDateString(),
        }));

        setUsersData(formatted);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Could not load user list.");
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filtering logic
  const filteredUsers = useMemo(() => {
    return usersData.filter((user) => {
      const nameMatch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const roleMatch = filterRole ? user.role === filterRole : true;
      const statusMatch = filterStatus ? user.status === filterStatus : true;
      const deptMatch = filterDepartment
        ? user.department === filterDepartment
        : true;
      const createdMatch = filterCreatedAfter
        ? new Date(user.created) >= new Date(filterCreatedAfter)
        : true;
      const lastLoginMatch = filterLastLoginAfter
        ? new Date(user.lastLogin) >= new Date(filterLastLoginAfter)
        : true;
      const deskMatch = filterDesk
        ? (user.favoriteDesk || "").toLowerCase().includes(filterDesk.toLowerCase())
        : true;

      return (
        nameMatch &&
        roleMatch &&
        statusMatch &&
        deptMatch &&
        createdMatch &&
        lastLoginMatch &&
        deskMatch
      );
    });
  }, [
    usersData,
    searchTerm,
    filterRole,
    filterStatus,
    filterDepartment,
    filterCreatedAfter,
    filterLastLoginAfter,
    filterDesk,
  ]);

  // Columns with actions
  const columns = columnsFunc({
    setUsers: setUsersData,
    openViewDialog: setViewingUser,
    openEditDialog: setEditingUser,
  });

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setFilterRole("");
    setFilterStatus("");
    setFilterDepartment("");
    setFilterCreatedAfter("");
    setFilterLastLoginAfter("");
    setFilterDesk("");
  };

  // Handle bulk action button click
  const handleBulkAction = (action) => {
    if (!selectedUsers.length) {
      setNoUsersAlertOpen(true);
      return;
    }
    setPendingBulkAction(action);
  };

  // Execute the bulk action after confirmation
  const executeBulkAction = () => {
    if (pendingBulkAction === "delete") {
      setUsersData((prev) =>
        prev.filter((u) => !selectedUsers.find((s) => s.id === u.id))
      );
    } else if (pendingBulkAction === "disable") {
      setUsersData((prev) =>
        prev.map((u) =>
          selectedUsers.find((s) => s.id === u.id)
            ? { ...u, status: "Disabled" }
            : u
        )
      );
    } else if (pendingBulkAction === "activate") {
      setUsersData((prev) =>
        prev.map((u) =>
          selectedUsers.find((s) => s.id === u.id)
            ? { ...u, status: "Active" }
            : u
        )
      );
    }

    setSelectedUsers([]);
    setPendingBulkAction(null);
  };

  return (
    <div className="flex flex-col gap-6 px-6 pb-12 pt-4 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user accounts and permissions
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 flex-shrink-0">
              <IconPlus className="w-4 h-4" /> Create Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <NewAccountForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Card */}
      <Card className="bg-muted/50 py-0 min-w-0">
        <CardContent className="px-4 py-3 min-w-0">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <Input
              type="text"
              placeholder="Search by name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-0 flex-shrink max-w-xs"
            />

            <Select 
              value={filterRole || "all"} 
              onValueChange={(val) => setFilterRole(val === "all" ? "" : val)}
            >
              <SelectTrigger className="min-w-0 w-[150px] flex-shrink-0">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Employee">Employee</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filterStatus || "all"} 
              onValueChange={(val) => setFilterStatus(val === "all" ? "" : val)}
            >
              <SelectTrigger className="min-w-0 w-[150px] flex-shrink-0">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filterDepartment || "all"} 
              onValueChange={(val) => setFilterDepartment(val === "all" ? "" : val)}
            >
              <SelectTrigger className="min-w-0 w-[170px] flex-shrink-0">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="Design">Design</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={
                    "min-w-0 w-[190px] justify-start text-left flex-shrink-0 transition-none bg-transparent text-foreground"
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterLastLoginAfter ? new Date(filterLastLoginAfter).toLocaleDateString() : "Last Login After"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="start">
                <Calendar
                  mode="single"
                  selected={filterLastLoginAfter ? new Date(filterLastLoginAfter) : undefined}
                  onSelect={(date) =>
                    setFilterLastLoginAfter(date)
                  }
                  initialFocus
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={
                    "min-w-0 w-[180px] justify-start text-left flex-shrink-0 transition-none bg-transparent text-foreground"
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filterCreatedAfter ? new Date(filterCreatedAfter).toLocaleDateString() : "Created After"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto" align="start">
                <Calendar
                  mode="single"
                  selected={filterCreatedAfter ? new Date(filterCreatedAfter) : undefined}
                  onSelect={(date) =>
                    setFilterCreatedAfter(date)
                  }
                  initialFocus
                  captionLayout="dropdown"
                />
              </PopoverContent>
            </Popover>

            <Input
              type="text"
              placeholder="Filter by desk"
              value={filterDesk}
              onChange={(e) => setFilterDesk(e.target.value)}
              className="min-w-0 flex-shrink max-w-[150px]"
            />

            <Button variant="secondary" onClick={resetFilters} className="flex-shrink-0">
              <IconFilterX className="mr-2 h-4 w-4" /> Reset Filters
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="flex-shrink-0">Bulk Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkAction("disable")}>
                  Disable Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("activate")}>
                  Activate Selected
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("delete")}>
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="ml-auto text-sm text-muted-foreground flex-shrink-0 whitespace-nowrap">
              Showing {filteredUsers.length} of {usersData.length} users
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Section with Loading/Error states */}
      <div className="min-w-0 border rounded-md">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-red-500">
            {error}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredUsers}
            onSelectionChange={setSelectedUsers}
          />
        )}
      </div>

      {/* View Dialog */}
      {viewingUser && (
        <Dialog open onOpenChange={() => setViewingUser(null)}>
          <DialogContent>
            <UserProfileDialog
              user={viewingUser}
              onClose={() => setViewingUser(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editingUser && (
        <AlertDialog open onOpenChange={() => setEditingUser(null)}>
          <AlertDialogContent>
            <EditUserDialog
              user={editingUser}
              onClose={() => setEditingUser(null)}
              onSave={(updatedUser) => {
                setUsersData((prev) =>
                  prev.map((user) =>
                    user.id === updatedUser.id ? updatedUser : user
                  )
                );
                setEditingUser(null);
              }}
            />
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* No Users Selected Alert Dialog */}
      <AlertDialog open={noUsersAlertOpen} onOpenChange={setNoUsersAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Users Selected</AlertDialogTitle>
            <AlertDialogDescription>
              Please select at least one user first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setNoUsersAlertOpen(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={!!pendingBulkAction} onOpenChange={() => setPendingBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingBulkAction === "delete" && "Delete Users"}
              {pendingBulkAction === "disable" && "Disable Users"}
              {pendingBulkAction === "activate" && "Activate Users"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkAction === "delete" && 
                `Are you sure you want to delete ${selectedUsers.map((u) => u.name).join(", ")}? This action cannot be undone.`
              }
              {pendingBulkAction === "disable" && 
                `Are you sure you want to disable ${selectedUsers.map((u) => u.name).join(", ")}?`
              }
              {pendingBulkAction === "activate" && 
                `Are you sure you want to activate ${selectedUsers.map((u) => u.name).join(", ")}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}