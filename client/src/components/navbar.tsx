import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { 
  BarChart3, 
  Users, 
  Clock, 
  Monitor, 
  FileText, 
  LogOut, 
  Stethoscope,
  Menu
} from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Dashboard", icon: BarChart3 },
    { path: "/patients", label: "Patients", icon: Users },
    { path: "/queue", label: "Queue", icon: Clock },
    { path: "/display", label: "Display", icon: Monitor },
    { path: "/reports", label: "Reports", icon: FileText },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsOpen(false);
  };

  const handleNavClick = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  if (isMobile) {
    return (
      <nav className="bg-card border-b border-border shadow-sm">
        <div className="flex justify-between items-center h-16 px-4">
          <div className="flex items-center">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="mr-2" data-testid="button-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <h2 className="text-lg font-semibold text-primary flex items-center">
                      <Stethoscope className="w-5 h-5 mr-2" />
                      DentalQueue Pro
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">{user?.name}</p>
                  </div>
                  <div className="flex-1 py-4">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location === item.path;
                      
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleNavClick(item.path)}
                          className={`${
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "text-foreground hover:bg-accent"
                          } w-full flex items-center px-4 py-3 text-left transition-colors`}
                          data-testid={`nav-${item.label.toLowerCase()}`}
                        >
                          <Icon className="w-5 h-5 mr-3" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="p-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      disabled={logoutMutation.isPending}
                      className="w-full justify-start"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold text-primary flex items-center">
              <Stethoscope className="w-5 h-5 mr-2" />
              DentalQueue
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            data-testid="button-logout-mobile"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>
    );
  }

  // Desktop navigation
  return (
    <nav className="bg-card border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary flex items-center">
                <Stethoscope className="w-6 h-6 mr-2" />
                DentalQueue Pro
              </h1>
            </div>
            <div className="flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    className={`${
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    } px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors`}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground" data-testid="clinic-name">
              {user?.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
