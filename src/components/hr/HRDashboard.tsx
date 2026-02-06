import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, Users, Clock, FileText, TrendingUp, UserCheck, 
  Briefcase, AlertCircle, CheckCircle2, XCircle, BarChart3
} from 'lucide-react';
import { LeaveRequestsTab } from './LeaveRequestsTab';
import { EmployeeDirectoryTab } from './EmployeeDirectoryTab';
import { AttendanceTab } from './AttendanceTab';
import { PositionsTab } from './PositionsTab';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { usePositions } from '@/hooks/usePositions';
import { cn } from '@/lib/utils';

interface HRDashboardProps {
  departmentId: string;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  variant?: 'default' | 'warning' | 'success' | 'info';
}

function KPICard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: KPICardProps) {
  const variantStyles = {
    default: 'from-slate-500/10 to-slate-500/5',
    warning: 'from-amber-500/10 to-amber-500/5',
    success: 'from-emerald-500/10 to-emerald-500/5',
    info: 'from-blue-500/10 to-blue-500/5',
  };

  const iconStyles = {
    default: 'bg-slate-500/20 text-slate-600 dark:text-slate-400',
    warning: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    success: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    info: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  };

  return (
    <Card className={cn(
      "border-0 shadow-sm overflow-hidden relative",
      "bg-gradient-to-br",
      variantStyles[variant]
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{value}</span>
              {trend && (
                <span className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded",
                  trend.value >= 0 ? "bg-emerald-500/20 text-emerald-600" : "bg-red-500/20 text-red-600"
                )}>
                  {trend.value >= 0 ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className={cn("p-3 rounded-xl", iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HRDashboard({ departmentId }: HRDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { leaveRequests } = useLeaveRequests(undefined, true);
  const { users } = useUsers();
  const { positions } = usePositions();

  // Calculate statistics
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length;
  const awaitingHR = leaveRequests.filter(r => r.status === 'manager_approved').length;
  const totalEmployees = users.length;
  const activePositions = positions.filter(p => p.is_active).length;

  const thisMonth = new Date();
  const approvedThisMonth = leaveRequests.filter(r => {
    const date = new Date(r.created_at);
    return r.status === 'approved' && 
           date.getMonth() === thisMonth.getMonth() && 
           date.getFullYear() === thisMonth.getFullYear();
  }).length;

  const rejectedThisMonth = leaveRequests.filter(r => {
    const date = new Date(r.created_at);
    return r.status === 'rejected' && 
           date.getMonth() === thisMonth.getMonth() && 
           date.getFullYear() === thisMonth.getFullYear();
  }).length;

  const totalRequests = leaveRequests.length;
  const approvalRate = totalRequests > 0 
    ? Math.round((leaveRequests.filter(r => r.status === 'approved').length / totalRequests) * 100)
    : 0;

  // Recent pending requests for quick action
  const recentPending = leaveRequests
    .filter(r => r.status === 'pending' || r.status === 'manager_approved')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">HR Dashboard</h1>
        <p className="text-muted-foreground">
          Manage leave requests, employees, positions, and attendance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Pending Approvals"
          value={pendingRequests + awaitingHR}
          subtitle={`${pendingRequests} new, ${awaitingHR} awaiting HR`}
          icon={AlertCircle}
          variant="warning"
        />
        <KPICard
          title="Total Employees"
          value={totalEmployees}
          subtitle={`${activePositions} positions defined`}
          icon={Users}
          variant="info"
        />
        <KPICard
          title="Approved This Month"
          value={approvedThisMonth}
          subtitle={`${rejectedThisMonth} rejected`}
          icon={CheckCircle2}
          variant="success"
        />
        <KPICard
          title="Approval Rate"
          value={`${approvalRate}%`}
          subtitle="All time average"
          icon={BarChart3}
          variant="default"
        />
      </div>

      {/* Quick Action Banner for Pending */}
      {(pendingRequests + awaitingHR) > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    {pendingRequests + awaitingHR} leave request{(pendingRequests + awaitingHR) !== 1 ? 's' : ''} need your attention
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Review and approve or reject pending requests
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('leave-requests')}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm transition-colors"
              >
                Review Now
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background gap-2 px-4">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="leave-requests" className="data-[state=active]:bg-background gap-2 px-4 relative">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Leave Requests</span>
            {(pendingRequests + awaitingHR) > 0 && (
              <Badge className="h-5 min-w-5 px-1.5 bg-amber-500 text-white border-0 text-xs absolute -top-1 -right-1 sm:relative sm:top-0 sm:right-0 sm:ml-1">
                {pendingRequests + awaitingHR}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="directory" className="data-[state=active]:bg-background gap-2 px-4">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Employees</span>
          </TabsTrigger>
          <TabsTrigger value="positions" className="data-[state=active]:bg-background gap-2 px-4">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Positions</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="data-[state=active]:bg-background gap-2 px-4">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Leave Request Stats */}
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  Leave Request Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { label: 'Approved', count: leaveRequests.filter(r => r.status === 'approved').length, color: 'bg-emerald-500' },
                    { label: 'Pending', count: pendingRequests, color: 'bg-amber-500' },
                    { label: 'Manager Approved', count: awaitingHR, color: 'bg-blue-500' },
                    { label: 'Rejected', count: leaveRequests.filter(r => r.status === 'rejected').length, color: 'bg-red-500' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("h-2.5 w-2.5 rounded-full", item.color)} />
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="font-semibold">{item.count}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Approval Rate</span>
                    <span className="font-semibold">{approvalRate}%</span>
                  </div>
                  <Progress value={approvalRate} className="mt-2 h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Workforce Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{totalEmployees}</p>
                    <p className="text-xs text-muted-foreground">Total Employees</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{positions.length}</p>
                    <p className="text-xs text-muted-foreground">Positions Defined</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Position Status</p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/20 text-emerald-600 border-0">
                      {activePositions} Active
                    </Badge>
                    <Badge className="bg-muted text-muted-foreground border-0">
                      {positions.length - activePositions} Inactive
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leave-requests" className="space-y-4">
          <LeaveRequestsTab departmentId={departmentId} isHR />
        </TabsContent>

        <TabsContent value="directory" className="space-y-4">
          <EmployeeDirectoryTab />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <PositionsTab />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceTab departmentId={departmentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
