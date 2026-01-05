import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaintenanceRecord } from '@/hooks/useMaintenanceRecords';
import { Wrench } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CurrentMaintenanceProps {
  records: MaintenanceRecord[];
  loading?: boolean;
}

export function CurrentMaintenance({ records, loading }: CurrentMaintenanceProps) {
  if (loading) {
    return (
      <Card className="shadow-corporate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Current Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
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
          <Wrench className="h-5 w-5 text-amber-500" />
          Current Maintenance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No active maintenance
          </p>
        ) : (
          <ul className="space-y-3">
            {records.map((record) => (
              <li key={record.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-amber-500 font-medium">▸</span>
                <div>
                  <p className="font-semibold text-foreground">
                    {record.fleet?.fleet_number || 'Unknown'}{' '}
                    <span className="font-normal text-muted-foreground">
                      {record.fleet?.machine_type}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    {record.service_description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
