import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, Truck, FileDown, Headphones } from 'lucide-react';
import { useFleets } from '@/hooks/useFleets';
import { useMaintenanceRecords } from '@/hooks/useMaintenanceRecords';
import { FleetKPICards } from './FleetKPICards';
import { FleetOverviewTable } from './FleetOverviewTable';
import { CurrentMaintenance } from './CurrentMaintenance';
import { UpcomingServices } from './UpcomingServices';
import { RecentActivity } from './RecentActivity';
import { AddFleetDialog } from './AddFleetDialog';
import { AddMaintenanceDialog } from './AddMaintenanceDialog';
import { RequestITSupportDialog } from '@/components/shared/RequestITSupportDialog';
import { Department } from '@/hooks/useDepartments';
import { format } from 'date-fns';

interface FleetMaintenanceDashboardProps {
  department: Department;
  canManage: boolean;
}

export function FleetMaintenanceDashboard({ department, canManage }: FleetMaintenanceDashboardProps) {
  const [addFleetOpen, setAddFleetOpen] = useState(false);
  const [addMaintenanceOpen, setAddMaintenanceOpen] = useState(false);
  const [itSupportOpen, setItSupportOpen] = useState(false);

  const { fleets, loading: fleetsLoading, stats, createFleet, refetch: refetchFleets } = useFleets(department.id);
  const { 
    loading: maintenanceLoading, 
    servicesThisMonth,
    currentMaintenance,
    upcomingServices,
    recentActivity,
    createRecord,
    refetch: refetchMaintenance
  } = useMaintenanceRecords(department.id);

  const handleAddFleet = async (data: any) => {
    await createFleet(data);
    refetchFleets();
  };

  const handleAddMaintenance = async (data: any) => {
    await createRecord(data);
    refetchMaintenance();
    refetchFleets();
  };

  // Get the most common checked_by from fleets
  const checkedBy = fleets.find(f => f.checked_by_name)?.checked_by_name || 'Jimmy';
  const inspectionDate = format(new Date(), 'dd/MM/yyyy');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" />
            {department.name}
          </h2>
          <p className="text-muted-foreground">{department.description}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setItSupportOpen(true)}>
              <Headphones className="h-4 w-4 mr-2" />
              IT Support
            </Button>
            <Button variant="outline" onClick={() => setAddFleetOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Fleet
            </Button>
            <Button onClick={() => setAddMaintenanceOpen(true)}>
              <Wrench className="h-4 w-4 mr-2" />
              Record Maintenance
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <FleetKPICards
        total={stats.total}
        operational={stats.operational}
        underMaintenance={stats.underMaintenance}
        outOfService={stats.outOfService}
        waitingParts={stats.waitingParts}
        withIssues={stats.withIssues}
        servicesThisMonth={servicesThisMonth}
        loading={fleetsLoading || maintenanceLoading}
      />

      {/* Fleet Overview Table */}
      <FleetOverviewTable 
        fleets={fleets} 
        loading={fleetsLoading}
        title={`HQ PEAT INSPECTION FOR ${department.name.toUpperCase()}`}
        checkedBy={checkedBy}
        inspectionDate={inspectionDate}
        onRefetch={refetchFleets}
      />

      {/* Two Column Layout for Current/Upcoming */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CurrentMaintenance records={currentMaintenance} loading={maintenanceLoading} />
        <UpcomingServices records={upcomingServices} loading={maintenanceLoading} />
      </div>

      {/* Recent Activity */}
      <RecentActivity records={recentActivity} loading={maintenanceLoading} />

      {/* Dialogs */}
      <AddFleetDialog
        open={addFleetOpen}
        onOpenChange={setAddFleetOpen}
        onSubmit={handleAddFleet}
      />
      <AddMaintenanceDialog
        open={addMaintenanceOpen}
        onOpenChange={setAddMaintenanceOpen}
        fleets={fleets}
        onSubmit={handleAddMaintenance}
      />
      <RequestITSupportDialog
        open={itSupportOpen}
        onOpenChange={setItSupportOpen}
        departmentId={department.id}
        departmentName={department.name}
      />
    </div>
  );
}
