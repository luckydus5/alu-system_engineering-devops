import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Building2, ClipboardList,
  Hand, Wine, Heart, BarChart3,
  Briefcase, CalendarDays, Timer,
  UserRoundPlus, Award, PieChart, Landmark
} from 'lucide-react';
import { useLeaveRequests, useLeaveBalances } from '@/hooks/useLeaveRequests';
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

  // Use leave_balances table for the current user's balance
  const { balances } = useLeaveBalances(user?.id);

  const leaveStats = useMemo(() => {
    const annualBal = balances.find(b => b.leave_type === 'annual');
    const annualBalance = annualBal ? Math.max(0, annualBal.total_days - annualBal.used_days) : 0;

    const personalBal = balances.find(b => b.leave_type === 'personal');
    const sickBal = balances.find(b => b.leave_type === 'sick');
    const personalRemaining = (personalBal ? Math.max(0, personalBal.total_days - personalBal.used_days) : 0)
      + (sickBal ? Math.max(0, sickBal.total_days - sickBal.used_days) : 0);

    return { annualBalance, personalDays: personalRemaining };
  }, [balances]);

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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">Home</p>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 mt-0.5">
          <span>🚀</span> Dashboard
        </h1>
      </div>

      {/* Stat Cards — 2-col on mobile, 4-col on lg */}
      <div className="grid gap-2.5 grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(stat => (
          <button 
            key={stat.label}
            onClick={stat.onClick}
            className={cn(
              "flex items-center gap-2.5 p-3.5 md:p-5 rounded-xl text-white text-left transition-transform shadow-md active:scale-95 touch-manipulation",
              stat.gradient
            )}
          >
            <div className="h-9 w-9 md:h-11 md:w-11 flex items-center justify-center opacity-90 shrink-0 bg-white/10 rounded-lg">
              <stat.icon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] md:text-[11px] font-semibold opacity-80 uppercase tracking-wider leading-tight">{stat.label}</p>
              <p className="text-lg md:text-2xl font-bold mt-0.5 truncate leading-tight">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Workbench */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 px-0.5">Workbench</h3>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          {WORKBENCH_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.tab)}
              className="relative flex flex-col items-center gap-2 p-4 md:p-5 rounded-xl bg-card border shadow-sm hover:shadow-md active:scale-95 transition-all text-center touch-manipulation"
            >
              {item.badge && (
                <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 min-w-[18px]">
                  {item.badge}
                </Badge>
              )}
              <div className={cn("h-11 w-11 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                <item.icon className={cn("h-5 w-5 md:h-6 md:w-6", item.color)} />
              </div>
              <span className="text-[11px] md:text-sm font-medium leading-snug">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* General */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 px-0.5">General</h3>
        <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
          {GENERAL_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => onNavigate(item.tab)}
              className="flex flex-col items-center gap-2 p-4 md:p-5 rounded-xl bg-card border shadow-sm hover:shadow-md active:scale-95 transition-all text-center touch-manipulation"
            >
              <div className={cn("h-11 w-11 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                <item.icon className={cn("h-5 w-5 md:h-6 md:w-6", item.color)} />
              </div>
              <span className="text-[11px] md:text-sm font-medium leading-snug">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Company Overview */}
      {companies.length > 1 && (
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5 px-0.5">Companies</h3>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map(company => (
              <div key={company.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border shadow-sm">
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  company.parent_id ? 'bg-muted' : 'gradient-primary'
                )}>
                  <Building2 className={cn("h-4 w-4", company.parent_id ? 'text-muted-foreground' : 'text-primary-foreground')} />
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
