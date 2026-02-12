import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Building2, ClipboardList,
  Hand, Wine, Heart, BarChart3,
  Briefcase, CalendarDays, Timer,
  UserRoundPlus, Award, PieChart, Landmark
} from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useCompanies } from '@/hooks/useCompanies';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface HROverviewTabProps {
  departmentId: string;
  metrics: {
    pendingLeaveRequests: number;
    approvedThisMonth: number;
    activeEmployees: number;
    openPositions: number;
    employeeGrowth: number;
    retentionRate: number;
    departmentCount: number;
    employeesOnLeaveToday: number;
  };
  urgentItems: Array<{ type: string; title: string; priority: string; action: () => void }>;
  onNavigate: (tab: string) => void;
}

export function HROverviewTab({ departmentId, metrics, urgentItems, onNavigate }: HROverviewTabProps) {
  const { leaveRequests } = useLeaveRequests(undefined, true);
  const { companies } = useCompanies();
  const { user } = useAuth();

  // Compute current user's own leave balance (accrued - used)
  const leaveStats = useMemo(() => {
    if (!user) return { annualBalance: 0, personalDays: 0 };
    const now = new Date();
    const completedMonths = now.getMonth(); // Jan=0 means 0 completed, Feb=1 means 1 completed
    const monthlyAccrual = 1.5;
    const accrued = completedMonths * monthlyAccrual; // 1 completed month = 1.5 days

    const myApproved = leaveRequests.filter(r => r.status === 'approved' && r.requester_id === user.id);
    const annualUsed = myApproved
      .filter(r => r.leave_type === 'annual')
      .reduce((sum, r) => sum + r.total_days, 0);
    const personalDays = myApproved
      .filter(r => r.leave_type === 'personal' || r.leave_type === 'sick')
      .reduce((sum, r) => sum + r.total_days, 0);

    const annualBalance = Math.max(0, accrued - annualUsed);
    return { annualBalance, personalDays };
  }, [leaveRequests, user]);

  const STAT_CARDS = [
    { 
      label: 'NEW TASKS', 
      value: metrics.pendingLeaveRequests.toString(), 
      icon: ClipboardList,
      gradient: 'bg-gradient-to-br from-[hsl(340,82%,52%)] to-[hsl(340,82%,42%)]',
      onClick: () => onNavigate('leave')
    },
    { 
      label: 'ANNUAL LEAVE', 
      value: `${leaveStats.annualBalance} days`, 
      icon: Hand,
      gradient: 'bg-gradient-to-br from-[hsl(187,71%,45%)] to-[hsl(187,71%,35%)]',
      onClick: () => onNavigate('leave')
    },
    { 
      label: 'PERSONAL LEAVE', 
      value: `${leaveStats.personalDays} days`, 
      icon: Wine,
      gradient: 'bg-gradient-to-br from-[hsl(88,50%,53%)] to-[hsl(88,50%,40%)]',
      onClick: () => onNavigate('leave')
    },
    { 
      label: 'TOTAL EMPLOYEES', 
      value: metrics.activeEmployees.toString(), 
      icon: Heart,
      gradient: 'bg-gradient-to-br from-[hsl(36,100%,50%)] to-[hsl(36,100%,40%)]',
      onClick: () => onNavigate('employees')
    },
  ];

  // Quick-access navigation cards
  const WORKBENCH_ITEMS = [
    { label: 'Leave Management', icon: CalendarDays, tab: 'leave', color: 'text-[hsl(187,71%,45%)]', bg: 'bg-[hsl(187,71%,92%)]', badge: metrics.pendingLeaveRequests > 0 ? metrics.pendingLeaveRequests : undefined },
    { label: 'Attendance', icon: Timer, tab: 'attendance', color: 'text-[hsl(262,60%,50%)]', bg: 'bg-[hsl(262,60%,93%)]' },
    { label: 'Onboarding / Offboarding', icon: UserRoundPlus, tab: 'onboarding', color: 'text-[hsl(340,82%,52%)]', bg: 'bg-[hsl(340,82%,93%)]' },
    { label: 'Performance', icon: Award, tab: 'performance', color: 'text-[hsl(88,50%,40%)]', bg: 'bg-[hsl(88,50%,90%)]' },
  ];

  const GENERAL_ITEMS = [
    { label: 'Employee Hub', icon: Users, tab: 'employees', color: 'text-[hsl(207,90%,54%)]', bg: 'bg-[hsl(207,90%,93%)]' },
    { label: 'Analytics & Reports', icon: PieChart, tab: 'analytics', color: 'text-[hsl(36,100%,50%)]', bg: 'bg-[hsl(36,100%,90%)]' },
    { label: 'Positions & Roles', icon: Briefcase, tab: 'employees', color: 'text-[hsl(262,60%,50%)]', bg: 'bg-[hsl(262,60%,93%)]' },
    { label: 'Company Overview', icon: Landmark, tab: 'employees', color: 'text-[hsl(187,71%,45%)]', bg: 'bg-[hsl(187,71%,92%)]' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Home</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 mt-1">
          <span className="text-lg">🚀</span> Dashboard
        </h1>
      </div>

      {/* Colorful Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(stat => (
          <button 
            key={stat.label}
            onClick={stat.onClick}
            className={cn(
              "flex items-center gap-4 p-6 rounded-xl text-white text-left transition-transform hover:-translate-y-0.5 shadow-lg",
              stat.gradient
            )}
          >
            <div className="h-12 w-12 flex items-center justify-center opacity-90">
              <stat.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-medium opacity-90 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-bold mt-0.5">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Workbench */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Workbench</h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {WORKBENCH_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.tab)}
              className="relative flex flex-col items-center gap-3 p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group text-center"
            >
              {item.badge && (
                <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5">
                  {item.badge}
                </Badge>
              )}
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", item.bg)}>
                <item.icon className={cn("h-5 w-5", item.color)} />
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* General */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">General</h3>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {GENERAL_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.tab)}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group text-center"
            >
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", item.bg)}>
                <item.icon className={cn("h-5 w-5", item.color)} />
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Company Overview */}
      {companies.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Companies</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map(company => (
              <div key={company.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border shadow-sm">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                  company.parent_id ? 'bg-muted' : 'gradient-primary'
                )}>
                  <Building2 className={cn("h-5 w-5", company.parent_id ? 'text-muted-foreground' : 'text-primary-foreground')} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{company.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {company.parent_id ? 'Subsidiary' : 'Parent'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
