import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Warehouse,
  RefreshCw,
  Package,
  MapPin,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { ExcelInventoryTable } from './ExcelInventoryTable';
import { AddInventoryDialog } from './AddInventoryDialog';
import { StockTransaction } from './StockTransactionDialog';
import { Department } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface WarehouseDashboardProps {
  department: Department;
  canManage: boolean;
}

export function WarehouseDashboard({ department, canManage }: WarehouseDashboardProps) {
  const [addItemOpen, setAddItemOpen] = useState(false);
  const { toast } = useToast();

  const { items, loading, stats, createItem, updateItem, deleteItem, refetch } = useInventory(
    department.id
  );

  const handleAddItem = async (data: any) => {
    const success = await createItem({
      department_id: department.id,
      ...data,
    });
    if (success) {
      setAddItemOpen(false);
    }
  };

  // Handle stock transaction (stock in/out)
  const handleStockTransaction = async (transaction: StockTransaction): Promise<boolean> => {
    const item = items.find(i => i.id === transaction.item_id);
    if (!item) return false;

    const newQuantity = transaction.type === 'stock_in' 
      ? item.quantity + transaction.quantity 
      : item.quantity - transaction.quantity;

    if (newQuantity < 0) {
      toast({
        title: 'Error',
        description: 'Cannot reduce quantity below zero',
        variant: 'destructive',
      });
      return false;
    }

    const success = await updateItem(transaction.item_id, { quantity: newQuantity });
    
    if (success) {
      toast({
        title: transaction.type === 'stock_in' ? 'Stock In Recorded' : 'Stock Out Recorded',
        description: `${transaction.quantity} units ${transaction.type === 'stock_in' ? 'added to' : 'removed from'} ${item.item_name}`,
      });
    }

    return success;
  };

  // Calculate stock status counts
  const outOfStockCount = items.filter((i) => i.quantity === 0).length;
  const lowStockCount = items.filter((i) => i.quantity > 0 && i.quantity < 10).length;
  const inStockCount = items.filter((i) => i.quantity >= 10).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Warehouse className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-bold">{department.name}</h2>
                <Badge className="bg-white/20 text-white border-none">
                  <Package className="h-3 w-3 mr-1" />
                  Inventory
                </Badge>
              </div>
              <p className="text-amber-100 mt-1">
                {department.description || 'Warehouse inventory management system'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="icon"
              onClick={refetch}
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white border-none"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            {canManage && (
              <Button
                onClick={() => setAddItemOpen(true)}
                className="bg-white text-amber-700 hover:bg-amber-50 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats in Header */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-100 text-sm mb-1">
              <Package className="h-4 w-4" />
              Total Items
            </div>
            <p className="text-3xl font-bold">{stats.totalItems}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-100 text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Total Quantity
            </div>
            <p className="text-3xl font-bold">{stats.totalQuantity.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-100 text-sm mb-1">
              <MapPin className="h-4 w-4" />
              Locations
            </div>
            <p className="text-3xl font-bold">{stats.uniqueLocations}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-100 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </div>
            <p className="text-3xl font-bold">{stats.lowStockItems}</p>
          </div>
        </div>
      </div>

      {/* Stock Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500 text-white">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">In Stock</p>
              <p className="text-2xl font-bold text-emerald-600">{inStockCount}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-emerald-500 text-white">
                {items.length > 0 ? Math.round((inStockCount / items.length) * 100) : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500 text-white">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-amber-500 text-white">
                {items.length > 0 ? Math.round((lowStockCount / items.length) * 100) : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500 text-white">
              <Package className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-red-500 text-white">
                {items.length > 0 ? Math.round((outOfStockCount / items.length) * 100) : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Excel-like Inventory Table */}
      <ExcelInventoryTable
        items={items}
        loading={loading}
        canManage={canManage}
        onUpdate={updateItem}
        onDelete={deleteItem}
        onRefetch={refetch}
        onStockTransaction={handleStockTransaction}
      />

      {/* Add Item Dialog */}
      <AddInventoryDialog open={addItemOpen} onOpenChange={setAddItemOpen} onSubmit={handleAddItem} />
    </div>
  );
}
