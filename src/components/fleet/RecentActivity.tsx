import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaintenanceRecord } from '@/hooks/useMaintenanceRecords';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface RecentActivityProps {
  records: MaintenanceRecord[];
  loading?: boolean;
}

const serviceTypeConfig = {
  preventive: { label: 'Preventive', color: 'bg-emerald-100 text-emerald-800' },
  corrective: { label: 'Corrective', color: 'bg-amber-100 text-amber-800' },
  breakdown: { label: 'Breakdown', color: 'bg-red-100 text-red-800' }
};

export function RecentActivity({ records, loading }: RecentActivityProps) {
  if (loading) {
    return (
      <Card className="shadow-corporate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-corporate">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No recent activity
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Fleet</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const config = serviceTypeConfig[record.service_type];
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(record.maintenance_date), 'MM/dd/yyyy')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {record.fleet?.fleet_number || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {record.service_description}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
