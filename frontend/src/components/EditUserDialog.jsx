import React, { useEffect, useState } from "react";
import { DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EditUserDialog({ user, onClose, onSave }) {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch latest user data
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
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Could not fetch user data.");
        setLoading(false);
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
  favoriteDesk: "Desk 01", // or updated.favoriteDesk if available
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

  if (!user) return null;
  if (loading) return <DialogContent>Loading...</DialogContent>;

  return (
    <>
      <DialogTitle>Edit User</DialogTitle>

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
        <select
          name="department"
          value={formData.department || ""}
          onChange={handleChange}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Department</option>
          <option value="Engineering">Engineering</option>
          <option value="Design">Design</option>
          <option value="Marketing">Marketing</option>
          <option value="HR">HR</option>
          <option value="Finance">Finance</option>
        </select>
      </div>

      <div className="mt-6 flex justify-end gap-4">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </>
  );
}
