import { useState, useEffect, useCallback, useRef } from 'react';
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

// Cache structure for items
interface ItemsCache {
  departmentId: string;
  items: InventoryItem[];
  stats: InventoryStats;
  timestamp: number;
}

// Global cache - persists across hook instances
let globalCache: ItemsCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Export function to clear cache from outside
export function clearInventoryCache() {
  globalCache = null;
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
  
  // Track if a fetch is already in progress to prevent duplicate calls
  const fetchInProgress = useRef(false);
  const lastDepartmentId = useRef<string | undefined>(undefined);

  const fetchItems = useCallback(async (forceRefresh = false) => {
    if (!departmentId) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && globalCache && 
        globalCache.departmentId === departmentId && 
        Date.now() - globalCache.timestamp < CACHE_TTL) {
      setItems(globalCache.items);
      setStats(globalCache.stats);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchInProgress.current && !forceRefresh) {
      return;
    }

    try {
      fetchInProgress.current = true;
      // Don't show loading if we have cached data
      if (!globalCache || globalCache.departmentId !== departmentId) {
        setLoading(true);
      }

      // Fetch all items - with pagination to handle large datasets
      let allData: InventoryItem[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('department_id', departmentId)
          .order('updated_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          page++;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const all = allData as InventoryItem[];

      // Calculate stats
      const uniqueLocations = new Set(all.map(item => item.location_id || item.location)).size;
      const totalQuantity = all.reduce((sum, item) => sum + item.quantity, 0);
      const lowStockItems = all.filter(item => item.quantity <= (item.min_quantity || 0)).length;

      const newStats = {
        totalItems: all.length,
        totalQuantity,
        uniqueLocations,
        lowStockItems,
      };

      // Update cache
      globalCache = {
        departmentId,
        items: all,
        stats: newStats,
        timestamp: Date.now(),
      };

      setItems(all);
      setStats(newStats);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Error',
        description: 'Failed to load inventory items',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [departmentId, toast]);

  useEffect(() => {
    // Only fetch if department changed or no data
    if (departmentId !== lastDepartmentId.current) {
      lastDepartmentId.current = departmentId;
      fetchItems();
    } else if (items.length === 0 && departmentId) {
      fetchItems();
    }
  }, [departmentId, fetchItems, items.length]);

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

      // Invalidate cache and refetch
      globalCache = null;
      await fetchItems(true);
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

      // Invalidate cache and refetch
      globalCache = null;
      await fetchItems(true);
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

      // Invalidate cache and refetch
      globalCache = null;
      await fetchItems(true);
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

      // Invalidate cache and refetch
      globalCache = null;
      await fetchItems(true);
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
    refetch: () => fetchItems(true),
  };
}
