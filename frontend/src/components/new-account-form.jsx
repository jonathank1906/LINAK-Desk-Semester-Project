import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

// Simple secure password generator
function generateSecurePassword(length = 16) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
  let password = "";
  for (let i = 0, n = charset.length; i < length; ++i) {
    password += charset.charAt(Math.floor(Math.random() * n));
  }
  return password;
}

export function NewAccountForm({ className, ...props }) {
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [email, setEmail] = useState("john.doe@company.com");
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
      username: username,  // Added username field
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
        console.log("Full error response:", data); // Debug log
        // Handle specific error messages
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
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Create New Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateAccount}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
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
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
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
                    Account created successfully! Password reset email sent to {email}
                  </div>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}