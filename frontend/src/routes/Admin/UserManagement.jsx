import React, { useState, useMemo } from "react";
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
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { IconPlus, IconFilterX } from "@tabler/icons-react";
import { NewAccountForm } from "@/components/new-account-form";
import { EditUserDialog } from "@/components/EditUserDialog";
import { Button } from "@/components/ui/button";

const users = [
  {
    id: "1",
    name: "Alice Smith",
    email: "alice@example.com",
    department: "Engineering",
    role: "Admin",
    lastLogin: "2024-06-10 09:15",
    deskUsage: 12,
    favoriteDesk: "Desk 42",
    status: "Active",
    created: "2024-01-15",
  },
  {
    id: "2",
    name: "Bob Johnson",
    email: "bob@example.com",
    department: "Design",
    role: "Employee",
    lastLogin: "2024-06-09 17:22",
    deskUsage: 8,
    favoriteDesk: "Desk 17",
    status: "Disabled",
    created: "2023-11-03",
  },
  {
    id: "3",
    name: "Carol Williams",
    email: "carol@example.com",
    department: "Marketing",
    role: "Manager",
    lastLogin: "2024-06-11 14:30",
    deskUsage: 15,
    favoriteDesk: "Desk 23",
    status: "Active",
    created: "2024-02-20",
  },
  {
    id: "4",
    name: "David Brown",
    email: "david@example.com",
    department: "Engineering",
    role: "Employee",
    lastLogin: "2024-06-08 11:45",
    deskUsage: 9,
    favoriteDesk: "Desk 15",
    status: "Active",
    created: "2024-03-10",
  },
];

export default function UserManagement() {
  const [usersData, setUsersData] = useState(users);
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
        ? user.favoriteDesk.toLowerCase().includes(filterDesk.toLowerCase())
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

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-bold">User Management</h2>

        <Dialog>
          <DialogTrigger className="btn btn-primary flex items-center gap-2 px-4 py-2">
            <IconPlus className="w-5 h-5" /> Add User
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create New Account</DialogTitle>
            <NewAccountForm />
          </DialogContent>
        </Dialog>
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
    </div>
  );
}
