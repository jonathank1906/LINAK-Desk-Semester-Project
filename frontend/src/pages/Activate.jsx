import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export default function SetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { uid, token } = useParams();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await axios.post(
        `http://localhost:8000/api/auth/set-initial-password/${uid}/${token}/`,
        { password }
      );
      navigate("/login");
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("An error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader>
          <h2 className="text-3xl font-bold text-center">Activate Account</h2>
          <p className="text-sm text-gray-500 text-center mt-2">
            Please set your password to activate your account.
          </p>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-2"
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm">
                Confirm Password
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="mt-2"
                autoComplete="new-password"
              />
            </div>
            {loading && (
              <div className="text-blue-500 text-sm text-center">Processing...</div>
            )}
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full py-2 text-base font-semibold"
              disabled={loading}
            >
              Set Password & Activate
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}