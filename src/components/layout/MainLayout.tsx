import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TopNav, SectionNav } from "./TopNav";
import { useAuth } from "@/contexts/AuthContext";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to login if no user is logged in
  useEffect(() => {
    if (!user && location.pathname !== "/") {
      navigate("/");
    }
  }, [user, navigate, location.pathname]);

  // Don't render layout if user is not logged in (will redirect to login)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <SectionNav />
          {children}
        </div>
      </main>
    </div>
  );
}
