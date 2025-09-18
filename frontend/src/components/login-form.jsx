import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { useState } from "react"
import { useAuth } from '../contexts/useAuth';


export function LoginForm({
  className,
  ...props
}) {

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const { loginUser } = useAuth();


  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await loginUser(username, password)
    if (!success) {
      setUsername("")
      setPassword("")
    }
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
                <Label htmlFor="username">Username</Label>
                <Input onChange={(e) => setUsername(e.target.value)} value={username} id="username" type="text" required />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input onChange={(e) => setPassword(e.target.value)} value={password} id="password" type="password" required />
              </div>
              <div className="flex flex-col gap-3">
                <Button onClick={handleLogin} type="submit" className="w-full">
                  Sign in
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
