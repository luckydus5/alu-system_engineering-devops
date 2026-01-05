import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReports } from '@/hooks/useReports';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  draft: { label: 'Draft', icon: FileText, className: 'bg-muted text-muted-foreground' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-warning/10 text-warning border-warning/20' },
  in_review: { label: 'In Review', icon: AlertCircle, className: 'bg-info/10 text-info border-info/20' },
  approved: { label: 'Approved', icon: CheckCircle, className: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  escalated: { label: 'Escalated', icon: AlertTriangle, className: 'bg-warning/10 text-warning border-warning/20' },
};

const priorityConfig = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/10 text-info',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
};

interface RecentReportsProps {
  compact?: boolean;
}

export function RecentReports({ compact = false }: RecentReportsProps) {
  const { reports, loading } = useReports();
  const recentReports = reports.slice(0, compact ? 4 : 5);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (recentReports.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">No reports found</p>
        <p className="text-sm">Create your first report to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentReports.map((report) => {
        const status = statusConfig[report.status] || statusConfig.draft;
        const StatusIcon = status.icon;
        
        return (
          <div
            key={report.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate text-sm">{report.title}</p>
                <p className="text-xs text-muted-foreground">
                  {report.departments?.name || 'Unknown'} • {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!compact && (
                <Badge variant="outline" className={cn("capitalize text-xs", priorityConfig[report.priority])}>
                  {report.priority}
                </Badge>
              )}
              <Badge variant="outline" className={cn("flex items-center gap-1 text-xs", status.className)}>
                <StatusIcon className="h-3 w-3" />
                {compact ? null : status.label}
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}
