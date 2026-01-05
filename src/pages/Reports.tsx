import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useReports } from '@/hooks/useReports';
import { ReportsList } from '@/components/reports/ReportsList';
import { CreateReportDialog } from '@/components/reports/CreateReportDialog';
import { ReportsFilter, ReportFilters } from '@/components/reports/ReportsFilter';
import { isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export default function Reports() {
  const { reports, loading, refetch } = useReports();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    status: null,
    type: null,
    priority: null,
    dateFrom: null,
    dateTo: null,
  });

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (filters.status && report.status !== filters.status) return false;
      if (filters.type && report.report_type !== filters.type) return false;
      if (filters.priority && report.priority !== filters.priority) return false;
      
      const reportDate = new Date(report.created_at);
      if (filters.dateFrom && isBefore(reportDate, startOfDay(filters.dateFrom))) return false;
      if (filters.dateTo && isAfter(reportDate, endOfDay(filters.dateTo))) return false;
      
      return true;
    });
  }, [reports, filters]);

  return (
    <DashboardLayout title="My Reports">
      <div className="space-y-6 animate-fade-in">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">My Reports</h2>
            <p className="text-muted-foreground">Manage and track your submitted reports</p>
          </div>
          <div className="flex items-center gap-2">
            <ReportsFilter filters={filters} onFiltersChange={setFilters} />
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </div>

        {/* Reports List */}
        <Card className="shadow-corporate">
          <CardHeader>
            <CardTitle>All Reports ({filteredReports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportsList 
              reports={filteredReports} 
              loading={loading}
              onCreateClick={() => setCreateDialogOpen(true)}
              onRefresh={refetch}
            />
          </CardContent>
        </Card>
      </div>

      <CreateReportDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </DashboardLayout>
  );
}
