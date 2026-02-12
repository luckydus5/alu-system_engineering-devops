import { Card, CardContent } from '@/components/ui/card';
import { Clock, CalendarDays, TrendingUp, Sun, Moon, Shield } from 'lucide-react';

interface PolicyKPICardsProps {
  getPolicyValue: (category: string, key: string, defaultValue?: string) => string;
}

export function PolicyKPICards({ getPolicyValue }: PolicyKPICardsProps) {
  const cards = [
    {
      label: 'Day Shift',
      value: `${getPolicyValue('shift', 'day_shift_start', '08:00')} – ${getPolicyValue('shift', 'day_shift_end', '17:00')}`,
      sub: `Max OT: ${getPolicyValue('overtime', 'day_shift_ot_max_hours', '1.5')}h`,
      icon: Sun,
      color: 'text-amber-600 bg-amber-500/10',
    },
    {
      label: 'Night Shift',
      value: `${getPolicyValue('shift', 'night_shift_start', '18:00')} – ${getPolicyValue('shift', 'night_shift_end', '03:00')}`,
      sub: `Max OT: ${getPolicyValue('overtime', 'night_shift_ot_max_hours', '3')}h`,
      icon: Moon,
      color: 'text-indigo-600 bg-indigo-500/10',
    },
    {
      label: 'Annual Leave',
      value: `${getPolicyValue('leave', 'default_annual_days', '18')} days`,
      sub: `Carry-over: ${getPolicyValue('leave', 'carry_over_enabled', 'false') === 'true' ? 'Yes' : 'No'}`,
      icon: CalendarDays,
      color: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      label: 'Late Threshold',
      value: `${getPolicyValue('attendance', 'late_threshold_minutes', '15')} min`,
      sub: `Grace: ${getPolicyValue('attendance', 'grace_period_minutes', '5')} min`,
      icon: Clock,
      color: 'text-orange-600 bg-orange-500/10',
    },
    {
      label: 'Weekday OT Rate',
      value: `${getPolicyValue('overtime', 'weekday_ot_rate', '1.5')}×`,
      sub: `Holiday: ${getPolicyValue('overtime', 'holiday_ot_rate', '2.5')}×`,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-500/10',
    },
    {
      label: 'Approval Flow',
      value: [
        getPolicyValue('leave', 'require_manager_approval', 'true') === 'true' ? 'MGR' : null,
        getPolicyValue('leave', 'require_hr_approval', 'true') === 'true' ? 'HR' : null,
        getPolicyValue('leave', 'require_gm_approval', 'true') === 'true' ? 'GM' : null,
      ].filter(Boolean).join(' → ') || 'None',
      sub: 'Leave approval chain',
      icon: Shield,
      color: 'text-purple-600 bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-sm font-bold leading-tight">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
