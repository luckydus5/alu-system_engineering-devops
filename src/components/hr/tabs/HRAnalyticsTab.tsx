import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, Calendar,
  Clock, Award, Building2, PieChart, LineChart, Download,
  ArrowUpRight, ArrowDownRight, Activity, Target, Briefcase
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LeaveType } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO } from 'date-fns';

interface HRAnalyticsTabProps {
  departmentId: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function StatCard({ title, value, change, changeType, icon: Icon, color }: {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {changeType === 'positive' ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : changeType === 'negative' ? (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                ) : null}
                <span className={cn(
                  changeType === 'positive' ? 'text-emerald-600' : 
                  changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  {change > 0 ? '+' : ''}{change}% vs last period
                </span>
              </div>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarChartVisual({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", item.color)}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyTrendChart({ data }: { data: number[] }) {
  const maxValue = Math.max(...data, 1);
  
  return (
    <div className="h-48 flex items-end gap-2">
      {data.map((value, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-muted rounded-t-lg overflow-hidden flex-1 flex items-end">
            <div 
              className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t-lg transition-all"
              style={{ height: `${(value / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{MONTHS[idx]}</span>
        </div>
      ))}
    </div>
  );
}

export function HRAnalyticsTab({ departmentId }: HRAnalyticsTabProps) {
  const [timePeriod, setTimePeriod] = useState('12months');
  const { leaveRequests } = useLeaveRequests(undefined, true);
  const { users } = useUsers();
  const { departments } = useDepartments();

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const totalEmployees = users.length;
    
    // Leave statistics by type
    const leaveByType = Object.keys(LEAVE_TYPE_LABELS).map(type => ({
      type: type as LeaveType,
      label: LEAVE_TYPE_LABELS[type as LeaveType],
      count: leaveRequests.filter(r => r.leave_type === type && r.status === 'approved').length,
    }));

    // Department distribution
    const byDepartment = departments.map(dept => ({
      name: dept.name,
      count: users.filter(u => u.department_id === dept.id).length,
    })).sort((a, b) => b.count - a.count);

    // Monthly leave trends (mock data for visualization)
    const monthlyLeaves = Array(12).fill(0).map((_, i) => 
      Math.floor(Math.random() * 20) + 5
    );

    // Role distribution
    const roleDistribution = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Approval rate
    const totalRequests = leaveRequests.length;
    const approved = leaveRequests.filter(r => r.status === 'approved').length;
    const approvalRate = totalRequests > 0 ? Math.round((approved / totalRequests) * 100) : 0;

    return {
      totalEmployees,
      leaveByType,
      byDepartment,
      monthlyLeaves,
      roleDistribution,
      approvalRate,
      totalLeaveRequests: totalRequests,
      avgLeaveDays: 8.5, // Mock
      retentionRate: 94.5, // Mock
      turnoverRate: 5.5, // Mock
    };
  }, [leaveRequests, users, departments]);

  const LEAVE_COLORS: Record<LeaveType, string> = {
    annual: 'bg-blue-500',
    sick: 'bg-red-500',
    personal: 'bg-purple-500',
    maternity: 'bg-pink-500',
    paternity: 'bg-cyan-500',
    bereavement: 'bg-slate-500',
    unpaid: 'bg-amber-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">HR Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive workforce insights and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value={analytics.totalEmployees}
          change={5.2}
          changeType="positive"
          icon={Users}
          color="bg-gradient-to-br from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Retention Rate"
          value={`${analytics.retentionRate}%`}
          change={2.1}
          changeType="positive"
          icon={Target}
          color="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          title="Leave Approval Rate"
          value={`${analytics.approvalRate}%`}
          change={-1.2}
          changeType="neutral"
          icon={Calendar}
          color="bg-gradient-to-br from-violet-500 to-purple-600"
        />
        <StatCard
          title="Avg Leave Days/Employee"
          value={analytics.avgLeaveDays}
          change={0.5}
          changeType="neutral"
          icon={Clock}
          color="bg-gradient-to-br from-amber-500 to-orange-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Leave Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-500" />
              Monthly Leave Requests
            </CardTitle>
            <CardDescription>Trend over the past 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={analytics.monthlyLeaves} />
          </CardContent>
        </Card>

        {/* Leave by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-5 w-5 text-violet-500" />
              Leave Distribution by Type
            </CardTitle>
            <CardDescription>Breakdown of approved leaves</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartVisual 
              data={analytics.leaveByType.map(item => ({
                label: item.label,
                value: item.count,
                color: LEAVE_COLORS[item.type],
              }))}
              maxValue={Math.max(...analytics.leaveByType.map(i => i.count), 1)}
            />
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              Employees by Department
            </CardTitle>
            <CardDescription>Workforce distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartVisual 
              data={analytics.byDepartment.slice(0, 6).map((item, idx) => ({
                label: item.name,
                value: item.count,
                color: ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'][idx % 6],
              }))}
              maxValue={Math.max(...analytics.byDepartment.map(i => i.count), 1)}
            />
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-amber-500" />
              Role Distribution
            </CardTitle>
            <CardDescription>Employees by role level</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartVisual 
              data={Object.entries(analytics.roleDistribution).map(([role, count], idx) => ({
                label: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                value: count,
                color: ['bg-emerald-500', 'bg-amber-500', 'bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-red-500'][idx % 6],
              }))}
              maxValue={Math.max(...Object.values(analytics.roleDistribution), 1)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Workforce Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-500" />
            Key Workforce Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium">Positive Trend</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Employee retention has increased by 2.1% compared to last quarter, indicating improved workplace satisfaction.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium">Leave Pattern</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Annual leave requests peak in December and July. Consider planning for increased coverage during these periods.
              </p>
            </div>
            
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Growth Metric</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Workforce has grown by 5.2% this year. Engineering and Product teams show the highest growth rates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
