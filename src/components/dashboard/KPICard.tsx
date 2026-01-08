import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  variant?: 'default' | 'blue' | 'gold' | 'success' | 'warning';
  className?: string;
  description?: string;
  trend?: { value: string; positive: boolean };
}

export function KPICard({ title, value, icon, variant = 'default', className, description, trend }: KPICardProps) {
  const variantStyles = {
    default: 'kpi-blue',
    blue: 'kpi-blue',
    gold: 'kpi-gold',
    success: 'kpi-success',
    warning: 'kpi-warning',
  };

  const iconStyles = {
    default: 'bg-primary/15 text-primary',
    blue: 'bg-primary/15 text-primary',
    gold: 'bg-secondary/15 text-secondary',
    success: 'bg-success/15 text-success',
    warning: 'bg-destructive/15 text-destructive',
  };

  return (
    <Card className={cn(
      "shadow-corporate hover:shadow-corporate-lg transition-all duration-300 border-0 overflow-hidden group",
      variantStyles[variant],
      className
    )}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}>
                {trend.value}
              </p>
            )}
          </div>
          {icon && (
            <div className={cn(
              "p-2.5 md:p-3 rounded-xl transition-transform duration-300 group-hover:scale-110",
              iconStyles[variant]
            )}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
