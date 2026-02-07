import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Briefcase, Shield, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const navItems = [
  {
    label: "Pending",
    href: "/pending",
    icon: Clock,
  },
  {
    label: "Submitted",
    href: "/submitted",
    icon: CheckCircle2,
  },
  {
    label: "Engagements",
    href: "/engagements",
    icon: Briefcase,
    roles: ["partner", "manager"] as const
  }
];

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();

  // Redirect to login if no user is logged in
  useEffect(() => {
    if (!user && location.pathname !== "/") {
      navigate("/");
    }
  }, [user, navigate, location.pathname]);

  // Don't render if no user (except on login page)
  if (!user && location.pathname !== "/") {
    return null;
  }

  // Get display name from authenticated user
  const displayName = user?.user_name || user?.name || user?.email || "";
  const userRole = user?.role || user?.type || null;

  // Don't render if no display name (user not logged in)
  if (!displayName) {
    return null;
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const AUTH_API_URL =
      import.meta.env.VITE_AUTH_API_URL ||
      "https://userauth.verityaudit.in/api/v1";

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

    // Clear AuthContext
    authLogout();

    toast.success("Logged out successfully");
    navigate("/");
  };

  const filteredNavItems = navItems.filter(
    item => !item.roles || (item.roles as readonly string[]).includes(userRole)
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/logo_name.png"
            alt="Verity AI"
            className="h-8 object-contain"
          />
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
            Independence Tool
          </h1>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {displayName}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {displayName
              ? displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "U"}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 dark:hover:text-red-300 transition-colors font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function SectionNav() {
  const location = useLocation();
  const { user } = useAuth();
  const userRole = user?.role || user?.type || null;

  const filteredNavItems = navItems.filter(
    item => !item.roles || (item.roles as readonly string[]).includes(userRole)
  );

  return (
    <nav className="mb-6">
      <div className="inline-flex items-center rounded-lg bg-muted p-1">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/" && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-4 w-4",
                isActive ? "text-accent" : "text-muted-foreground"
              )} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
