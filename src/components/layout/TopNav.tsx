import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Briefcase, Shield, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { currentUser } from "@/data/mockData";

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
  const userRole = currentUser.role;

  const filteredNavItems = navItems.filter(
    item => !item.roles || (item.roles as readonly string[]).includes(userRole)
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Independence Declaration System</h1>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">
              {currentUser.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {currentUser.role}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export function SectionNav() {
  const location = useLocation();
  const userRole = currentUser.role;

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
