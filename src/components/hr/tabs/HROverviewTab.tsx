import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Calendar, Clock, Building2,
  ClipboardList, Target,
  Hand, Wine, Heart, UserPlus, BarChart3,
  Briefcase, ChevronRight
} from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useCompanies } from '@/hooks/useCompanies';
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

  // Compute leave stats
  const leaveStats = useMemo(() => {
    const approved = leaveRequests.filter(r => r.status === 'approved');
    const annualHours = approved
      .filter(r => r.leave_type === 'annual')
      .reduce((sum, r) => sum + r.total_days * 8, 0);
    const personalHours = approved
      .filter(r => r.leave_type === 'personal' || r.leave_type === 'sick')
      .reduce((sum, r) => sum + r.total_days * 8, 0);
    return { annualHours, personalHours };
  }, [leaveRequests]);

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
      value: `${leaveStats.annualHours} hr`, 
      icon: Hand,
      gradient: 'bg-gradient-to-br from-[hsl(187,71%,45%)] to-[hsl(187,71%,35%)]',
      onClick: () => onNavigate('leave')
    },
    { 
      label: 'PERSONAL LEAVE', 
      value: `${leaveStats.personalHours} hr`, 
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
    { label: 'Leave Management', icon: Calendar, tab: 'leave', color: 'text-[hsl(187,71%,45%)]', bg: 'bg-[hsl(187,71%,95%)]', badge: metrics.pendingLeaveRequests > 0 ? metrics.pendingLeaveRequests : undefined },
    { label: 'Attendance', icon: Clock, tab: 'attendance', color: 'text-[hsl(262,60%,50%)]', bg: 'bg-[hsl(262,60%,95%)]' },
    { label: 'Onboarding / Offboarding', icon: UserPlus, tab: 'onboarding', color: 'text-[hsl(340,82%,52%)]', bg: 'bg-[hsl(340,82%,95%)]' },
    { label: 'Performance', icon: Target, tab: 'performance', color: 'text-[hsl(88,50%,40%)]', bg: 'bg-[hsl(88,50%,93%)]' },
  ];

  const GENERAL_ITEMS = [
    { label: 'Employee Hub', icon: Users, tab: 'employees', color: 'text-[hsl(207,90%,54%)]', bg: 'bg-[hsl(207,90%,95%)]' },
    { label: 'Analytics & Reports', icon: BarChart3, tab: 'analytics', color: 'text-[hsl(36,100%,50%)]', bg: 'bg-[hsl(36,100%,93%)]' },
    { label: 'Positions & Roles', icon: Briefcase, tab: 'employees', color: 'text-[hsl(262,60%,50%)]', bg: 'bg-[hsl(262,60%,95%)]' },
    { label: 'Company Overview', icon: Building2, tab: 'employees', color: 'text-[hsl(187,71%,45%)]', bg: 'bg-[hsl(187,71%,95%)]' },
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

      {/* Quick Access Cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Workbench */}
        <Card className="shadow-sm rounded-xl border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Workbench</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1">
              {WORKBENCH_ITEMS.map(item => (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.tab)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/60 transition-colors group text-left"
                >
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                    <item.icon className={cn("h-4.5 w-4.5", item.color)} />
                  </div>
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5">
                      {item.badge}
                    </Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* General */}
        <Card className="shadow-sm rounded-xl border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">General</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-1">
              {GENERAL_ITEMS.map(item => (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.tab)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/60 transition-colors group text-left"
                >
                  <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", item.bg)}>
                    <item.icon className={cn("h-4.5 w-4.5", item.color)} />
                  </div>
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
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
