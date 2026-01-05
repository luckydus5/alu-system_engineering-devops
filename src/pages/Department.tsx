import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDepartments } from '@/hooks/useDepartments';
import { useReports } from '@/hooks/useReports';
import { useUserRole } from '@/hooks/useUserRole';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { KPICard } from '@/components/dashboard/KPICard';
import { ReportsList } from '@/components/reports/ReportsList';
import { CreateReportDialog } from '@/components/reports/CreateReportDialog';
import { TeamMembersList } from '@/components/department/TeamMembersList';
import { FleetMaintenanceDashboard } from '@/components/fleet/FleetMaintenanceDashboard';
import { Plus, FileText, Users, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

export default function Department() {
  const { code } = useParams<{ code: string }>();
  const { departments, loading: deptLoading } = useDepartments();
  const { hasRole, isInDepartment, loading: roleLoading } = useUserRole();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const department = departments.find(d => d.code.toLowerCase() === code?.toLowerCase());
  const { reports, loading: reportsLoading, refetch } = useReports(department?.id);
  const { members, loading: membersLoading, count: teamCount } = useDepartmentMembers(department?.id);

  // Check access: user must be admin, director, or in the department
  const isAdmin = hasRole('admin') || hasRole('director');
  const canManage = hasRole('admin') || hasRole('director') || hasRole('supervisor') || hasRole('manager');
  const hasAccess = isAdmin || (department && isInDepartment(department.id));

  // Calculate stats from real data - using correct status values
  const totalReports = reports.length;
  const resolvedReports = reports.filter(r => r.status === 'resolved').length;
  const pendingReports = reports.filter(r => ['submitted', 'in_review'].includes(r.status)).length;

  // Check if this is the PEAT department
  const isPeatDepartment = department?.code?.toUpperCase() === 'PEAT';

  if (deptLoading || roleLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!department) {
    return (
      <DashboardLayout title="Department Not Found">
        <Card className="shadow-corporate">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Department not found</h3>
            <p className="text-muted-foreground">The requested department does not exist.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <DashboardLayout title="Access Denied">
        <Card className="shadow-corporate border-destructive/20">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to access the {department.name} department.
              <br />
              Contact an administrator if you need access.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Render Fleet Maintenance Dashboard for PEAT department
  if (isPeatDepartment) {
    return (
      <DashboardLayout title={department.name}>
        <FleetMaintenanceDashboard department={department} canManage={canManage} />
      </DashboardLayout>
    );
  }

  // Default department view for other departments
  return (
    <DashboardLayout title={department.name}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{department.name}</h2>
            <p className="text-muted-foreground">{department.description}</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </div>

        {/* Department KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Reports"
            value={totalReports.toString()}
            icon={<FileText className="h-5 w-5" />}
          />
          <KPICard
            title="Team Members"
            value={membersLoading ? '...' : teamCount.toString()}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            title="Resolved"
            value={resolvedReports.toString()}
            icon={<CheckCircle className="h-5 w-5" />}
          />
          <KPICard
            title="Pending"
            value={pendingReports.toString()}
            icon={<Clock className="h-5 w-5" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Department Reports - Takes more space */}
          <div className="lg:col-span-2">
            <Card className="shadow-corporate">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Department Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <ReportsList 
                  reports={reports} 
                  loading={reportsLoading}
                  onCreateClick={() => setCreateDialogOpen(true)}
                  onRefresh={refetch}
                />
              </CardContent>
            </Card>
          </div>

          {/* Team Members List */}
          <div className="lg:col-span-1">
            <TeamMembersList members={members} loading={membersLoading} />
          </div>
        </div>
      </div>

      <CreateReportDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        defaultDepartmentId={department.id}
      />
    </DashboardLayout>
  );
}
