import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, Calendar, Clock, ChevronRight, UserPlus,
  CalendarCheck, CheckCircle2,
  Award, PieChart, Building2,
  ArrowRight, AlertTriangle, TrendingUp
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { useCompanies } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';

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
  const { users } = useUsers();
  const { records: todayAttendance } = useAttendance(undefined, new Date());
  const { companies } = useCompanies();

  const recentRequests = useMemo(() => {
    return leaveRequests
      .filter(r => r.status === 'pending' || r.status === 'manager_approved')
      .slice(0, 5);
  }, [leaveRequests]);

  const onLeaveThisWeek = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    return leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      const start = parseISO(r.start_date);
      const end = parseISO(r.end_date);
      return isWithinInterval(start, { start: weekStart, end: weekEnd }) ||
             isWithinInterval(end, { start: weekStart, end: weekEnd }) ||
             (start <= weekStart && end >= weekEnd);
    });
  }, [leaveRequests]);

  const attendanceSummary = useMemo(() => {
    const present = todayAttendance.filter(r => r.status === 'present' || r.status === 'late').length;
    const absent = todayAttendance.filter(r => r.status === 'absent').length;
    const late = todayAttendance.filter(r => r.status === 'late').length;
    return { present, absent, late, total: metrics.activeEmployees };
  }, [todayAttendance, metrics.activeEmployees]);

  const attendanceRate = attendanceSummary.total > 0 
    ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100) 
    : 0;

  const KPI_CARDS = [
    { label: 'Total People', value: metrics.activeEmployees, icon: Users, variant: 'kpi-blue' as const, onClick: () => onNavigate('employees') },
    { label: 'Pending Requests', value: metrics.pendingLeaveRequests, icon: Clock, variant: 'kpi-gold' as const, onClick: () => onNavigate('leave') },
    { label: 'On Leave Today', value: metrics.employeesOnLeaveToday || 0, icon: Calendar, variant: 'kpi-warning' as const, onClick: () => onNavigate('leave') },
    { label: 'Departments', value: metrics.departmentCount, icon: Building2, variant: 'kpi-success' as const, onClick: () => onNavigate('employees') },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {urgentItems.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <p className="text-sm text-foreground flex-1 font-medium">
            {urgentItems.map(item => item.title).join(' · ')}
          </p>
          <Button 
            size="sm" variant="outline"
            className="shrink-0 text-xs h-8 border-warning/30 hover:bg-warning/10"
            onClick={urgentItems[0]?.action}
          >
            Review <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map(stat => (
          <button 
            key={stat.label}
            onClick={stat.onClick}
            className={cn(
              "text-left p-5 rounded-xl transition-all group shadow-corporate hover:shadow-corporate-lg",
              stat.variant
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</p>
                <p className="text-3xl font-bold tracking-tight mt-1.5">{stat.value}</p>
              </div>
              <stat.icon className="h-5 w-5 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              View details
              <ChevronRight className="h-3 w-3" />
            </p>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attendance Snapshot */}
        <Card className="lg:col-span-2 shadow-corporate rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Today's Attendance</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">{format(new Date(), 'EEE, MMM d')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Ring display */}
            <div className="flex items-center justify-center">
              <div className="relative h-36 w-36">
                <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-muted" />
                  <circle 
                    cx="60" cy="60" r="50" fill="none" strokeWidth="10" 
                    strokeLinecap="round"
                    className="stroke-primary"
                    strokeDasharray={`${attendanceRate * 3.14} ${314 - attendanceRate * 3.14}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{attendanceRate}%</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Present</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Present', value: attendanceSummary.present, color: 'text-success' },
                { label: 'Late', value: attendanceSummary.late, color: 'text-warning' },
                { label: 'Absent', value: attendanceSummary.absent, color: 'text-destructive' },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg bg-muted/30">
                  <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            <Button variant="ghost" className="w-full text-xs h-9 text-muted-foreground hover:text-foreground" onClick={() => onNavigate('attendance')}>
              View full report <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="lg:col-span-3 shadow-corporate rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Pending Requests</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting your review</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => onNavigate('leave')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 mx-auto text-success/30 mb-3" />
                <p className="font-semibold text-sm">All caught up</p>
                <p className="text-xs text-muted-foreground mt-0.5">No pending requests right now</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentRequests.map((request) => (
                  <button 
                    key={request.id}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    onClick={() => onNavigate('leave')}
                  >
                    <Avatar className="h-10 w-10 shadow-sm">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {request.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{request.requester?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {LEAVE_TYPE_LABELS[request.leave_type]} · {request.total_days}d · {format(parseISO(request.start_date), 'MMM d')}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-medium shrink-0 border",
                      request.status === 'pending' 
                        ? "text-warning border-warning/30 bg-warning/5" 
                        : "text-info border-info/30 bg-info/5"
                    )}>
                      {request.status === 'pending' ? 'New' : 'Manager OK'}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Add Employee', desc: 'Onboard new staff', icon: UserPlus, tab: 'employees', gradient: 'gradient-primary' },
              { title: 'Review Leave', desc: 'Process approvals', icon: CalendarCheck, tab: 'leave', gradient: 'gradient-gold' },
              { title: 'Performance', desc: 'Run evaluations', icon: Award, tab: 'performance', gradient: 'gradient-primary' },
              { title: 'Analytics', desc: 'View insights', icon: PieChart, tab: 'analytics', gradient: 'gradient-gold' },
            ].map(action => (
              <button
                key={action.title}
                onClick={() => onNavigate(action.tab)}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border shadow-corporate hover:shadow-corporate-lg transition-all text-left group"
              >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", action.gradient)}>
                  <action.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* On Leave This Week */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">On Leave This Week</h3>
            <Badge variant="secondary" className="text-[10px]">{onLeaveThisWeek.length} scheduled</Badge>
          </div>
          <Card className="shadow-corporate rounded-xl">
            <CardContent className="p-0">
              {onLeaveThisWeek.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/15 mb-2" />
                  <p className="text-xs text-muted-foreground">No scheduled leaves this week</p>
                </div>
              ) : (
                <ScrollArea className="h-[220px]">
                  <div className="p-3 space-y-0.5">
                    {onLeaveThisWeek.slice(0, 8).map((leave) => (
                      <div key={leave.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                            {leave.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{leave.requester?.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(parseISO(leave.start_date), 'MMM d')} – {format(parseISO(leave.end_date), 'MMM d')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{LEAVE_TYPE_LABELS[leave.leave_type]}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Company Overview */}
      {companies.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Companies</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map(company => (
              <div key={company.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border shadow-corporate">
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
