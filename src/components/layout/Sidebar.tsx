import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  FileText,
  Bell,
  Settings,
  Truck,
  Users,
  Building2,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Sidebar = () => {
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [departments, setDepartments] = useState<Tables<"departments">[]>([]);

  useEffect(() => {
    const fetchDepartments = async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      if (data) setDepartments(data);
    };
    fetchDepartments();
  }, []);

  const mainNavItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/notifications", label: "Notifications", icon: Bell },
  ];

  const isAdmin = role === "admin" || role === "director";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">
              HQ Power
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>

          {/* Departments Section */}
          {!collapsed && (
            <div className="mt-6">
              <p className="mb-2 px-3 text-xs font-semibold uppercase text-sidebar-foreground/60">
                Departments
              </p>
            </div>
          )}
          <div className="space-y-1">
            {departments.map((dept) => {
              const isActive = location.pathname === `/department/${dept.code}`;
              return (
                <Link
                  key={dept.id}
                  to={`/department/${dept.code}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Building2 className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{dept.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <>
              {!collapsed && (
                <div className="mt-6">
                  <p className="mb-2 px-3 text-xs font-semibold uppercase text-sidebar-foreground/60">
                    Admin
                  </p>
                </div>
              )}
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  location.pathname === "/admin"
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Admin Panel</span>}
              </Link>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "justify-center"
            )}
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};
