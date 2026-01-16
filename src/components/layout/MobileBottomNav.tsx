import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, Settings, User, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
}

export function MobileBottomNav() {
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const navItems: NavItem[] = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Warehouse, label: 'Warehouse', path: '/department/wh' },
    { icon: Bell, label: 'Alerts', path: '/notifications', badge: unreadCount },
    { icon: Settings, label: 'Settings', path: '/admin' },
  ];

  // Don't show on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background with blur */}
      <div className="bg-background/95 backdrop-blur-lg border-t border-border shadow-lg">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative',
                  'min-w-[64px]',
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground active:bg-muted/50'
                )}
              >
                <div className="relative">
                  <item.icon className={cn(
                    'h-5 w-5 transition-transform',
                    isActive && 'scale-110'
                  )} />
                  {/* Badge */}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  isActive && 'font-semibold'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}