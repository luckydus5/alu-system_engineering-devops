import { 
  LayoutDashboard, 
  LogOut,
  ChevronDown,
  Building2,
  UserCog,
} from 'lucide-react';
import hqPowerLogo from '@/assets/hq-power-logo.png';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDepartments } from '@/hooks/useDepartments';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();
  const { profile, highestRole } = useUserRole();
  const { departments } = useDepartments();

  const mainNavItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isDepartmentActive = departments.some(d => location.pathname.includes(`/department/${d.code.toLowerCase()}`));

  return (
    <Sidebar className="border-r border-sidebar-border gradient-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-secondary/20 rounded-xl blur-lg" />
            <img src={hqPowerLogo} alt="HQ Power" className="relative h-11 w-11 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground text-lg">HQ Power</span>
              <span className="text-xs text-sidebar-foreground/50">Fleet Management</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-xs tracking-wider font-semibold mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                    className={cn(
                      "rounded-xl transition-all duration-200 mb-1",
                      isActive(item.url) 
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-gold font-semibold" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <NavLink to={item.url} className="flex items-center gap-3 py-2.5">
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Departments */}
        <SidebarGroup className="mt-6">
          <Collapsible defaultOpen={isDepartmentActive} className="group/collapsible">
            <SidebarGroupLabel asChild className="text-sidebar-foreground/40 uppercase text-xs tracking-wider font-semibold">
              <CollapsibleTrigger className="flex w-full items-center justify-between py-2 hover:text-sidebar-foreground/60 transition-colors">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {!collapsed && <span>Departments</span>}
                </div>
                {!collapsed && (
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                )}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="mt-2">
                <SidebarMenu>
                  {departments.map((dept) => {
                    const Icon = getDepartmentIcon(dept.code);
                    const url = `/department/${dept.code.toLowerCase()}`;
                    return (
                      <SidebarMenuItem key={dept.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(url)}
                          tooltip={collapsed ? dept.name : undefined}
                          className={cn(
                            "rounded-xl transition-all duration-200 mb-1",
                            isActive(url) 
                              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-gold font-semibold" 
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <NavLink to={url} className="flex items-center gap-3 py-2.5">
                            <Icon className="h-5 w-5" />
                            {!collapsed && <span>{dept.name}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-10 w-10 border-2 border-sidebar-primary/30">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-sm font-semibold">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/50 capitalize">
                {highestRole}
              </p>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={signOut}
            className="h-9 w-9 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
