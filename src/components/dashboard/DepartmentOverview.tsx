import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useReportStats } from '@/hooks/useReportStats';
import { 
  DollarSign, 
  ShieldCheck, 
  ShoppingCart, 
  Cog, 
  Users, 
  Monitor, 
  Headphones, 
  HardHat,
  Building2,
  Car,
  Package,
  Warehouse
} from 'lucide-react';

const departmentIcons: Record<string, typeof DollarSign> = {
  'FIN': DollarSign,
  'SAF': ShieldCheck,
  'PRO': ShoppingCart,
  'OPS': Cog,
  'HR': Users,
  'IT': Monitor,
  'CS': Headphones,
  'ENG': HardHat,
  'FLEET': Car,
  'WH': Package,
  'WAREHOUSE': Warehouse,
};

const departmentColors: Record<string, string> = {
  'FIN': 'bg-blue-500',
  'SAF': 'bg-red-500',
  'PRO': 'bg-green-500',
  'OPS': 'bg-orange-500',
  'HR': 'bg-purple-500',
  'IT': 'bg-cyan-500',
  'CS': 'bg-pink-500',
  'ENG': 'bg-yellow-500',
};

export function DepartmentOverview() {
  const { departmentStats, loading } = useReportStats();

  if (loading) {
    return (
      <Card className="shadow-corporate">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Department Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-corporate">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Department Overview</CardTitle>
      </CardHeader>
      <CardContent>
        {departmentStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No department data</p>
            <p className="text-sm">Reports will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-4">
            {departmentStats.map((dept) => {
              const Icon = departmentIcons[dept.departmentCode] || Building2;
              const colorClass = departmentColors[dept.departmentCode] || 'bg-primary';
              
              return (
                <div
                  key={dept.departmentId}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className={`p-2.5 rounded-lg ${colorClass}/10`}>
                    <Icon className={`h-5 w-5 ${colorClass.replace('bg-', 'text-')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-foreground">{dept.departmentName}</p>
                      <span className="text-sm text-muted-foreground">
                        {dept.total} report{dept.total !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={dept.completion} className="flex-1 h-2" />
                      <span className="text-sm font-medium text-foreground w-12">
                        {dept.completion}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
