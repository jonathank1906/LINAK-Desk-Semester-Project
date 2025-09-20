import { useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import axios from "axios";

export default function ResetPasswordConfirm() {
  const { uid, token } = useParams();
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/api/auth/users/reset_password_confirm/", {
        uid,
        token,
        new_password: newPassword1,
        re_new_password: newPassword2,
      });
      setSuccess(true);
    } catch (error) {
      alert("Failed to reset password.");
    }
  };

  if (success) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid gap-3">
              <Label htmlFor="new-password1">New Password</Label>
              <Input
                id="new-password1"
                type="password"
                value={newPassword1}
                onChange={e => setNewPassword1(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="new-password2">Confirm New Password</Label>
              <Input
                id="new-password2"
                type="password"
                value={newPassword2}
                onChange={e => setNewPassword2(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Reset Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}