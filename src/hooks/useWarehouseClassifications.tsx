import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const fetchClassifications = useCallback(async () => {
    if (!departmentId) {
      setClassifications([]);
      setLoading(false);
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

      // Fetch counts using RPC or individual count queries for accuracy
      // This avoids the 1000 row limit issue with regular selects
      const classificationIds = data.map((c: WarehouseClassification) => c.id);

      // Use count queries for each classification to avoid row limits
      const statsPromises = classificationIds.map(async (classId: string) => {
        const [locCount, itemCount, itemSum, lowStockCount] = await Promise.all([
          // Location count
          supabase
            .from('warehouse_locations')
            .select('*', { count: 'exact', head: true })
            .eq('classification_id', classId),
          // Item count
          supabase
            .from('inventory_items')
            .select('*', { count: 'exact', head: true })
            .eq('classification_id', classId),
          // Sum of quantities - fetch all items for this classification
          supabase
            .from('inventory_items')
            .select('quantity')
            .eq('classification_id', classId),
          // Low stock count
          supabase
            .from('inventory_items')
            .select('*', { count: 'exact', head: true })
            .eq('classification_id', classId)
            .lte('quantity', 0) // This is a simplification, we'll calculate properly below
        ]);

        // Calculate total quantity from items
        const totalQty = (itemSum.data || []).reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        
        // For low stock, we need to check where quantity <= min_quantity
        // Fetch items with their min_quantity to count properly
        const { data: lowItems } = await supabase
          .from('inventory_items')
          .select('quantity, min_quantity')
          .eq('classification_id', classId);
        
        const lowStockActual = (lowItems || []).filter(
          (item: any) => item.quantity <= (item.min_quantity || 0)
        ).length;

        return {
          classId,
          locationCount: locCount.count || 0,
          itemCount: itemCount.count || 0,
          totalQuantity: totalQty,
          lowStockCount: lowStockActual,
        };
      });

      const allStats = await Promise.all(statsPromises);

      // Build maps for O(1) lookups
      const statsMap = new Map(allStats.map(s => [s.classId, s]));

      // Build final array
      const classificationsWithStats = data.map((classification: WarehouseClassification) => {
        const stats = statsMap.get(classification.id);
        return {
          ...classification,
          location_count: stats?.locationCount || 0,
          item_count: stats?.itemCount || 0,
          total_quantity: stats?.totalQuantity || 0,
          low_stock_count: stats?.lowStockCount || 0,
        };
      });

      setClassifications(classificationsWithStats);
    } catch (error: any) {
      console.error('Error fetching classifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [departmentId, toast]);

  useEffect(() => {
    fetchClassifications();
  }, [fetchClassifications]);

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
    refetch: fetchClassifications,
    createClassification,
    updateClassification,
    deleteClassification,
  };
}
