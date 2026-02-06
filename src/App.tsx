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
    // On page load, check if this is a reload (flag exists) and clear it
    const reloadFlag = sessionStorage.getItem("__reload_flag");
    if (reloadFlag) {
      // This was a reload, clear the flag
      sessionStorage.removeItem("__reload_flag");
    }

    // Set a flag when page is about to unload (helps detect reload vs close)
    const handleBeforeUnload = () => {
      // Set timestamp to detect if this is a reload
      sessionStorage.setItem("__reload_flag", Date.now().toString());
    };

    // Handle page hide - more reliable for detecting tab close
    const handlePageHide = (e: PageTransitionEvent) => {
      // If page is being persisted (back/forward cache), don't clear
      if (!e.persisted) {
        // Check if this is likely a reload (flag was set very recently)
        const reloadFlag = sessionStorage.getItem("__reload_flag");
        const now = Date.now();
        const flagTime = reloadFlag ? parseInt(reloadFlag, 10) : 0;
        const timeSinceFlag = now - flagTime;

        // If flag was set more than 100ms ago, it's likely a tab close (not reload)
        // Reloads typically set the flag and then immediately reload (< 100ms)
        if (!reloadFlag || timeSinceFlag > 100) {
          // Tab close - clear auth
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
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
