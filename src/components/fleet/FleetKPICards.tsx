import { CheckCircle2, Wrench, XCircle, AlertTriangle, Clock, Truck } from 'lucide-react';

interface FleetKPICardsProps {
  operational: number;
  underMaintenance: number;
  outOfService: number;
  waitingParts?: number;
  withIssues?: number;
  total?: number;
  servicesThisMonth: number;
  loading?: boolean;
}

export function FleetKPICards({ 
  operational, 
  underMaintenance, 
  outOfService, 
  waitingParts = 0,
  withIssues = 0,
  total = 0,
  servicesThisMonth,
  loading 
}: FleetKPICardsProps) {
  const kpis = [
    {
      title: 'Total Fleet',
      value: total,
      icon: Truck,
      bgColor: 'bg-slate-600',
      iconBg: 'bg-slate-700'
    },
    {
      title: 'Operational',
      value: operational,
      icon: CheckCircle2,
      bgColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-600'
    },
    {
      title: 'Under Repair',
      value: underMaintenance,
      icon: Wrench,
      bgColor: 'bg-amber-500',
      iconBg: 'bg-amber-600'
    },
    {
      title: 'Waiting Parts',
      value: waitingParts,
      icon: Clock,
      bgColor: 'bg-orange-500',
      iconBg: 'bg-orange-600'
    },
    {
      title: 'With Issues',
      value: withIssues,
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500',
      iconBg: 'bg-yellow-600'
    },
    {
      title: 'Out of Service',
      value: outOfService,
      icon: XCircle,
      bgColor: 'bg-red-500',
      iconBg: 'bg-red-600'
    }
  ];

  return (
    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.title}
          className={`${kpi.bgColor} rounded-lg p-4 text-white shadow-lg transition-transform hover:scale-[1.02]`}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className={`${kpi.iconBg} rounded-full p-2`}>
              <kpi.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-3xl font-bold">
                {loading ? '...' : kpi.value}
              </p>
              <p className="text-xs font-medium opacity-90">{kpi.title}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
