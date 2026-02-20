import { useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentAccessCards } from '@/components/dashboard/DepartmentAccessCards';
import { PullToRefreshIndicator } from '@/components/shared/PullToRefreshIndicator';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';
import { Sparkles, Users, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import heroBackground from '@/assets/hero-background.jpg';

export default function Dashboard() {
  const { profile, refetch } = useUserRole();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { employees, loading: employeesLoading } = useEmployees();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    await refetch?.();
    await new Promise(resolve => setTimeout(resolve, 500));
  }, [queryClient, refetch]);

  const { containerRef, isRefreshing, pullProgress } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !isMobile
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout title="Dashboard">
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className="animate-fade-in relative min-h-[calc(100vh-8rem)]"
      >
        {/* Pull to Refresh Indicator */}
        {isMobile && (
          <PullToRefreshIndicator 
            pullProgress={pullProgress} 
            isRefreshing={isRefreshing} 
          />
        )}

        <div className="space-y-5 md:space-y-8">
          {/* Welcome Section - Desktop */}
          {!isMobile && (
            <div 
              className="relative overflow-hidden rounded-2xl border border-primary/20 p-6 md:p-8"
              style={{
                backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url(${heroBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-secondary/20" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/80">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                    {getGreeting()}, <span className="text-secondary">{profile?.full_name?.split(' ')[0] || 'User'}</span>!
                  </h1>
                  <p className="text-white/90 text-lg max-w-xl drop-shadow">
                    Here's your operations overview. Monitor field updates and track department activities in real-time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Welcome Section - Mobile: compact & touch-friendly */}
          {isMobile && (
            <div className="px-1 pt-1 pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-foreground leading-tight">
                    {getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'} 👋
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {isRefreshing && (
                  <span className="text-xs text-primary font-medium animate-pulse">Refreshing…</span>
                )}
              </div>
            </div>
          )}

          {/* Employee KPI Strip - responsive */}
          {(() => {
            const active = employees.filter(e => e.employment_status === 'active').length;
            const inactive = employees.filter(e => e.employment_status !== 'active').length;
            const kpis = [
              { label: 'Total', fullLabel: 'Total Employees', value: employees.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Active', fullLabel: 'Active', value: active, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Inactive', fullLabel: 'Inactive / On Leave', value: inactive, icon: UserX, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
            ];
            return (
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {kpis.map(({ label, fullLabel, value, icon: Icon, color, bg }) => (
                  <Card key={label} className="border shadow-sm">
                    <CardContent className="p-2.5 md:p-4 flex items-center gap-2 md:gap-3">
                      <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl ${bg} shrink-0`}>
                        <Icon className={`h-4 w-4 md:h-5 md:w-5 ${color}`} />
                      </div>
                      <div className="min-w-0">
                        {employeesLoading ? (
                          <Skeleton className="h-6 md:h-7 w-10 md:w-12 mb-0.5 md:mb-1" />
                        ) : (
                          <p className="text-xl md:text-2xl font-bold text-foreground leading-none">{value}</p>
                        )}
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 md:mt-1 truncate">
                          <span className="md:hidden">{label}</span>
                          <span className="hidden md:inline">{fullLabel}</span>
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()}

          {/* Department Access Cards */}
          <DepartmentAccessCards />
        </div>
      </div>
    </DashboardLayout>
  );
}
