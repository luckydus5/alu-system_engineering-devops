import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  department_id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  location: string;
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
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('department_id', departmentId)
        .order('item_number', { ascending: true });

      if (error) throw error;

      const inventoryItems = data as InventoryItem[];
      setItems(inventoryItems);

      // Calculate stats
      const uniqueLocations = new Set(inventoryItems.map(item => item.location)).size;
      const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      const lowStockItems = inventoryItems.filter(item => item.quantity < 10).length;

      setStats({
        totalItems: inventoryItems.length,
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

  return {
    items,
    loading,
    stats,
    createItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  };
}
