import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DepartmentAccessCards } from '@/components/dashboard/DepartmentAccessCards';
import { useUserRole } from '@/hooks/useUserRole';
import { Sparkles } from 'lucide-react';

export default function Dashboard() {
  const { profile } = useUserRole();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section - Enhanced */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-secondary/20 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {getGreeting()}, <span className="text-gradient">{profile?.full_name?.split(' ')[0] || 'User'}</span>!
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Here's your operations overview. Monitor field updates and track department activities in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Department Access Cards - Main Feature */}
        <DepartmentAccessCards />
      </div>
    </DashboardLayout>
  );
}
