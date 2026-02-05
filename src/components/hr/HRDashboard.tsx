import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, Clock, FileText, TrendingUp, UserCheck } from 'lucide-react';
import { LeaveRequestsTab } from './LeaveRequestsTab';
import { EmployeeDirectoryTab } from './EmployeeDirectoryTab';
import { AttendanceTab } from './AttendanceTab';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';

interface HRDashboardProps {
  departmentId: string;
}

export function HRDashboard({ departmentId }: HRDashboardProps) {
  const [activeTab, setActiveTab] = useState('leave-requests');
  const { leaveRequests } = useLeaveRequests(undefined, true);
  const { users } = useUsers();

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending' || r.status === 'manager_approved').length;
  const totalEmployees = users.length;
  const approvedThisMonth = leaveRequests.filter(r => {
    const date = new Date(r.created_at);
    const now = new Date();
    return r.status === 'approved' && 
           date.getMonth() === now.getMonth() && 
           date.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Approved This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Leave requests</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leaveRequests.length > 0 
                ? Math.round((leaveRequests.filter(r => r.status === 'approved').length / leaveRequests.length) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="leave-requests" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Leave Requests</span>
            <span className="sm:hidden">Leave</span>
          </TabsTrigger>
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Employee Directory</span>
            <span className="sm:hidden">Directory</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
            <span className="sm:hidden">Attend</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave-requests" className="space-y-4">
          <LeaveRequestsTab departmentId={departmentId} isHR />
        </TabsContent>

        <TabsContent value="directory" className="space-y-4">
          <EmployeeDirectoryTab />
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceTab departmentId={departmentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
