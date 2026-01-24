import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReceivingRecordItem {
  id: string;
  item_name: string;
  item_number: string;
  quantity: number;
  unit: string;
  image_url?: string | null;
}

export interface ReceivingRecord {
  id: string;
  department_id: string;
  record_name: string;
  receiving_date: string;
  status: string;
  items: ReceivingRecordItem[];
  total_items: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export function useReceivingRecords(departmentId: string) {
  const [records, setRecords] = useState<ReceivingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRecords = useCallback(async () => {
    if (!departmentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receiving_records')
        .select('*')
        .eq('department_id', departmentId)
        .order('receiving_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse items from JSONB
      const parsedRecords = (data || []).map(record => ({
        ...record,
        items: Array.isArray(record.items) ? record.items : JSON.parse(record.items as string || '[]'),
      })) as ReceivingRecord[];

      setRecords(parsedRecords);
    } catch (error) {
      console.error('Error fetching receiving records:', error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const createRecord = useCallback(async (data: {
    record_name: string;
    receiving_date: Date;
    items: ReceivingRecordItem[];
    notes?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const insertData = {
        department_id: departmentId,
        record_name: data.record_name,
        receiving_date: data.receiving_date.toISOString().split('T')[0],
        items: JSON.stringify(data.items),
        total_items: data.items.length,
        notes: data.notes,
        created_by: userData.user?.id,
        status: 'completed',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newRecord, error } = await (supabase
        .from('receiving_records') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Record Created',
        description: `Successfully saved "${data.record_name}"`,
      });

      await fetchRecords();
      return newRecord;
    } catch (error) {
      console.error('Error creating receiving record:', error);
      toast({
        title: 'Error',
        description: 'Failed to create receiving record',
        variant: 'destructive',
      });
      throw error;
    }
  }, [departmentId, fetchRecords, toast]);

  const updateRecord = useCallback(async (id: string, data: {
    record_name?: string;
    receiving_date?: Date;
    items?: ReceivingRecordItem[];
    notes?: string;
    status?: string;
  }) => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (data.record_name) updateData.record_name = data.record_name;
      if (data.receiving_date) updateData.receiving_date = data.receiving_date.toISOString().split('T')[0];
      if (data.items) {
        updateData.items = data.items as unknown as Record<string, unknown>[];
        updateData.total_items = data.items.length;
      }
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.status) updateData.status = data.status;

      const { error } = await supabase
        .from('receiving_records')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Record Updated',
        description: 'Changes saved successfully',
      });

      await fetchRecords();
    } catch (error) {
      console.error('Error updating receiving record:', error);
      toast({
        title: 'Error',
        description: 'Failed to update record',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchRecords, toast]);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('receiving_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Record Deleted',
        description: 'Record removed successfully',
      });

      await fetchRecords();
    } catch (error) {
      console.error('Error deleting receiving record:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete record',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchRecords, toast]);

  return {
    records,
    loading,
    refetch: fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
  };
}
