import React, { useState, useEffect, useMemo } from "react";
import { DataTable } from "./Users/data-table";
import { columns as columnsFunc } from "./Users/columns";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";

import { UserProfileDialog } from "@/components/UserProfileDialog";
import { IconPlus, IconFilterX } from "@tabler/icons-react";
import { NewAccountForm } from "@/components/new-account-form";
import { EditUserDialog } from "@/components/EditUserDialog";
import { Button } from "@/components/ui/button";


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

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/users/", {
          credentials: "include", // send cookies if using JWT or session auth
        });
        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();

        // Map backend format to frontend table fields
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
          favoriteDesk: "Desk XXXX", // placeholder
          deskUsageHistory: user.is_admin ? [1,1] : [2,2], // placeholder
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

  // Bulk actions
  const handleBulkAction = (action) => {
    if (!selectedUsers.length) {
      alert("Please select at least one user first.");
      return;
    }

    const selectedNames = selectedUsers.map((u) => u.name).join(", ");
    if (!confirm(`Are you sure you want to ${action} ${selectedNames}?`)) return;

    if (action === "delete") {
      setUsersData((prev) =>
        prev.filter((u) => !selectedUsers.find((s) => s.id === u.id))
      );
    } else if (action === "disable") {
      setUsersData((prev) =>
        prev.map((u) =>
          selectedUsers.find((s) => s.id === u.id)
            ? { ...u, status: "Disabled" }
            : u
        )
      );
    } else if (action === "activate") {
      setUsersData((prev) =>
        prev.map((u) =>
          selectedUsers.find((s) => s.id === u.id)
            ? { ...u, status: "Active" }
            : u
        )
      );
    }
    setSelectedUsers([]);
  };

  // Loading and error handling as suggested
  if (loading) return <div className="p-6 text-muted-foreground">Loading users...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <SidebarInset>
      <div className="flex flex-col gap-6 px-6 pb-12 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-4">
          <h1 className="text-2xl font-bold">User Management</h1>
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded px-3 py-2"
          />

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>

          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Design">Design</option>
            <option value="Marketing">Marketing</option>
          </select>

          {/* Last Login */}
          <div className="relative">
            {!filterLastLoginAfter && (
              <span className="absolute left-3 top-2 text-gray-400 text-sm pointer-events-none">
                Last Login
              </span>
            )}
            <input
              type="date"
              value={filterLastLoginAfter}
              onChange={(e) => setFilterLastLoginAfter(e.target.value)}
              className="border rounded px-3 py-2 pl-24"
            />
          </div>

          {/* Date Created */}
          <div className="relative">
            {!filterCreatedAfter && (
              <span className="absolute left-3 top-2 text-gray-400 text-sm pointer-events-none">
                Date Created
              </span>
            )}
            <input
              type="date"
              value={filterCreatedAfter}
              onChange={(e) => setFilterCreatedAfter(e.target.value)}
              className="border rounded px-3 py-2 pl-24"
            />
          </div>

          <input
            type="text"
            placeholder="Search Desk #"
            value={filterDesk}
            onChange={(e) => setFilterDesk(e.target.value)}
            className="border rounded px-3 py-2"
          />

          {/* Reset Filters */}
          <Button variant="secondary" onClick={resetFilters}>
            <IconFilterX className="mr-2 h-4 w-4" /> Reset Filters
          </Button>

          {/* Bulk Actions Dropdown (Always Visible) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">Bulk Actions</Button>
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

           <Dialog>
            <DialogTrigger asChild>
              <Button className="btn btn-primary flex items-center gap-2 px-4 py-2">
                <IconPlus className="w-5 h-5" /> Create Employee Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <NewAccountForm />
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredUsers}
          onSelectionChange={setSelectedUsers}
        />

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
          <Dialog open onOpenChange={() => setEditingUser(null)}>
            <DialogContent>
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
            </DialogContent>
          </Dialog>
        )}

      </div>
    </SidebarInset>
  );
}
