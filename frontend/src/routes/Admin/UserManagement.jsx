import React, { useState, useMemo } from "react";
import { DataTable } from "./Users/data-table";
import { columns as columnsFunc } from "./Users/columns";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { IconPlus } from "@tabler/icons-react";
import { NewAccountForm } from "@/components/new-account-form";
import { EditUserDialog } from "@/components/EditUserDialog"; // AI suggested

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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");

  // Filtered users based on search and role
  const filteredUsers = useMemo(() => {
    return usersData.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterRole ? user.role === filterRole : true)
    );
  }, [usersData, searchTerm, filterRole]);

  // Columns configured with handlers
  const columns = columnsFunc({
    setUsers: setUsersData,
    openViewDialog: setViewingUser,
    openEditDialog: setEditingUser,
  });

  // Disable selected button handler - note: implement selected rows retrieval according to DataTable API
  const handleDisableSelected = () => {
    const selected = []; // TODO: replace with actual selected users retrieval
    if (!selected.length) return;
    if (!confirm("Disable selected users?")) return;

    setUsersData((users) =>
      users.map((u) =>
        selected.find((s) => s.id === u.id) ? { ...u, status: "Disabled" } : u
      )
    );
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Dialog>
          <DialogTrigger className="btn btn-primary flex items-center justify-center">
            <IconPlus className="w-5 h-5" />
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create New Account</DialogTitle>
            <NewAccountForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and filter inputs */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name..."
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
        <button className="btn btn-danger" onClick={handleDisableSelected}>
          Disable Selected
        </button>
      </div>

      <DataTable columns={columns} data={filteredUsers} />

      {/* View User Dialog */}
      {viewingUser && (
        <Dialog open onOpenChange={() => setViewingUser(null)}>
          <DialogContent>
            <DialogTitle>{viewingUser.name}</DialogTitle>
            <p>Email: {viewingUser.email}</p>
            <p>Status: {viewingUser.status}</p>
            {/* Add more user details here */}
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={(updatedUser) => {
          setUsersData((prev) =>
            prev.map((user) => (user.id === updatedUser.id ? updatedUser : user))
          );
          setEditingUser(null);
        }}
      />
    </div>
  );
}
