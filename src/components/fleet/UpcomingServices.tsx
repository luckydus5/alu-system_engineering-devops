import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MaintenanceRecord } from '@/hooks/useMaintenanceRecords';
import { CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface UpcomingServicesProps {
  records: MaintenanceRecord[];
  loading?: boolean;
}

export function UpcomingServices({ records, loading }: UpcomingServicesProps) {
  if (loading) {
    return (
      <Card className="shadow-corporate">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Upcoming Services
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
          <CalendarClock className="h-5 w-5 text-sky-500" />
          Upcoming Services
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No upcoming services scheduled
          </p>
        ) : (
          <ul className="space-y-3">
            {records.map((record) => (
              <li key={record.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-sky-500 font-medium">•</span>
                  <span className="font-semibold">{record.fleet?.fleet_number || 'Unknown'}</span>
                  <span className="text-muted-foreground">{record.fleet?.machine_type}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Due: {record.next_service_due ? format(new Date(record.next_service_due), 'MM/dd/yyyy') : '-'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
