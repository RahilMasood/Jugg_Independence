import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "@/components/LoginForm";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { login: authLogin, user } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Don't restore login state from localStorage on mount
  // Reloads should log users out - only check if user is already logged in via AuthContext
  // (which happens when login() is called during the current session)
  useEffect(() => {
    // Only navigate if user is already logged in via AuthContext (from current session)
    if (user) {
      setIsLoggedIn(true);
      navigate("/pending");
    } else {
      setIsLoggedIn(false);
    }
  }, [navigate, user]);

  const handleUserLogin = async (userData: any, accessToken: string) => {
    setIsLoggedIn(true);

    // Update AuthContext immediately
    authLogin(accessToken, userData);

    // Update API client token (AuthContext also does this, but doing it here for safety)
    const { apiClient } = await import("@/lib/api");
    apiClient.setToken(accessToken);

    // After login, always go to Pending tab
    navigate("/pending");
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://userauth.verityaudit.in/api/v1";

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
            <div className="flex justify-center mb-4">
              <img
                src="/logo_name.png"
                alt="Verity AI"
                className="h-12 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Independence Tool</h1>
            <p className="text-muted-foreground">Professional Audit Independence Platform by Verity AI</p>
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
