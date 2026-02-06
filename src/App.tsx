import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import PendingDashboard from "./pages/PendingDashboard";
import SubmittedDashboard from "./pages/SubmittedDashboard";
import EngagementsDashboard from "./pages/EngagementsDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // On page load/reload, clear all authentication data
    // This ensures users are logged out on every reload
    localStorage.removeItem("accessToken");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    // Handle tab/browser close - also clear auth
    const handlePageHide = (e: PageTransitionEvent) => {
      // If page is being persisted (back/forward cache), don't clear
      if (!e.persisted) {
        // Tab close - clear auth
        localStorage.removeItem("accessToken");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pending" element={<PendingDashboard />} />
              <Route path="/submitted" element={<SubmittedDashboard />} />
              <Route path="/engagements" element={<EngagementsDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
