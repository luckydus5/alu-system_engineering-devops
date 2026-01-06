import { Card, CardContent } from '@/components/ui/card';
import { Package, Boxes, MapPin, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryKPICardsProps {
  totalItems: number;
  totalQuantity: number;
  uniqueLocations: number;
  lowStockItems: number;
  loading: boolean;
}

export function InventoryKPICards({
  totalItems,
  totalQuantity,
  uniqueLocations,
  lowStockItems,
  loading,
}: InventoryKPICardsProps) {
  const kpis = [
    {
      title: 'Total Items',
      value: totalItems,
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total Quantity',
      value: totalQuantity,
      icon: Boxes,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Locations',
      value: uniqueLocations,
      icon: MapPin,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Low Stock',
      value: lowStockItems,
      icon: AlertTriangle,
      color: lowStockItems > 0 ? 'text-amber-500' : 'text-muted-foreground',
      bgColor: lowStockItems > 0 ? 'bg-amber-500/10' : 'bg-muted',
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpi.value}</p>
              </div>
              <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
