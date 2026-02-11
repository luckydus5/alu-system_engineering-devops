import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, Calendar, Clock, ChevronRight, UserPlus,
  CalendarCheck, AlertCircle, CheckCircle2,
  Zap, Award, PieChart, Building2,
  Activity, Sparkles
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

function StatCard({ title, value, subtitle, icon: Icon, gradient, onClick }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType; gradient: string; onClick?: () => void;
}) {
  return (
    <Card 
      className="group border-0 shadow-corporate cursor-pointer transition-all duration-300 hover:shadow-corporate-lg hover:-translate-y-0.5 overflow-hidden"
      onClick={onClick}
    >
      <div className={cn("h-0.5 w-full bg-gradient-to-r", gradient)} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm transition-transform group-hover:scale-110", gradient)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionCard({ title, description, icon: Icon, gradient, onClick }: {
  title: string; description: string; icon: React.ElementType; gradient: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl transition-all text-left w-full bg-card border-0 shadow-corporate hover:shadow-corporate-lg hover:-translate-y-0.5 group"
    >
      <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", gradient)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs">{title}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
    </button>
  );
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

  return (
    <div className="space-y-6">
      {/* Urgent Alerts */}
      {urgentItems.length > 0 && (
        <Card className="border-secondary/20 bg-gradient-to-r from-secondary/5 to-secondary/10 border-0 shadow-corporate overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl gradient-gold shadow-gold flex items-center justify-center shrink-0 animate-pulse-glow">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs">Action Required</p>
                <p className="text-xs text-muted-foreground">{urgentItems.map(item => item.title).join(' · ')}</p>
              </div>
              <Button size="sm" className="gradient-gold text-white border-0 shadow-sm shrink-0 text-xs h-8" onClick={urgentItems[0]?.action}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Staff" value={metrics.activeEmployees} subtitle="Across all companies" icon={Users} gradient="from-blue-500 to-cyan-600" onClick={() => onNavigate('employees')} />
        <StatCard title="Pending" value={metrics.pendingLeaveRequests} subtitle="Needs attention" icon={Calendar} gradient="from-amber-500 to-orange-600" onClick={() => onNavigate('leave')} />
        <StatCard title="On Leave" value={metrics.employeesOnLeaveToday || 0} subtitle="Currently away" icon={Clock} gradient="from-violet-500 to-purple-600" onClick={() => onNavigate('leave')} />
        <StatCard title="Departments" value={metrics.departmentCount} subtitle={`${companies.length} companies`} icon={Building2} gradient="from-emerald-500 to-teal-600" onClick={() => onNavigate('employees')} />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Pulse */}
        <Card className="border-0 shadow-corporate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Today's Pulse
            </CardTitle>
            <CardDescription className="text-[10px]">{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <div className="text-xl font-bold text-emerald-600">{attendanceSummary.present}</div>
                <p className="text-[9px] font-medium text-emerald-600/70 uppercase tracking-wider mt-0.5">Present</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10">
                <div className="text-xl font-bold text-amber-600">{attendanceSummary.late}</div>
                <p className="text-[9px] font-medium text-amber-600/70 uppercase tracking-wider mt-0.5">Late</p>
              </div>
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <div className="text-xl font-bold text-destructive">{attendanceSummary.absent}</div>
                <p className="text-[9px] font-medium text-destructive/70 uppercase tracking-wider mt-0.5">Absent</p>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Attendance Rate</span>
                <span className="font-bold">
                  {attendanceSummary.total > 0 ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100) : 0}%
                </span>
              </div>
              <Progress value={attendanceSummary.total > 0 ? (attendanceSummary.present / attendanceSummary.total) * 100 : 0} className="h-1.5" />
            </div>

            <Button variant="outline" className="w-full text-xs h-8" onClick={() => onNavigate('attendance')}>
              View Full Report <ChevronRight className="h-3.5 w-3.5 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="lg:col-span-2 border-0 shadow-corporate">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-secondary" />
                Pending Leave Requests
              </CardTitle>
              <CardDescription className="text-[10px]">Requires your review</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => onNavigate('leave')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                </div>
                <p className="font-semibold text-sm">All caught up!</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">No pending leave requests</p>
              </div>
            ) : (
              <ScrollArea className="h-[250px]">
                <div className="space-y-1.5">
                  {recentRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => onNavigate('leave')}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-[10px] font-bold">
                          {request.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{request.requester?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>{LEAVE_TYPE_LABELS[request.leave_type]}</span>
                          <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" />
                          <span>{request.total_days}d</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-semibold",
                          request.status === 'pending' ? "border-amber-500/30 bg-amber-500/10 text-amber-600" : "border-blue-500/30 bg-blue-500/10 text-blue-600"
                        )}>
                          {request.status === 'pending' ? 'New' : 'Manager OK'}
                        </Badge>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{format(parseISO(request.start_date), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions + On Leave */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-corporate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <ActionCard title="Add Employee" description="Onboard new staff" icon={UserPlus} gradient="from-emerald-500 to-teal-600" onClick={() => onNavigate('employees')} />
            <ActionCard title="Review Requests" description="Process approvals" icon={CalendarCheck} gradient="from-violet-500 to-purple-600" onClick={() => onNavigate('leave')} />
            <ActionCard title="Performance" description="Manage evaluations" icon={Award} gradient="from-rose-500 to-pink-600" onClick={() => onNavigate('performance')} />
            <ActionCard title="Analytics" description="View reports" icon={PieChart} gradient="from-blue-500 to-cyan-600" onClick={() => onNavigate('analytics')} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-corporate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              On Leave This Week
            </CardTitle>
            <CardDescription className="text-[10px]">{onLeaveThisWeek.length} scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            {onLeaveThisWeek.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground">No scheduled leaves</p>
              </div>
            ) : (
              <ScrollArea className="h-[180px]">
                <div className="space-y-1">
                  {onLeaveThisWeek.slice(0, 8).map((leave) => (
                    <div key={leave.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[9px] font-bold bg-accent/10 text-accent">
                          {leave.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium truncate">{leave.requester?.full_name || 'Unknown'}</p>
                        <p className="text-[9px] text-muted-foreground">
                          {format(parseISO(leave.start_date), 'MMM d')} – {format(parseISO(leave.end_date), 'MMM d')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px]">{LEAVE_TYPE_LABELS[leave.leave_type]}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Overview */}
      {companies.length > 1 && (
        <Card className="border-0 shadow-corporate">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Company Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {companies.map(company => (
                <div key={company.id} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className={cn(
                    "h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                    company.parent_id ? 'from-muted-foreground/20 to-muted-foreground/10' : 'from-primary to-accent'
                  )}>
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate">{company.name}</p>
                    <p className="text-[9px] text-muted-foreground">{company.parent_id ? 'Subsidiary' : 'Parent Company'}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
