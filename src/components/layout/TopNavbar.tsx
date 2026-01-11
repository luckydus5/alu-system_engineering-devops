import { useState } from 'react';
import { 
  LayoutDashboard, 
  LogOut,
  ChevronDown,
  UserCog,
  Shield,
  Activity,
  Menu,
  X,
  Bell
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDepartments } from '@/hooks/useDepartments';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import hqPowerLogo from '@/assets/hq-power-logo.png';

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { profile, highestRole, roles, grantedDepartmentIds } = useUserRole();
  const { departments } = useDepartments();
  const { unreadCount } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = highestRole === 'admin' || highestRole === 'super_admin';
  const isSuperAdmin = highestRole === 'super_admin';
  const isDirector = highestRole === 'director';

  const primaryDeptId = roles[0]?.department_id;
  const accessibleDeptIds = new Set(
    [primaryDeptId, ...grantedDepartmentIds].filter(Boolean) as string[]
  );
  const navDepartments = isSuperAdmin || isDirector
    ? departments
    : departments.filter((d) => accessibleDeptIds.has(d.id));

  const mainNavItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isDepartmentActive = (code: string) => 
    location.pathname === `/department/${code.toLowerCase()}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 md:px-6">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-3 mr-8">
          <img 
            src={hqPowerLogo} 
            alt="HQ Power" 
            className="h-10 w-auto"
          />
          <span className="font-bold text-lg text-foreground hidden sm:block">HQ Power</span>
        </NavLink>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive(item.url)
                  ? "bg-primary text-primary-foreground shadow-premium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </NavLink>
          ))}

          {/* Departments Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "flex items-center gap-2 px-4 py-2 h-auto text-sm font-medium rounded-lg",
                  navDepartments.some(d => isDepartmentActive(d.code))
                    ? "bg-primary text-primary-foreground shadow-premium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Departments
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
              <DropdownMenuLabel>Select Department</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {navDepartments.map((dept) => (
                <DropdownMenuItem
                  key={dept.id}
                  onClick={() => navigate(`/department/${dept.code.toLowerCase()}`)}
                  className={cn(
                    "cursor-pointer",
                    isDepartmentActive(dept.code) && "bg-primary/10 text-primary"
                  )}
                >
                  {dept.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

        </nav>

        {/* Right side - Notifications & Profile */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-lg"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted">
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-sm font-semibold">{profile?.full_name || 'User'}</span>
                  <span className="text-xs text-muted-foreground capitalize">{highestRole}</span>
                </div>
                <ChevronDown className="h-4 w-4 hidden lg:block text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">{profile?.full_name || 'User'}</span>
                  <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                    <UserCog className="h-4 w-4 mr-2" />
                    User Management
                  </DropdownMenuItem>

                  {isSuperAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/super-admin')} className="cursor-pointer">
                        <Shield className="h-4 w-4 mr-2" />
                        Audit Logs
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => navigate('/system-health')} className="cursor-pointer">
                        <Activity className="h-4 w-4 mr-2" />
                        System Health
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="flex flex-col p-4 gap-1">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.url)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </NavLink>
            ))}

            {isAdmin && (
              <>
                <NavLink
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive('/admin')
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <UserCog className="h-5 w-5" />
                  User Management
                </NavLink>

                {isSuperAdmin && (
                  <>
                    <NavLink
                      to="/super-admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActive('/super-admin')
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Shield className="h-5 w-5" />
                      Audit Logs
                    </NavLink>

                    <NavLink
                      to="/system-health"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                        isActive('/system-health')
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Activity className="h-5 w-5" />
                      System Health
                    </NavLink>
                  </>
                )}
              </>
            )}

            <div className="border-t border-border mt-2 pt-2">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Departments
              </p>
              {navDepartments.map((dept) => (
                <NavLink
                  key={dept.id}
                  to={`/department/${dept.code.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isDepartmentActive(dept.code)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {dept.name}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
