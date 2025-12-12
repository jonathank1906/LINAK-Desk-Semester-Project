import React, { useEffect, useState } from "react";
import { DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
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

export function EditUserDialog({ user, onClose, onSave }) {
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch latest user data (no loading state)
  useEffect(() => {
    if (!user) return;

    const fetchUser = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/users/${user.id}/`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load user");

        const data = await res.json();
        setFormData(data);
      } catch (err) {
        console.error(err);
        setError("Could not fetch user data.");
      }
    };

    fetchUser();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDepartmentChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      department: value,
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const res = await fetch(`http://localhost:8000/api/users/${user.id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to save");

      const updated = await res.json();

      const formatted = {
        id: updated.id,
        name: `${updated.first_name} ${updated.last_name}`,
        email: updated.email,
        department: updated.department || "—",
        role: updated.is_admin ? "Admin" : "Employee",
        lastLogin: updated.last_login
          ? new Date(updated.last_login).toLocaleString()
          : "Never",
        deskUsage: Math.floor(Math.random() * 20),
        favoriteDesk: "Desk 01",
        deskUsageHistory: [3, 4, 2, 5, 3, 6],
        status: updated.is_active ? "Active" : "Disabled",
        created: new Date(updated.created_at).toLocaleDateString(),
      };

      onSave(formatted);
    } catch (err) {
      console.error(err);
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || !formData) return null;

  return (
    <>
      <AlertDialogTitle>Edit User</AlertDialogTitle>

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="space-y-4 mt-4">

        <Input
          label="First Name"
          name="first_name"
          value={formData.first_name || ""}
          onChange={handleChange}
        />

        <Input
          label="Last Name"
          name="last_name"
          value={formData.last_name || ""}
          onChange={handleChange}
        />

        <Input
          label="Email"
          name="email"
          value={formData.email || ""}
          onChange={handleChange}
        />

        {/* Full-width Shadcn Select */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Department</label>

          <Select
            value={formData.department || ""}
            onValueChange={handleDepartmentChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>

            <SelectContent className="w-full">
              <SelectItem value="Engineering">Engineering</SelectItem>
              <SelectItem value="Design">Design</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="HR">HR</SelectItem>
              <SelectItem value="Finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </>
  );
}
