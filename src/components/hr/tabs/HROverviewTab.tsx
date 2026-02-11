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
  ArrowRight, AlertTriangle
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

  return (
    <div className="space-y-8">
      {/* Alert Banner */}
      {urgentItems.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
            {urgentItems.map(item => item.title).join(' · ')}
          </p>
          <Button 
            size="sm" variant="ghost" 
            className="text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 shrink-0 text-xs h-8"
            onClick={urgentItems[0]?.action}
          >
            Review <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total People', value: metrics.activeEmployees, sub: 'Active employees', onClick: () => onNavigate('employees') },
          { label: 'Pending Requests', value: metrics.pendingLeaveRequests, sub: 'Needs review', onClick: () => onNavigate('leave') },
          { label: 'On Leave Today', value: metrics.employeesOnLeaveToday || 0, sub: 'Currently away', onClick: () => onNavigate('leave') },
          { label: 'Departments', value: metrics.departmentCount, sub: `${companies.length} companies`, onClick: () => onNavigate('employees') },
        ].map(stat => (
          <button 
            key={stat.label}
            onClick={stat.onClick}
            className="text-left p-5 rounded-2xl bg-card border hover:border-foreground/10 hover:shadow-sm transition-all group"
          >
            <p className="text-xs text-muted-foreground font-medium tracking-wide">{stat.label}</p>
            <p className="text-3xl font-semibold tracking-tight mt-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {stat.sub}
              <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Attendance Snapshot */}
        <Card className="lg:col-span-2 border rounded-2xl shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Today's Attendance</CardTitle>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Ring-style display */}
            <div className="flex items-center justify-center">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-muted" />
                  <circle 
                    cx="60" cy="60" r="52" fill="none" strokeWidth="8" 
                    strokeLinecap="round"
                    className="stroke-foreground"
                    strokeDasharray={`${attendanceRate * 3.27} ${327 - attendanceRate * 3.27}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{attendanceRate}%</span>
                  <span className="text-[10px] text-muted-foreground">Present</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-semibold text-emerald-600">{attendanceSummary.present}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-amber-600">{attendanceSummary.late}</p>
                <p className="text-[10px] text-muted-foreground">Late</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-red-600">{attendanceSummary.absent}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
            </div>

            <Button variant="ghost" className="w-full text-xs h-9 text-muted-foreground hover:text-foreground" onClick={() => onNavigate('attendance')}>
              View full report <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="lg:col-span-3 border rounded-2xl shadow-none">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Pending Requests</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting your review</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => onNavigate('leave')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="font-medium text-sm text-foreground">All caught up</p>
                <p className="text-xs text-muted-foreground mt-0.5">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentRequests.map((request) => (
                  <button 
                    key={request.id}
                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    onClick={() => onNavigate('leave')}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
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
                      "text-[10px] font-medium shrink-0",
                      request.status === 'pending' 
                        ? "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30" 
                        : "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30"
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
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { title: 'Add Employee', desc: 'Onboard new staff', icon: UserPlus, tab: 'employees' },
              { title: 'Review Leave', desc: 'Process approvals', icon: CalendarCheck, tab: 'leave' },
              { title: 'Performance', desc: 'Run evaluations', icon: Award, tab: 'performance' },
              { title: 'Analytics', desc: 'View insights', icon: PieChart, tab: 'analytics' },
            ].map(action => (
              <button
                key={action.title}
                onClick={() => onNavigate(action.tab)}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border hover:border-foreground/10 hover:shadow-sm transition-all text-left group"
              >
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-foreground/5 transition-colors">
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* On Leave This Week */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">On Leave This Week</h3>
            <span className="text-xs text-muted-foreground">{onLeaveThisWeek.length} scheduled</span>
          </div>
          <Card className="border rounded-2xl shadow-none">
            <CardContent className="p-0">
              {onLeaveThisWeek.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/15 mb-2" />
                  <p className="text-xs text-muted-foreground">No scheduled leaves this week</p>
                </div>
              ) : (
                <ScrollArea className="h-[200px]">
                  <div className="p-2 space-y-0.5">
                    {onLeaveThisWeek.slice(0, 8).map((leave) => (
                      <div key={leave.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
                            {leave.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{leave.requester?.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(parseISO(leave.start_date), 'MMM d')} – {format(parseISO(leave.end_date), 'MMM d')}
                          </p>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{LEAVE_TYPE_LABELS[leave.leave_type]}</span>
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
          <h3 className="text-sm font-semibold text-foreground mb-3">Companies</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map(company => (
              <div key={company.id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border">
                <div className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  company.parent_id ? 'bg-muted-foreground/30' : 'bg-foreground'
                )} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{company.name}</p>
                  <p className="text-[10px] text-muted-foreground">{company.parent_id ? 'Subsidiary' : 'Parent'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
