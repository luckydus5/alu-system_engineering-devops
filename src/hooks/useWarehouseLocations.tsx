import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WarehouseLocation {
  id: string;
  classification_id: string;
  department_id: string;
  name: string;
  description: string | null;
  min_items: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Computed fields
  item_count?: number;
  total_quantity?: number;
  low_stock_count?: number;
}

export function useWarehouseLocations(classificationId: string | undefined, departmentId?: string) {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLocations = useCallback(async () => {
    if (!classificationId && !departmentId) {
      setLocations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = (supabase as any)
        .from('warehouse_locations')
        .select('*')
        .order('sort_order', { ascending: true });

      if (classificationId) {
        query = query.eq('classification_id', classificationId);
      } else if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('warehouse_locations table not found, returning empty');
          setLocations([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Fetch item stats for each location
      const locationsWithStats = await Promise.all(
        (data || []).map(async (location: WarehouseLocation) => {
          const { data: items } = await (supabase as any)
            .from('inventory_items')
            .select('quantity, min_quantity')
            .eq('location_id', location.id);

          const itemCount = items?.length || 0;
          const totalQuantity = items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
          const lowStockCount = items?.filter((item: any) => 
            item.quantity <= (item.min_quantity || 0)
          ).length || 0;

          return {
            ...location,
            item_count: itemCount,
            total_quantity: totalQuantity,
            low_stock_count: lowStockCount,
          };
        })
      );

      setLocations(locationsWithStats);
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [classificationId, departmentId, toast]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const createLocation = async (data: {
    classification_id: string;
    department_id: string;
    name: string;
    description?: string;
    min_items?: number;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Get max sort order
      const maxOrder = locations.reduce((max, l) => Math.max(max, l.sort_order), 0);

      const { error } = await (supabase as any)
        .from('warehouse_locations')
        .insert({
          classification_id: data.classification_id,
          department_id: data.department_id,
          name: data.name,
          description: data.description || null,
          min_items: data.min_items || 0,
          sort_order: maxOrder + 1,
          created_by: userData.user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location created successfully',
      });

      await fetchLocations();
      return true;
    } catch (error: any) {
      console.error('Error creating location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create location',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateLocation = async (id: string, data: Partial<WarehouseLocation>) => {
    try {
      const { error } = await (supabase as any)
        .from('warehouse_locations')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location updated successfully',
      });

      await fetchLocations();
      return true;
    } catch (error: any) {
      console.error('Error updating location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update location',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('warehouse_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Location deleted successfully',
      });

      await fetchLocations();
      return true;
    } catch (error: any) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete location',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    locations,
    loading,
    refetch: fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
  };
}
