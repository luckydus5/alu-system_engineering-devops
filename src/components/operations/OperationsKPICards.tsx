import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';

interface OperationsKPICardsProps {
  total: number;
  active: number;
  inProgress: number;
  completed: number;
  issues: number;
  loading?: boolean;
}

export function OperationsKPICards({
  total,
  active,
  inProgress,
  completed,
  issues,
  loading,
}: OperationsKPICardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KPICard
        title="Total Updates"
        value={total.toString()}
        icon={<TrendingUp className="h-5 w-5" />}
        description="All field updates"
      />
      <KPICard
        title="Active"
        value={active.toString()}
        icon={<Activity className="h-5 w-5" />}
        trend={{ value: 'Live', positive: true }}
        description="Currently active"
      />
      <KPICard
        title="In Progress"
        value={inProgress.toString()}
        icon={<Clock className="h-5 w-5" />}
        description="Being worked on"
      />
      <KPICard
        title="Completed"
        value={completed.toString()}
        icon={<CheckCircle className="h-5 w-5" />}
        description="Finished tasks"
      />
      <KPICard
        title="Issues"
        value={issues.toString()}
        icon={<AlertTriangle className="h-5 w-5" />}
        trend={issues > 0 ? { value: 'Attention needed', positive: false } : undefined}
        description="Need attention"
      />
    </div>
  );
}
