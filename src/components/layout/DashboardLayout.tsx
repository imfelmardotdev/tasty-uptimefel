import React, { ReactNode } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  Bell,
  Settings,
  LogOut,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/contexts/AuthContext";  // Import auth context

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const { isAuthenticated, logout } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Get user info from localStorage or use default
  const userEmail = localStorage.getItem("userEmail") || "admin@example.com";
  const user = {
    name: "Admin User",
    email: userEmail,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`,
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/",
    },
    {
      title: "Performance",
      icon: <Activity size={20} />,
      path: "/performance",
    },
    {
      title: "Alerts",
      icon: <Bell size={20} />,
      path: "/alerts",
    },
    {
      title: "Team",
      icon: <Users size={20} />,
      path: "/team",
    },
    {
      title: "Settings",
      icon: <Settings size={20} />,
      path: "/settings",
    },
  ];

  const handleLogout = () => {
    logout(); // Clear auth state using context
    navigate('/login'); // Use navigate for routing
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-card border-r">
        <div className="p-4">
          <h2 className="text-xl font-bold">WebMonitor</h2>
          <p className="text-sm text-muted-foreground">Website Monitoring</p>
        </div>
        <Separator />
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid gap-1 px-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        <Separator />
        <div className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <img
              src={user.avatar}
              alt="User avatar"
              className="h-10 w-10 rounded-full"
            />
            <div>
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Log out
          </Button>
        </div>
      </div>

      {/* Mobile sidebar toggle and header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
          <div className="md:hidden">
            <h2 className="text-lg font-bold">WebMonitor</h2>
          </div>
          <div className="flex-1"></div>
          <div className="md:hidden flex items-center gap-2">
            <img
              src={user.avatar}
              alt="User avatar"
              className="h-8 w-8 rounded-full"
            />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
