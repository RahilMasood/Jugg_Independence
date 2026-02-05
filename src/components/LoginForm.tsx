import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  onLoginSuccess: (user: any, accessToken: string) => void;
}

const LoginForm = ({ onLoginSuccess }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // User Auth API URL - Railway deployed service
  // Can be overridden with VITE_AUTH_API_URL environment variable
  const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://juggernautuserauth-production.up.railway.app/api/v1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      console.log('[Login] Attempting login to:', `${AUTH_API_URL}/auth/login`);
      console.log('[Login] Request payload:', { email: email.trim().toLowerCase(), application_type: "Independence_Tool" });
      
      const response = await fetch(`${AUTH_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
          application_type: "Independence_Tool", // Independence tool identifier
        }),
      });

      console.log('[Login] Response status:', response.status, response.statusText);

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        // Try to parse error response
        let errorMessage = "Login failed";
        try {
          const errorText = await response.text();
          console.log('[Login] Error response body:', errorText);
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorData.message || `Server error: ${response.status}`;
          } else {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
        } catch (e) {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const responseText = await response.text();
      console.log('[Login] Success response body:', responseText);
      const data = JSON.parse(responseText);

      if (!data.success) {
        throw new Error(data.error?.message || "Login failed");
      }

      // Store tokens
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("user", JSON.stringify(data.data.user));

      toast.success("Logged in successfully");

      // Call success callback
      onLoginSuccess(data.data.user, data.data.accessToken);
    } catch (error: any) {
      console.error("Login error:", error);
      
      // Provide more helpful error messages
      let errorMessage = error.message || "Failed to connect to server";
      
      if (error.message?.includes("Failed to fetch") || error.name === "TypeError" || error.message?.includes("NetworkError")) {
        // Check if it's a CORS error
        if (error.message?.includes("CORS") || error.message?.includes("Access-Control")) {
          errorMessage = `CORS Error: The server at ${AUTH_API_URL} is not allowing requests from this origin.`;
        } else {
          errorMessage = `Cannot connect to authentication server at ${AUTH_API_URL}. Please check your internet connection and server accessibility.`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access the Independence Tool
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;

