import { useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentAccessCards } from '@/components/dashboard/DepartmentAccessCards';
import { MobileDepartmentGrid } from '@/components/dashboard/MobileDepartmentGrid';
import { PullToRefreshIndicator } from '@/components/shared/PullToRefreshIndicator';
import { useUserRole } from '@/hooks/useUserRole';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import heroBackground from '@/assets/hero-background.jpg';
import departmentsBackground from '@/assets/departments-background.png';

export default function Dashboard() {
  const { profile, refetch } = useUserRole();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    // Invalidate all queries to refresh data
    await queryClient.invalidateQueries();
    await refetch?.();
    // Small delay for visual feedback
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
        className="animate-fade-in relative min-h-[calc(100vh-8rem)] rounded-2xl p-4 md:p-6"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.85), rgba(255,255,255,0.75)), url(${departmentsBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {/* Pull to Refresh Indicator */}
        {isMobile && (
          <PullToRefreshIndicator 
            pullProgress={pullProgress} 
            isRefreshing={isRefreshing} 
          />
        )}

        {/* Mobile View - Compact grid without heavy welcome section */}
        {isMobile ? (
          <div className="space-y-4">
            {/* Simple mobile greeting */}
            <div className="px-0">
              <p className="text-sm text-muted-foreground">
                {getGreeting()}, <span className="font-semibold text-foreground">{profile?.full_name?.split(' ')[0] || 'User'}</span>
              </p>
              {isRefreshing && (
                <p className="text-xs text-primary mt-1">Refreshing...</p>
              )}
            </div>
            
            {/* Compact Department Grid */}
            <MobileDepartmentGrid />
          </div>
        ) : (
          /* Desktop View - Full layout */
          <div className="space-y-8">
            {/* Welcome Section - Enhanced */}
            <div 
              className="relative overflow-hidden rounded-2xl border border-primary/20 p-6 md:p-8"
              style={{
                backgroundImage: `linear-gradient(to bottom right, rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url(${heroBackground})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {/* Background overlay for text readability */}
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

            {/* Department Access Cards - Main Feature */}
            <DepartmentAccessCards />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
