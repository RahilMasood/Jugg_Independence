import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, LogOut } from "lucide-react";
import LoginForm from "@/components/LoginForm";
import { toast } from "sonner";
import { engagementApi } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    
    if (accessToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsLoggedIn(true);
        checkUserAccess(userData, accessToken);
      } catch (e) {
        // Invalid stored data, clear it
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const checkUserAccess = async (userData: any, accessToken: string) => {
    setIsCheckingAccess(true);
    try {
      // Check if user has engagements as partner/manager
      // This endpoint only returns engagements where user is engagement_partner or engagement_manager
      const engagements = await engagementApi.getEngagementsForIndependenceTool();
      
      if (engagements && engagements.length > 0) {
        setHasAccess(true);
        // User has access, redirect to engagements
        navigate("/engagements");
      } else {
        setHasAccess(false);
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      // If error is 401, user is not authenticated
      if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        setHasAccess(false);
        setIsLoggedIn(false);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      } else {
        setHasAccess(false);
      }
    } finally {
      setIsCheckingAccess(false);
    }
  };

  const handleUserLogin = async (userData: any, accessToken: string) => {
    setUser(userData);
    setIsLoggedIn(true);
    
    // Update API client token
    const { apiClient } = await import("@/lib/api");
    apiClient.setToken(accessToken);
    
    // Check user access
    await checkUserAccess(userData, accessToken);
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://juggernautuserauth-production.up.railway.app/api/v1";
    
    // Try to call backend logout endpoint if refresh token exists
    if (refreshToken) {
      try {
        await fetch(`${AUTH_API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {
          // Ignore errors during logout
        });
      } catch (error) {
        // Ignore errors during logout
      }
    }
    
    // Clear local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    
    // Update API client
    const { apiClient } = await import("@/lib/api");
    apiClient.setToken(null);
    
    setIsLoggedIn(false);
    setUser(null);
    setHasAccess(null);
    
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

  // Show loading while checking access
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Checking access permissions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access restricted if user doesn't have access
  if (hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Access Restricted</CardTitle>
            <CardDescription className="text-center">
              You do not have access to the Independence Tool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Only Engagement Partners and Engagement Managers can access this tool.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Logged in as:</strong> {user?.email || user?.user_name || user?.name || "Unknown"}
              </p>
            </div>
            <Button onClick={handleLogout} className="w-full" variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has access - they should be redirected to engagements
  // This should not be reached, but show a loading state just in case
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Redirecting to engagements...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
