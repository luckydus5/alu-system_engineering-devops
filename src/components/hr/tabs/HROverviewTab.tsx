import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, Calendar, Clock, TrendingUp, Briefcase, 
  ChevronRight, ArrowUpRight, ArrowDownRight, UserPlus,
  CalendarCheck, AlertCircle, CheckCircle2, XCircle,
  Timer, Target, Sparkles, Activity, Zap, Star,
  Award, GraduationCap, Building2, PieChart
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { useAttendance } from '@/hooks/useAttendance';
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
  };
  urgentItems: Array<{
    type: string;
    title: string;
    priority: string;
    action: () => void;
  }>;
  onNavigate: (tab: string) => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick?: () => void;
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, color, bgColor, onClick }: MetricCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
        "border-0 bg-gradient-to-br",
        bgColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">{value}</span>
            </div>
            {change !== undefined && (
              <div className="flex items-center gap-1">
                {change >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  change >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {Math.abs(change)}% {changeLabel}
                </span>
              </div>
            )}
          </div>
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center",
            "bg-white/80 dark:bg-slate-900/50 shadow-sm"
          )}>
            <Icon className={cn("h-7 w-7", color)} />
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/5 rounded-tl-full" />
      </CardContent>
    </Card>
  );
}

function QuickActionCard({ title, description, icon: Icon, color, onClick }: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl transition-all text-left w-full",
        "bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700",
        "hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600"
      )}
    >
      <div className={cn(
        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
        color
      )}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}

export function HROverviewTab({ departmentId, metrics, urgentItems, onNavigate }: HROverviewTabProps) {
  const { leaveRequests } = useLeaveRequests(undefined, true);
  const { users } = useUsers();
  const { records: todayAttendance } = useAttendance(undefined, new Date());

  // Recent leave requests
  const recentRequests = useMemo(() => {
    return leaveRequests
      .filter(r => r.status === 'pending' || r.status === 'manager_approved')
      .slice(0, 5);
  }, [leaveRequests]);

  // Employees on leave this week
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

  // Attendance summary
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
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Action Required
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {urgentItems.map(item => item.title).join(' • ')}
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-amber-600 hover:bg-amber-700"
                onClick={urgentItems[0]?.action}
              >
                Review Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Employees"
          value={metrics.activeEmployees}
          change={metrics.employeeGrowth}
          changeLabel="this month"
          icon={Users}
          color="text-blue-600"
          bgColor="from-blue-500/10 to-cyan-500/10"
          onClick={() => onNavigate('employees')}
        />
        <MetricCard
          title="Pending Approvals"
          value={metrics.pendingLeaveRequests}
          icon={Calendar}
          color="text-amber-600"
          bgColor="from-amber-500/10 to-orange-500/10"
          onClick={() => onNavigate('leave')}
        />
        <MetricCard
          title="Retention Rate"
          value={`${metrics.retentionRate}%`}
          change={2.1}
          changeLabel="vs last quarter"
          icon={Target}
          color="text-emerald-600"
          bgColor="from-emerald-500/10 to-teal-500/10"
          onClick={() => onNavigate('analytics')}
        />
        <MetricCard
          title="Open Positions"
          value={metrics.openPositions}
          icon={Briefcase}
          color="text-violet-600"
          bgColor="from-violet-500/10 to-purple-500/10"
          onClick={() => onNavigate('employees')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's Attendance */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Today's Attendance
            </CardTitle>
            <CardDescription>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-3xl font-bold text-emerald-600">{attendanceSummary.present}</div>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-amber-600">{attendanceSummary.late}</div>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-red-600">{attendanceSummary.absent}</div>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Attendance Rate</span>
                <span className="font-medium">
                  {attendanceSummary.total > 0 
                    ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100)
                    : 0}%
                </span>
              </div>
              <Progress 
                value={attendanceSummary.total > 0 
                  ? (attendanceSummary.present / attendanceSummary.total) * 100 
                  : 0} 
                className="h-2"
              />
            </div>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => onNavigate('attendance')}
            >
              View Full Report
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-500" />
                Pending Leave Requests
              </CardTitle>
              <CardDescription>
                Requires your attention
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('leave')}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">No pending leave requests</p>
              </div>
            ) : (
              <ScrollArea className="h-[280px]">
                <div className="space-y-3">
                  {recentRequests.map((request) => (
                    <div 
                      key={request.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm">
                          {request.requester?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {request.requester?.full_name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{LEAVE_TYPE_LABELS[request.leave_type]}</span>
                          <span>•</span>
                          <span>{request.total_days} day(s)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={request.status === 'pending' ? 'secondary' : 'outline'}>
                          {request.status === 'pending' ? 'New' : 'Manager OK'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(parseISO(request.start_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <QuickActionCard
              title="Add Employee"
              description="Onboard new team member"
              icon={UserPlus}
              color="bg-gradient-to-br from-emerald-500 to-teal-600"
              onClick={() => onNavigate('onboarding')}
            />
            <QuickActionCard
              title="Review Requests"
              description="Process leave approvals"
              icon={CalendarCheck}
              color="bg-gradient-to-br from-violet-500 to-purple-600"
              onClick={() => onNavigate('leave')}
            />
            <QuickActionCard
              title="Performance Reviews"
              description="Manage evaluations"
              icon={Award}
              color="bg-gradient-to-br from-rose-500 to-pink-600"
              onClick={() => onNavigate('performance')}
            />
            <QuickActionCard
              title="HR Analytics"
              description="View detailed reports"
              icon={PieChart}
              color="bg-gradient-to-br from-blue-500 to-indigo-600"
              onClick={() => onNavigate('analytics')}
            />
          </CardContent>
        </Card>

        {/* On Leave This Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-cyan-500" />
              On Leave This Week
            </CardTitle>
            <CardDescription>
              {onLeaveThisWeek.length} employee(s) scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            {onLeaveThisWeek.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No scheduled leaves this week</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {onLeaveThisWeek.slice(0, 6).map((leave) => (
                    <div key={leave.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-cyan-500/20 text-cyan-700">
                          {leave.requester?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {leave.requester?.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(leave.start_date), 'MMM d')} - {format(parseISO(leave.end_date), 'MMM d')}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {LEAVE_TYPE_LABELS[leave.leave_type]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
