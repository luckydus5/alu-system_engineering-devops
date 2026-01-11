import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/hooks/useInventory';

// IT Equipment Classification ID from database
const IT_EQUIPMENT_CLASSIFICATION_ID = 'cc771d49-8206-4cac-b931-49a795ec46aa';

export interface ITEquipmentItem extends InventoryItem {
  location_name?: string;
  classification_name?: string;
  last_transaction?: {
    transaction_type: string;
    created_at: string;
    handed_to_user_id?: string;
    handed_to_department_id?: string;
    handed_to_user_name?: string;
    handed_to_department_name?: string;
    requested_by_user_id?: string;
    requested_by_user_name?: string;
    notes?: string;
  };
}

export function useITEquipment() {
  const [equipment, setEquipment] = useState<ITEquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all items from IT Equipment classification
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          warehouse_locations:location_id(id, name),
          warehouse_classifications:classification_id(id, name, color)
        `)
        .eq('classification_id', IT_EQUIPMENT_CLASSIFICATION_ID)
        .order('item_name');

      if (error) throw error;

      // Fetch latest transactions for each item
      const itemIds = (items || []).map(i => i.id);
      const { data: transactions } = await supabase
        .from('stock_transactions')
        .select('*')
        .in('inventory_item_id', itemIds)
        .order('created_at', { ascending: false });

      // Get unique user IDs from transactions
      const userIds = new Set<string>();
      transactions?.forEach(t => {
        if (t.handed_to_user_id) userIds.add(t.handed_to_user_id);
        if (t.requested_by_user_id) userIds.add(t.requested_by_user_id);
        if (t.created_by) userIds.add(t.created_by);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Get department names
      const deptIds = new Set<string>();
      transactions?.forEach(t => {
        if (t.handed_to_department_id) deptIds.add(t.handed_to_department_id);
      });

      const { data: departments } = await supabase
        .from('departments')
        .select('id, name')
        .in('id', Array.from(deptIds));

      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);

      // Group transactions by item ID
      const transactionMap = new Map<string, any>();
      transactions?.forEach(t => {
        if (!transactionMap.has(t.inventory_item_id)) {
          transactionMap.set(t.inventory_item_id, {
            ...t,
            handed_to_user_name: t.handed_to_user_id ? profileMap.get(t.handed_to_user_id) : null,
            handed_to_department_name: t.handed_to_department_id ? deptMap.get(t.handed_to_department_id) : null,
            requested_by_user_name: t.requested_by_user_id ? profileMap.get(t.requested_by_user_id) : null,
          });
        }
      });

      const enrichedEquipment: ITEquipmentItem[] = (items || []).map(item => ({
        ...item,
        location_name: (item.warehouse_locations as any)?.name || item.location,
        classification_name: (item.warehouse_classifications as any)?.name,
        last_transaction: transactionMap.get(item.id) || null,
      }));

      setEquipment(enrichedEquipment);
    } catch (error) {
      console.error('Error fetching IT equipment:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const stats = useMemo(() => ({
    total: equipment.length,
    totalQuantity: equipment.reduce((sum, e) => sum + (e.quantity || 0), 0),
    lowStock: equipment.filter(e => e.quantity <= (e.min_quantity || 0) && e.quantity > 0).length,
    outOfStock: equipment.filter(e => e.quantity === 0).length,
    inStock: equipment.filter(e => e.quantity > (e.min_quantity || 0)).length,
  }), [equipment]);

  return {
    equipment,
    loading,
    stats,
    refetch: fetchEquipment,
  };
}
