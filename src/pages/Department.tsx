import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserRole } from '@/hooks/useUserRole';
import { FleetMaintenanceDashboard } from '@/components/fleet/FleetMaintenanceDashboard';
import { WarehouseDashboard } from '@/components/warehouse/WarehouseDashboard';
import { OperationsDashboard } from '@/components/operations/OperationsDashboard';
import { OfficeDashboard } from '@/components/office/OfficeDashboard';
import { ShieldAlert } from 'lucide-react';

export default function Department() {
  const { code } = useParams<{ code: string }>();
  const { departments, loading: deptLoading } = useDepartments();
  const { hasRole, isInDepartment, loading: roleLoading } = useUserRole();

  const department = departments.find(d => d.code.toLowerCase() === code?.toLowerCase());

  // Check access: user must be admin, director, or in the department
  const isAdmin = hasRole('admin') || hasRole('director');
  const canManage = hasRole('admin') || hasRole('director') || hasRole('supervisor') || hasRole('manager');
  const hasAccess = isAdmin || (department && isInDepartment(department.id));

  // Check department types
  const deptCode = department?.code?.toUpperCase();
  const isFleetDepartment = deptCode === 'FLEET';
  const isWarehouseDepartment = deptCode === 'WAREHOUSE';
  const isOperationsDepartment = deptCode === 'OPS' || deptCode === 'PEAT' || deptCode === 'OPERATIONS';

  if (deptLoading || roleLoading) {
    return (
      <DashboardLayout title="Loading...">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
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

  // Render Fleet Maintenance Dashboard for Fleet Management department
  if (isFleetDepartment) {
    return (
      <DashboardLayout title={department.name}>
        <FleetMaintenanceDashboard department={department} canManage={canManage} />
      </DashboardLayout>
    );
  }

  // Render Warehouse Dashboard for Warehouse department
  if (isWarehouseDepartment) {
    return (
      <DashboardLayout title={department.name}>
        <WarehouseDashboard department={department} canManage={canManage} />
      </DashboardLayout>
    );
  }

  // Render Operations Dashboard for field operations (OPS, PEAT) - with photo uploads from field
  if (isOperationsDepartment) {
    return (
      <DashboardLayout title={department.name}>
        <OperationsDashboard department={department} canManage={canManage} />
      </DashboardLayout>
    );
  }

  // Default: Office Dashboard for office-based departments (HR, FIN, SAF, IT, ENG, etc.)
  // These departments track meetings, tasks, announcements, and office activities
  return (
    <DashboardLayout title={department.name}>
      <OfficeDashboard department={department} canManage={canManage} />
    </DashboardLayout>
  );
}
