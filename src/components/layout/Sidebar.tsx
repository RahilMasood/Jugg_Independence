import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, Briefcase, Shield, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { currentUser } from "@/data/mockData";

const navItems = [
  {
    label: "Pending",
    href: "/pending",
    icon: Clock,
    description: "Declarations awaiting submission"
  },
  {
    label: "Submitted",
    href: "/submitted",
    icon: CheckCircle2,
    description: "Completed declarations"
  },
  {
    label: "Engagements",
    href: "/engagements",
    icon: Briefcase,
    description: "Manage engagement teams",
    roles: ["partner", "manager"] as const
  }
];

export function Sidebar() {
  const location = useLocation();
  const userRole = currentUser.role;

  const filteredNavItems = navItems.filter(
    item => !item.roles || (item.roles as readonly string[]).includes(userRole)
  );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground">Independence</h1>
            <p className="text-xs text-sidebar-muted">Declaration System</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/" && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground"
                )} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-foreground">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-sidebar-muted capitalize">
                {currentUser.role}
              </p>
            </div>
            <button className="rounded-lg p-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
