import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import axios from "axios";
import {
  MailIcon,
} from "lucide-react"


const ResetPassword = () => {
  const [status, setStatus] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        "http://localhost:8000/api/auth/users/reset_password/",
        { email }
      );
      setMessage("Password reset email sent!");
      setTimeout(() => setStatus(true), 1500); // Redirect after showing message
    } catch (error) {
      setMessage("Failed to send reset email.");
    }
  };

  if (status) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10"
                  placeholder="Enter your email address"
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Send password reset email
            </Button>
            {message && (
              <div className="text-sm text-muted-foreground mt-2">{message}</div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;