// Low Stock Report Page with separate export options
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  Package,
  PackageX,
  Download,
  RefreshCw,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Department } from '@/hooks/useDepartments';
import { useInventory, InventoryItem } from '@/hooks/useInventory';
import { useWarehouseClassifications } from '@/hooks/useWarehouseClassifications';
import { useWarehouseLocations } from '@/hooks/useWarehouseLocations';
import { exportLowStockToExcel } from '@/lib/excelExport';
import { useToast } from '@/hooks/use-toast';
import hqPowerLogo from '@/assets/hq-power-logo.png';
import { cn } from '@/lib/utils';

interface LowStockReportPageProps {
  department: Department;
  onBack: () => void;
}

export function LowStockReportPage({ department, onBack }: LowStockReportPageProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'outOfStock' | 'lowStock'>('all');
  
  const { items, loading, refetch } = useInventory(department.id);
  const { classifications } = useWarehouseClassifications(department.id);
  const { locations } = useWarehouseLocations(department.id, null);

  // Calculate stock status using accurate logic:
  // Out of Stock = quantity === 0
  // Low Stock = quantity > 0 AND quantity <= min_quantity (only if min_quantity is set and > 0)
  const stockData = useMemo(() => {
    const outOfStock: InventoryItem[] = [];
    const lowStock: InventoryItem[] = [];
    
    items.forEach(item => {
      if (item.quantity === 0) {
        outOfStock.push(item);
      } else if (item.min_quantity && item.min_quantity > 0 && item.quantity <= item.min_quantity) {
        lowStock.push(item);
      }
    });
    
    // Sort by quantity ascending
    outOfStock.sort((a, b) => a.quantity - b.quantity);
    lowStock.sort((a, b) => a.quantity - b.quantity);
    
    return { outOfStock, lowStock, all: [...outOfStock, ...lowStock] };
  }, [items]);

  // Filter by search
  const filteredData = useMemo(() => {
    const filterFn = (item: InventoryItem) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.item_name.toLowerCase().includes(q) ||
        item.item_number?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      );
    };
    
    return {
      outOfStock: stockData.outOfStock.filter(filterFn),
      lowStock: stockData.lowStock.filter(filterFn),
      all: stockData.all.filter(filterFn),
    };
  }, [stockData, searchQuery]);

  // Get classification name by ID
  const getClassificationName = (classificationId: string | null) => {
    if (!classificationId) return 'Uncategorized';
    return classifications.find(c => c.id === classificationId)?.name || 'Uncategorized';
  };

  // Get location name by ID
  const getLocationName = (locationId: string | null, location: string | null) => {
    if (locationId) {
      const loc = locations.find(l => l.id === locationId);
      return loc?.name || location || 'Unknown';
    }
    return location || 'Unknown';
  };

  const handleExport = (exportType: 'all' | 'outOfStock' | 'lowStock' = 'all') => {
    const result = exportLowStockToExcel(
      items,
      classifications.map(c => ({ id: c.id, name: c.name })),
      department.name,
      exportType
    );
    
    if (result.success) {
      toast({
        title: 'Export Successful',
        description: result.message,
      });
    } else {
      toast({
        title: 'No Data',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'outOfStock':
        return filteredData.outOfStock;
      case 'lowStock':
        return filteredData.lowStock;
      default:
        return filteredData.all;
    }
  };

  const renderTable = (data: InventoryItem[], showStatus = true) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Item Number</TableHead>
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-center">Quantity</TableHead>
            <TableHead className="text-center">Min Qty</TableHead>
            {showStatus && <TableHead className="text-center">Status</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showStatus ? 8 : 7} className="text-center py-8 text-muted-foreground">
                No items found
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              const isOutOfStock = item.quantity === 0;
              return (
                <TableRow key={item.id} className={cn(
                  isOutOfStock && 'bg-red-50 dark:bg-red-950/20'
                )}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{item.item_number || 'N/A'}</TableCell>
                  <TableCell className="font-medium max-w-[250px] truncate">{item.item_name}</TableCell>
                  <TableCell className="text-muted-foreground">{getClassificationName(item.classification_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{getLocationName(item.location_id, item.location)}</TableCell>
                  <TableCell className="text-center">
                    <span className={cn(
                      'font-bold',
                      isOutOfStock ? 'text-red-600' : 'text-amber-600'
                    )}>
                      {item.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {item.min_quantity || '-'}
                  </TableCell>
                  {showStatus && (
                    <TableCell className="text-center">
                      {isOutOfStock ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : (
                        <Badge className="bg-amber-500 hover:bg-amber-600">Low Stock</Badge>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <img src={hqPowerLogo} alt="HQ Power" className="h-10 w-auto" />
              <div className="border-l-2 border-red-500 pl-4">
                <h1 className="text-lg font-bold text-foreground">Low Stock Report</h1>
                <p className="text-xs text-muted-foreground">{department.name}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('all')} className="gap-2">
                    <Package className="h-4 w-4" />
                    Export All (Low + Out of Stock)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('outOfStock')} className="gap-2">
                    <PackageX className="h-4 w-4 text-red-500" />
                    Export Out of Stock Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('lowStock')} className="gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Export Low Stock Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name, item number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500 rounded-xl">
                      <PackageX className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-red-700 dark:text-red-300">Out of Stock</p>
                      <p className="text-3xl font-bold text-red-800 dark:text-red-200">{stockData.outOfStock.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500 rounded-xl">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">Low Stock</p>
                      <p className="text-3xl font-bold text-amber-800 dark:text-amber-200">{stockData.lowStock.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-500 rounded-xl">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                      <p className="text-3xl font-bold">{stockData.all.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'outOfStock' | 'lowStock')}>
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="gap-2">
                  All Items
                  <Badge variant="secondary" className="ml-1">{filteredData.all.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="outOfStock" className="gap-2">
                  <PackageX className="h-4 w-4 text-red-500" />
                  Out of Stock
                  <Badge variant="destructive" className="ml-1">{filteredData.outOfStock.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="lowStock" className="gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Low Stock
                  <Badge className="ml-1 bg-amber-500">{filteredData.lowStock.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {activeTab === 'outOfStock' && <PackageX className="h-5 w-5 text-red-500" />}
                    {activeTab === 'lowStock' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    {activeTab === 'all' && <Package className="h-5 w-5" />}
                    {activeTab === 'all' ? 'All Low/Out of Stock Items' : 
                     activeTab === 'outOfStock' ? 'Out of Stock Items' : 'Low Stock Items'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TabsContent value="all" className="mt-0">
                    {renderTable(filteredData.all)}
                  </TabsContent>
                  <TabsContent value="outOfStock" className="mt-0">
                    {renderTable(filteredData.outOfStock, false)}
                  </TabsContent>
                  <TabsContent value="lowStock" className="mt-0">
                    {renderTable(filteredData.lowStock, false)}
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>

            {/* Legend */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Stock Status Logic:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li><Badge variant="destructive" className="mr-2">Out of Stock</Badge> Quantity = 0</li>
                <li><Badge className="bg-amber-500 mr-2">Low Stock</Badge> Quantity {'>'} 0 AND Quantity ≤ Min Quantity</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
