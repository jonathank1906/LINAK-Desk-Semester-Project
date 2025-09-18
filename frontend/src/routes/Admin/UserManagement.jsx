// UserManagement.jsx
import React from "react";
import { DataTable } from "./Users/data-table";
import { columns } from "./Users/columns";

// Sample data - you can move this to a separate file if preferred
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
  return (
    <div className="container mx-auto py-6">
      <h2 className="text-2xl font-bold mb-6">User Management</h2>
      <DataTable columns={columns} data={users} />
    </div>
  );
}