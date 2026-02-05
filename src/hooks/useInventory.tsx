import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  cacheInventoryItems,
  getCachedInventoryItems,
  setLastSyncTime,
  getLastSyncTime,
  updateCachedItem,
} from '@/lib/offlineDb';

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
const OFFLINE_STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes before showing stale warning

// Export function to clear cache from outside
export function clearInventoryCache() {
  globalCache = null;
}

export function useInventory(departmentId: string | undefined) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [lastSyncTime, setLastSyncTimeState] = useState<number | null>(null);
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

  // Load from IndexedDB cache first (offline-first)
  const loadFromCache = useCallback(async () => {
    if (!departmentId) return false;
    
    try {
      const cached = await getCachedInventoryItems(departmentId);
      const syncTime = await getLastSyncTime(departmentId);
      
      if (cached.length > 0) {
        // Calculate stats
        const uniqueLocations = new Set(cached.map(item => item.location_id || item.location)).size;
        const totalQuantity = cached.reduce((sum, item) => sum + item.quantity, 0);
        const lowStockItems = cached.filter(item => item.quantity <= (item.min_quantity || 0)).length;
        
        const cachedStats = {
          totalItems: cached.length,
          totalQuantity,
          uniqueLocations,
          lowStockItems,
        };
        
        setItems(cached as InventoryItem[]);
        setStats(cachedStats);
        setLastSyncTimeState(syncTime);
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return false;
  }, [departmentId]);

  const fetchItems = useCallback(async (forceRefresh = false, backgroundSync = false) => {
    if (!departmentId) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Check if we're online
    const isOnline = navigator.onLine;
    
    // If offline, try to load from cache
    if (!isOnline) {
      const hasCachedData = await loadFromCache();
      if (hasCachedData) {
        setIsOfflineData(true);
      } else {
        toast({
          title: 'Offline',
          description: 'No cached data available. Connect to internet to load inventory.',
          variant: 'destructive',
        });
        setLoading(false);
      }
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
      // Don't show loading if we have cached data or doing background sync
      if (!backgroundSync && (!globalCache || globalCache.departmentId !== departmentId)) {
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

      // Also save to IndexedDB for offline access
      try {
        await cacheInventoryItems(all);
        await setLastSyncTime(departmentId, Date.now());
        setLastSyncTimeState(Date.now());
        setIsOfflineData(false);
      } catch (cacheError) {
        console.error('Error caching to IndexedDB:', cacheError);
      }

      setItems(all);
      setStats(newStats);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      
      // If network error, try to load from cache
      const hasCachedData = await loadFromCache();
      if (hasCachedData) {
        setIsOfflineData(true);
        toast({
          title: 'Using Offline Data',
          description: 'Showing cached inventory. Some data may be outdated.',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load inventory items',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [departmentId, toast, loadFromCache]);

  useEffect(() => {
    // Load from cache immediately, then sync in background
    if (departmentId !== lastDepartmentId.current) {
      lastDepartmentId.current = departmentId;
      
      // First load from cache for instant UI
      loadFromCache().then(hasCached => {
        // Then fetch from network in background
        fetchItems(false, hasCached);
      });
    } else if (items.length === 0 && departmentId) {
      fetchItems();
    }
  }, [departmentId, fetchItems, loadFromCache, items.length]);

  const generateUniqueItemNumber = async (): Promise<string> => {
    // Get the highest existing item number in this department
    const { data } = await supabase
      .from('inventory_items')
      .select('item_number')
      .eq('department_id', departmentId)
      .like('item_number', 'IT-%')
      .order('item_number', { ascending: false })
      .limit(100);
    
    let nextNumber = 1;
    
    if (data && data.length > 0) {
      // Find the highest number from IT-XXX format
      for (const item of data) {
        const match = item.item_number.match(/^IT-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNumber) {
            nextNumber = num + 1;
          }
        }
      }
    }
    
    return `IT-${nextNumber.toString().padStart(3, '0')}`;
  };

  const createItem = async (data: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Auto-generate item_number if empty
      let itemNumber = data.item_number?.trim();
      if (!itemNumber) {
        itemNumber = await generateUniqueItemNumber();
      }
      
      const { error } = await supabase
        .from('inventory_items')
        .insert({
          ...data,
          item_number: itemNumber,
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
    targetLocationId: string | null
  ) => {
    try {
      const updateData: { classification_id: string; location_id: string | null } = {
        classification_id: targetClassificationId,
        location_id: targetLocationId, // Can be null for classification-level items
      };

      const { error } = await supabase
        .from('inventory_items')
        .update(updateData)
        .in('id', itemIds);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${itemIds.length} item(s) transferred successfully`,
      });

      // Invalidate cache and refetch
      globalCache = null;
      await fetchItems(true);
      return true;
    } catch (error: any) {
      console.error('Error transferring inventory items:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to transfer inventory items',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    items,
    loading,
    stats,
    isOfflineData,
    lastSyncTime,
    createItem,
    updateItem,
    deleteItem,
    moveItems,
    refetch: () => fetchItems(true),
    backgroundSync: () => fetchItems(true, true),
  };
}
