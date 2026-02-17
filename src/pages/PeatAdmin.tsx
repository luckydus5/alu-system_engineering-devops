import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, Building2, Users, FileText, Plus, 
  ShieldAlert, Loader2, ArrowRight, Leaf
} from 'lucide-react';
import { useCurrentUserLeavePermissions } from '@/hooks/useLeaveManagers';
import { useUserRole } from '@/hooks/useUserRole';
import { useDepartments } from '@/hooks/useDepartments';
import { useLeaveRequests, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, LeaveStatus, LeaveType } from '@/hooks/useLeaveRequests';
import { CreateLeaveRequestDialog } from '@/components/hr/CreateLeaveRequestDialog';
import { EmployeeLeaveDashboard } from '@/components/hr/EmployeeLeaveDashboard';
import { getDepartmentIcon } from '@/lib/departmentIcons';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: 'text-amber-600 bg-amber-500/10',
  hr_approved: 'text-cyan-600 bg-cyan-500/10',
  manager_approved: 'text-blue-600 bg-blue-500/10',
  gm_pending: 'text-indigo-600 bg-indigo-500/10',
  approved: 'text-emerald-600 bg-emerald-500/10',
  rejected: 'text-red-600 bg-red-500/10',
  cancelled: 'text-muted-foreground bg-muted',
};

export default function PeatAdmin() {
  const navigate = useNavigate();
  const { canFileForOthers, isLoading: permLoading } = useCurrentUserLeavePermissions();
  const { roles, profile, grantedDepartmentIds, loading: roleLoading } = useUserRole();
  const { departments } = useDepartments();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const primaryDeptId = roles[0]?.department_id;
  const primaryDept = departments.find(d => d.id === primaryDeptId);

  // Get granted departments (excluding primary)
  const grantedDepts = departments.filter(
    d => grantedDepartmentIds.includes(d.id) && d.id !== primaryDeptId && !d.is_hr_only
  );

  // All accessible departments
  const allDepts = [primaryDept, ...grantedDepts].filter(d => d && !d.is_hr_only);

  // Fetch leave requests filed by this user on behalf of others
  const { leaveRequests, isLoading: leavesLoading } = useLeaveRequests(primaryDeptId, false);
  const filedByMe = leaveRequests.filter(r => r.requester_id !== profile?.id);

  if (permLoading || roleLoading) {
    return (
      <DashboardLayout title="Peat Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canFileForOthers) {
    return (
      <DashboardLayout title="Access Denied">
        <Card className="shadow-corporate border-destructive/20">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-6">
              You don't have Peat Admin permissions.<br />
              Contact your Super Admin to get access.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Peat Admin">
      <div className="space-y-6 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-600/15 via-green-500/10 to-lime-500/5 p-6">
          <div className="absolute top-3 right-3 opacity-10">
            <Leaf className="h-24 w-24 text-emerald-700" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Leaf className="h-6 w-6 text-emerald-600" />
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  Peat Admin Dashboard
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage HQ Peat & Farmers leave applications and department access
              </p>
            </div>
            <Button 
              onClick={() => setLeaveDialogOpen(true)}
              className="gap-2 rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              File Leave Request
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="shadow-corporate">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold">{filedByMe.length}</p>
              <p className="text-xs text-muted-foreground">Filed for Others</p>
            </CardContent>
          </Card>
          <Card className="shadow-corporate">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                <CalendarDays className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold">{filedByMe.filter(r => r.status === 'pending').length}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </CardContent>
          </Card>
          <Card className="shadow-corporate">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold">{filedByMe.filter(r => r.status === 'approved').length}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card className="shadow-corporate">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{allDepts.length}</p>
              <p className="text-xs text-muted-foreground">Departments</p>
            </CardContent>
          </Card>
        </div>

        {/* My Leave Dashboard */}
        {primaryDeptId && (
          <EmployeeLeaveDashboard departmentId={primaryDeptId} />
        )}

        {/* Granted Department Access */}
        {allDepts.length > 0 && (
          <Card className="shadow-corporate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-emerald-600" />
                Your Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allDepts.map(dept => {
                  if (!dept) return null;
                  const Icon = getDepartmentIcon(dept.code);
                  const isPrimary = dept.id === primaryDeptId;
                  return (
                    <Link 
                      key={dept.id} 
                      to={`/department/${dept.code.toLowerCase()}`}
                      className="group"
                    >
                      <Card className="transition-all hover:shadow-lg hover:border-emerald-500/30 cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                            <Icon className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{dept.name}</p>
                            <Badge variant={isPrimary ? 'default' : 'secondary'} className="text-[10px] mt-1">
                              {isPrimary ? 'Primary' : 'Granted Access'}
                            </Badge>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Filed Requests */}
        {filedByMe.length > 0 && (
          <Card className="shadow-corporate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-emerald-600" />
                Recently Filed for Others
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filedByMe.slice(0, 10).map(req => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {req.requester?.full_name || 'Employee'} — {LEAVE_TYPE_LABELS[req.leave_type as LeaveType]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(req.start_date), 'MMM d')} - {format(parseISO(req.end_date), 'MMM d, yyyy')} • {req.total_days} days
                      </p>
                    </div>
                    <Badge className={cn('text-[10px] shrink-0', STATUS_COLORS[req.status as LeaveStatus])}>
                      {LEAVE_STATUS_LABELS[req.status as LeaveStatus]}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Leave Request Dialog */}
      {primaryDeptId && (
        <CreateLeaveRequestDialog
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          departmentId={primaryDeptId}
        />
      )}
    </DashboardLayout>
  );
}
