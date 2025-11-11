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
import { AccordionLogin } from "@/components/accordian-login";

import { useState, useEffect } from "react"
import { useAuth } from '../contexts/useAuth';
import { Link, useNavigate } from "react-router-dom"

import {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon
} from "lucide-react"

export function LoginForm({
  className,
  ...props
}) {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const { loginUser, user, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
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
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              {/* Email Field */}
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
                    autoComplete="email"
                    disabled={isLoggingIn}
                    className="pl-10"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              {/* Password Field */}
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/reset/password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                  <Input
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    disabled={isLoggingIn}
                    className="pl-10 pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {/* Submit Button */}
              <div className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn && <Spinner variant="circle" />}
                  {isLoggingIn ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      {/* AccordionLogin below the sign-in form */}
      <AccordionLogin />
    </div>
  );
}