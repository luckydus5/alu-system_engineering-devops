import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Warehouse, Download } from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryKPICards } from './InventoryKPICards';
import { InventoryTable } from './InventoryTable';
import { AddInventoryDialog } from './AddInventoryDialog';
import { Department } from '@/hooks/useDepartments';

interface WarehouseDashboardProps {
  department: Department;
  canManage: boolean;
}

export function WarehouseDashboard({ department, canManage }: WarehouseDashboardProps) {
  const [addItemOpen, setAddItemOpen] = useState(false);
  
  const { items, loading, stats, createItem, updateItem, deleteItem, refetch } = useInventory(department.id);

  const handleAddItem = async (data: any) => {
    const success = await createItem({
      department_id: department.id,
      ...data,
    });
    if (success) {
      setAddItemOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Warehouse className="h-7 w-7 text-primary" />
            {department.name}
          </h2>
          <p className="text-muted-foreground">{department.description}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button onClick={() => setAddItemOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <InventoryKPICards
        totalItems={stats.totalItems}
        totalQuantity={stats.totalQuantity}
        uniqueLocations={stats.uniqueLocations}
        lowStockItems={stats.lowStockItems}
        loading={loading}
      />

      {/* Inventory Table */}
      <InventoryTable
        items={items}
        loading={loading}
        canManage={canManage}
        onUpdate={updateItem}
        onDelete={deleteItem}
        onRefetch={refetch}
      />

      {/* Add Item Dialog */}
      <AddInventoryDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        onSubmit={handleAddItem}
      />
    </div>
  );
}
