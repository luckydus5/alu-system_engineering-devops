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
  ArrowRight, AlertTriangle, TrendingUp, Briefcase,
  UserCheck, FileText, LogOut, GraduationCap, Target
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { useAttendance } from '@/hooks/useAttendance';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, differenceInYears } from 'date-fns';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts';

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

const PIE_COLORS = [
  'hsl(205, 90%, 50%)',   // info/cyan
  'hsl(160, 70%, 40%)',   // success/green
  'hsl(40, 85%, 55%)',    // secondary/gold
  'hsl(280, 65%, 55%)',   // purple
  'hsl(0, 72%, 51%)',     // destructive/red
];

const BAR_COLOR = 'hsl(205, 90%, 50%)';
const AREA_COLOR = 'hsl(160, 70%, 40%)';

export function HROverviewTab({ departmentId, metrics, urgentItems, onNavigate }: HROverviewTabProps) {
  const { leaveRequests } = useLeaveRequests(undefined, true);
  const { users } = useUsers();
  const { records: todayAttendance } = useAttendance(undefined, new Date());
  const { companies } = useCompanies();
  const { employees } = useEmployees();
  const { departments } = useDepartments();

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

  // Years of experience distribution
  const experienceData = useMemo(() => {
    const buckets = [
      { name: 'Less than 1yr', value: 0 },
      { name: '1-3 years', value: 0 },
      { name: '3-5 years', value: 0 },
      { name: '5-7 years', value: 0 },
      { name: '7+ years', value: 0 },
    ];
    const now = new Date();
    employees.forEach(emp => {
      const years = differenceInYears(now, new Date(emp.hire_date));
      if (years < 1) buckets[0].value++;
      else if (years < 3) buckets[1].value++;
      else if (years < 5) buckets[2].value++;
      else if (years < 7) buckets[3].value++;
      else buckets[4].value++;
    });
    return buckets.filter(b => b.value > 0);
  }, [employees]);

  // Department distribution
  const departmentDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    employees.forEach(emp => {
      const name = emp.department_name || 'Unassigned';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [employees]);

  // Employment type distribution
  const typeDistribution = useMemo(() => {
    const labels: Record<string, string> = {
      full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', intern: 'Intern', temporary: 'Temp',
    };
    const map: Record<string, number> = {};
    employees.forEach(emp => {
      const label = labels[emp.employment_type] || emp.employment_type;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [employees]);

  // Monthly hiring trend (last 6 months)
  const hiringTrend = useMemo(() => {
    const months: { name: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = format(d, 'MMM');
      const count = employees.filter(e => {
        const hd = new Date(e.hire_date);
        return hd.getMonth() === d.getMonth() && hd.getFullYear() === d.getFullYear();
      }).length;
      months.push({ name: label, count });
    }
    return months;
  }, [employees]);

  const attendanceRate = attendanceSummary.total > 0 
    ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100) 
    : 0;

  const LIFECYCLE_CARDS = [
    { title: 'Recruitment', desc: 'Open positions', icon: UserPlus, count: metrics.openPositions, color: 'bg-info/10 text-info', tab: 'employees' },
    { title: 'Onboarding', desc: 'New hires setup', icon: GraduationCap, count: 0, color: 'bg-success/10 text-success', tab: 'onboarding' },
    { title: 'Performance', desc: 'Reviews & goals', icon: Target, count: 0, color: 'bg-warning/10 text-warning', tab: 'performance' },
    { title: 'Leave Mgmt', desc: 'Pending requests', icon: Calendar, count: metrics.pendingLeaveRequests, color: 'bg-primary/10 text-primary', tab: 'leave' },
    { title: 'Attendance', desc: 'Today\'s tracking', icon: Clock, count: attendanceSummary.present, color: 'bg-chart-4/10 text-chart-4', tab: 'attendance' },
    { title: 'Analytics', desc: 'HR insights', icon: PieChart, count: 0, color: 'bg-chart-5/10 text-chart-5', tab: 'analytics' },
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

      {/* KPI Cards Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total People', value: metrics.activeEmployees, icon: Users, variant: 'kpi-blue' as const, onClick: () => onNavigate('employees') },
          { label: 'Pending Requests', value: metrics.pendingLeaveRequests, icon: Clock, variant: 'kpi-gold' as const, onClick: () => onNavigate('leave') },
          { label: 'On Leave Today', value: metrics.employeesOnLeaveToday || 0, icon: Calendar, variant: 'kpi-warning' as const, onClick: () => onNavigate('leave') },
          { label: 'Departments', value: metrics.departmentCount, icon: Building2, variant: 'kpi-success' as const, onClick: () => onNavigate('employees') },
        ].map(stat => (
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
              View details <ChevronRight className="h-3 w-3" />
            </p>
          </button>
        ))}
      </div>

      {/* HR Lifecycle Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">HR Lifecycle</h3>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {LIFECYCLE_CARDS.map(card => (
            <button
              key={card.title}
              onClick={() => onNavigate(card.tab)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border shadow-corporate hover:shadow-corporate-lg transition-all group text-center"
            >
              <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", card.color)}>
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="text-[10px] text-muted-foreground">{card.desc}</p>
              </div>
              {card.count > 0 && (
                <Badge variant="secondary" className="text-[10px]">{card.count}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Experience Pie Chart */}
        <Card className="shadow-corporate rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Years of Experience</CardTitle>
          </CardHeader>
          <CardContent>
            {experienceData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={experienceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {experienceData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Employees']} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {experienceData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Department Distribution Bar */}
        <Card className="shadow-corporate rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Employees per Department</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentDistribution.length > 0 ? (
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentDistribution} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [v, 'Employees']} />
                    <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-xs text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Employment Type Pie */}
        <Card className="shadow-corporate rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Employment Types</CardTitle>
          </CardHeader>
          <CardContent>
            {typeDistribution.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {typeDistribution.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [v, 'Employees']} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {typeDistribution.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground flex-1 truncate">{d.name}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 + Pending Requests */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Hiring Trend */}
        <Card className="lg:col-span-2 shadow-corporate rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Hiring Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hiringTrend} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [v, 'Hires']} />
                  <Area type="monotone" dataKey="count" fill={AREA_COLOR} fillOpacity={0.15} stroke={AREA_COLOR} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="lg:col-span-3 shadow-corporate rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Pending Leave Requests</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting your review</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => onNavigate('leave')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {recentRequests.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="h-10 w-10 mx-auto text-success/30 mb-2" />
                <p className="font-semibold text-sm">All caught up</p>
                <p className="text-xs text-muted-foreground mt-0.5">No pending requests</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentRequests.map((request) => (
                  <button 
                    key={request.id}
                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                    onClick={() => onNavigate('leave')}
                  >
                    <Avatar className="h-9 w-9 shadow-sm">
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

      {/* Bottom Row: Attendance + On Leave This Week */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Snapshot */}
        <Card className="shadow-corporate rounded-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Today's Attendance</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono">{format(new Date(), 'EEE, MMM d')}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" strokeWidth="10" className="stroke-muted" />
                  <circle 
                    cx="60" cy="60" r="50" fill="none" strokeWidth="10" 
                    strokeLinecap="round"
                    className="stroke-primary"
                    strokeDasharray={`${attendanceRate * 3.14} ${314 - attendanceRate * 3.14}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{attendanceRate}%</span>
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

        {/* On Leave This Week */}
        <Card className="shadow-corporate rounded-xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">On Leave This Week</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{onLeaveThisWeek.length} scheduled</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {onLeaveThisWeek.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/15 mb-2" />
                <p className="text-xs text-muted-foreground">No scheduled leaves this week</p>
              </div>
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="p-3 space-y-0.5">
                  {onLeaveThisWeek.slice(0, 10).map((leave) => (
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
