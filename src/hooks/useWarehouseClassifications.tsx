import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cacheClassifications, getCachedClassifications } from '@/lib/offlineDb';

export interface WarehouseClassification {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Computed fields
  location_count?: number;
  item_count?: number;
  total_quantity?: number;
  low_stock_count?: number;
}

export function useWarehouseClassifications(departmentId: string | undefined) {
  const [classifications, setClassifications] = useState<WarehouseClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const { toast } = useToast();

  // Load from cache first
  const loadFromCache = useCallback(async () => {
    if (!departmentId) return false;
    
    try {
      const cached = await getCachedClassifications(departmentId);
      if (cached.length > 0) {
        // Cast to WarehouseClassification (cache doesn't have computed fields)
        setClassifications(cached.map(c => ({
          ...c,
          icon: c.icon || 'Folder',
          color: c.color || '#6366F1',
          sort_order: c.sort_order || 0,
          location_count: 0,
          item_count: 0,
          total_quantity: 0,
          low_stock_count: 0,
        })) as WarehouseClassification[]);
        setLoading(false);
        return true;
      }
    } catch (error) {
      console.error('Error loading classifications from cache:', error);
    }
    return false;
  }, [departmentId]);

  const fetchClassifications = useCallback(async () => {
    if (!departmentId) {
      setClassifications([]);
      setLoading(false);
      return;
    }

    // Check if we're online
    const isOnline = navigator.onLine;
    
    if (!isOnline) {
      const hasCached = await loadFromCache();
      if (hasCached) {
        setIsOfflineData(true);
      }
      return;
    }

    try {
      setLoading(true);
      
      // Fetch classifications - single query
      const { data, error } = await (supabase as any)
        .from('warehouse_classifications')
        .select('*')
        .eq('department_id', departmentId)
        .order('sort_order', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('warehouse_classifications table not found, returning empty');
          setClassifications([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // If no classifications, return early
      if (!data || data.length === 0) {
        setClassifications([]);
        setLoading(false);
        return;
      }

      // Batch fetch all stats in just 2 queries instead of N*5 queries
      const classificationIds = data.map((c: WarehouseClassification) => c.id);

      // Single query for all location counts grouped by classification
      const [locationsResult, itemsResult] = await Promise.all([
        supabase
          .from('warehouse_locations')
          .select('classification_id')
          .in('classification_id', classificationIds),
        supabase
          .from('inventory_items')
          .select('classification_id, quantity, min_quantity')
          .in('classification_id', classificationIds),
      ]);

      // Build stats from the two result sets
      const locationCounts = new Map<string, number>();
      (locationsResult.data || []).forEach((loc: any) => {
        locationCounts.set(loc.classification_id, (locationCounts.get(loc.classification_id) || 0) + 1);
      });

      const itemCounts = new Map<string, number>();
      const totalQuantities = new Map<string, number>();
      const lowStockCounts = new Map<string, number>();
      (itemsResult.data || []).forEach((item: any) => {
        const cid = item.classification_id;
        itemCounts.set(cid, (itemCounts.get(cid) || 0) + 1);
        totalQuantities.set(cid, (totalQuantities.get(cid) || 0) + (item.quantity || 0));
        if (item.quantity <= (item.min_quantity || 0)) {
          lowStockCounts.set(cid, (lowStockCounts.get(cid) || 0) + 1);
        }
      });

      // Build final array
      const classificationsWithStats = data.map((classification: WarehouseClassification) => ({
        ...classification,
        location_count: locationCounts.get(classification.id) || 0,
        item_count: itemCounts.get(classification.id) || 0,
        total_quantity: totalQuantities.get(classification.id) || 0,
        low_stock_count: lowStockCounts.get(classification.id) || 0,
      }));

      // Cache for offline use
      try {
        await cacheClassifications(data);
      } catch (cacheError) {
        console.error('Error caching classifications:', cacheError);
      }

      setIsOfflineData(false);
      setClassifications(classificationsWithStats);
    } catch (error: any) {
      console.error('Error fetching classifications:', error);
      
      // Try loading from cache on error
      const hasCached = await loadFromCache();
      if (hasCached) {
        setIsOfflineData(true);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load classifications',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [departmentId, toast, loadFromCache]);

  useEffect(() => {
    // Load from cache first, then fetch
    loadFromCache().then(hasCached => {
      fetchClassifications();
    });
  }, [fetchClassifications, loadFromCache]);

  const createClassification = async (data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get max sort order
      const maxOrder = classifications.reduce((max, c) => Math.max(max, c.sort_order), 0);

      const { error } = await (supabase as any)
        .from('warehouse_classifications')
        .insert({
          department_id: departmentId,
          name: data.name,
          description: data.description || null,
          icon: data.icon || 'Folder',
          color: data.color || '#6366F1',
          sort_order: maxOrder + 1,
          created_by: userData.user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Classification created successfully',
      });

      await fetchClassifications();
      return true;
    } catch (error: any) {
      console.error('Error creating classification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create classification',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateClassification = async (id: string, data: Partial<WarehouseClassification>) => {
    try {
      const { error } = await (supabase as any)
        .from('warehouse_classifications')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Classification updated successfully',
      });

      await fetchClassifications();
      return true;
    } catch (error: any) {
      console.error('Error updating classification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update classification',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteClassification = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('warehouse_classifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Classification deleted successfully',
      });

      await fetchClassifications();
      return true;
    } catch (error: any) {
      console.error('Error deleting classification:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete classification',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    classifications,
    loading,
    isOfflineData,
    refetch: fetchClassifications,
    createClassification,
    updateClassification,
    deleteClassification,
  };
}
