import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  department_id: string;
  classification_id: string | null;
  location_id: string | null;
  item_number: string;
  item_name: string;
  quantity: number;
  min_quantity: number;
  location: string;
  description: string | null;
  unit: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface InventoryStats {
  totalItems: number;
  totalQuantity: number;
  uniqueLocations: number;
  lowStockItems: number;
}

export function useInventory(departmentId: string | undefined) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<InventoryStats>({
    totalItems: 0,
    totalQuantity: 0,
    uniqueLocations: 0,
    lowStockItems: 0,
  });
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    if (!departmentId) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Supabase/PostgREST enforces a max rows per request (often 1000).
      // We must paginate to ensure large folders don’t appear empty.
      const pageSize = 1000;
      let from = 0;
      const all: InventoryItem[] = [];

      while (true) {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('department_id', departmentId)
          .order('item_number', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) throw error;

        const page = (data as InventoryItem[]) || [];
        all.push(...page);

        if (page.length < pageSize) break;
        from += pageSize;
      }

      setItems(all);

      // Calculate stats
      const uniqueLocations = new Set(all.map(item => item.location_id || item.location)).size;
      const totalQuantity = all.reduce((sum, item) => sum + item.quantity, 0);
      const lowStockItems = all.filter(item => item.quantity <= (item.min_quantity || 0)).length;

      setStats({
        totalItems: all.length,
        totalQuantity,
        uniqueLocations,
        lowStockItems,
      });
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [departmentId, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = async (data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('inventory_items')
        .insert({
          ...data,
          created_by: userData.user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Inventory item added successfully',
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error creating inventory item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add inventory item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateItem = async (id: string, data: Partial<InventoryItem>) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Inventory item updated successfully',
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error updating inventory item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update inventory item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Inventory item deleted successfully',
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error deleting inventory item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inventory item',
        variant: 'destructive',
      });
      return false;
    }
  };

  const moveItems = async (
    itemIds: string[],
    targetClassificationId: string,
    targetLocationId: string
  ) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          classification_id: targetClassificationId,
          location_id: targetLocationId,
        })
        .in('id', itemIds);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${itemIds.length} item(s) moved successfully`,
      });

      await fetchItems();
      return true;
    } catch (error: any) {
      console.error('Error moving inventory items:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to move inventory items',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    items,
    loading,
    stats,
    createItem,
    updateItem,
    deleteItem,
    moveItems,
    refetch: fetchItems,
  };
}
