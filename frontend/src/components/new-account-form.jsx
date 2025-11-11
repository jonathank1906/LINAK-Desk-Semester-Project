import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
  MailIcon,
} from "lucide-react"

export function NewAccountForm({ className, ...props }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const tempPassword = "TempPassword123!"
    const username = email.split('@')[0]; // Auto-generate username from email

    const body = {
      email,
      first_name: firstName,
      last_name: lastName,
      username: username,
      password: tempPassword,
      re_password: tempPassword,
    };

    try {
      // Step 1: Create user account
      const res = await fetch("http://localhost:8000/api/auth/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        console.log("Full error response:", data);
        if (data.email) {
          throw new Error(`Email error: ${data.email[0]}`);
        }
        if (data.username) {
          throw new Error(`Username error: ${data.username[0]}`);
        }
        if (data.password) {
          throw new Error(`Password error: ${data.password[0]}`);
        }
        throw new Error(data?.detail || "Failed to create account");
      }

      // Step 2: Send password reset email
      const resetRes = await fetch("http://localhost:8000/api/auth/users/reset_password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!resetRes.ok) {
        console.log("Password reset email failed, but account was created");
      }

      setSuccess(true);

      // Clear form after success
      setFirstName("");
      setLastName("");
      setEmail("");

    } catch (err) {
      setError(err.message);
      console.error("Account creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Employee Account</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleCreateAccount} className={cn("flex flex-col gap-6", className)} {...props}>
         <div className="mt-2" /> 
        <div className="grid gap-3">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="Enter first name"
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            placeholder="Enter last name"
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10"
              placeholder="Enter employee email address"
            />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </Button>
          {error && (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-500 text-sm p-2 bg-green-50 rounded">
              Account created successfully! Password reset email sent.
            </div>
          )}
        </div>
      </form>
    </>
  );
}