import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from '@/components/ui/shadcn-io/spinner';

import { useState, useEffect } from "react"
import { useAuth } from '../contexts/useAuth';
import { Link, useNavigate } from "react-router-dom"

export function LoginForm({
  className,
  ...props
}) {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { loginUser, user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      nav("/");
    }
  }, [user, loading, nav]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoggingIn) return; // Prevent multiple clicks
    
    setIsLoggingIn(true);
    const success = await loginUser(email, password)
    if (!success) {
      setEmail("")
      setPassword("")
    }
    setIsLoggingIn(false);
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="email">Email</Label>
                <Input
                  onChange={(e) => setEmail(e.target.value)}
                  value={email}
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  disabled={isLoggingIn}
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/reset/password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  onChange={(e) => setPassword(e.target.value)}
                  value={password}
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  disabled={isLoggingIn}
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleLogin} type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn && <Spinner variant="circle"/>}
                  {isLoggingIn ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}