import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // If already logged in, send user straight to Pending tab
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (accessToken && storedUser) {
      try {
        JSON.parse(storedUser);
        setIsLoggedIn(true);
        navigate("/pending");
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    }
  }, [navigate]);

  const handleUserLogin = async (userData: any, accessToken: string) => {
    setIsLoggedIn(true);

    // Update API client token
    const { apiClient } = await import("@/lib/api");
    apiClient.setToken(accessToken);

    // After login, always go to Pending tab
    navigate("/pending");
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://juggernautuserauth-production.up.railway.app/api/v1";

    if (refreshToken) {
      try {
        await fetch(`${AUTH_API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    const { apiClient } = await import("@/lib/api");
    apiClient.setToken(null);

    setIsLoggedIn(false);
    toast.success("Logged out successfully");
  };

  // Show login form if not logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Independence Tool</h1>
            <p className="text-muted-foreground">Professional Audit Independence Platform</p>
          </div>
          <LoginForm onLoginSuccess={handleUserLogin} />
        </div>
      </div>
    );
  }

  // Logged in root route; we immediately send them to Pending in useEffect,
  // so this should rarely render. Just return null here.
  return null;
};

export default Index;
