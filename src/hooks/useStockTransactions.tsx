import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StockTransactionRecord {
  id: string;
  inventory_item_id: string;
  department_id: string;
  transaction_type: 'in' | 'out';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  // Joined fields
  item_name?: string;
  item_number?: string;
  user_name?: string;
}

export function useStockTransactions(departmentId: string | undefined) {
  const [transactions, setTransactions] = useState<StockTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransactions = useCallback(async () => {
    if (!departmentId) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Use 'any' cast since stock_transactions is not in generated types yet
      // First try with joins, fallback to simple query
      let data: any[] = [];
      let error: any = null;

      try {
        const result = await (supabase as any)
          .from('stock_transactions')
          .select(`
            *,
            inventory_items!inner (item_name, item_number)
          `)
          .eq('department_id', departmentId)
          .order('created_at', { ascending: false })
          .limit(100);
        
        data = result.data || [];
        error = result.error;
      } catch (e) {
        // If join fails, try simple query
        const result = await (supabase as any)
          .from('stock_transactions')
          .select('*')
          .eq('department_id', departmentId)
          .order('created_at', { ascending: false })
          .limit(100);
        
        data = result.data || [];
        error = result.error;
      }

      if (error) {
        // If table doesn't exist, just return empty array silently
        if (error.code === '42P01' || error.message?.includes('does not exist') || error.code === 'PGRST204') {
          console.log('stock_transactions table issue, skipping...', error.message);
          setTransactions([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      const formattedTransactions: StockTransactionRecord[] = (data || []).map((t: any) => ({
        ...t,
        item_name: t.inventory_items?.item_name || 'Unknown',
        item_number: t.inventory_items?.item_number || 'N/A',
        user_name: t.profiles?.full_name || 'Unknown User',
      }));

      setTransactions(formattedTransactions);
    } catch (error: any) {
      console.error('Error fetching stock transactions:', error);
      // Don't show toast for common issues, just log
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = async (data: {
    inventory_item_id: string;
    department_id: string;
    transaction_type: 'in' | 'out';
    quantity: number;
    previous_quantity: number;
    new_quantity: number;
    notes?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Use 'any' cast since stock_transactions is not in generated types yet
      const { error } = await (supabase as any)
        .from('stock_transactions')
        .insert({
          ...data,
          created_by: userData.user?.id,
        });

      if (error) {
        // If table doesn't exist, log and continue without error
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('stock_transactions table not found, skipping transaction recording...');
          return true;
        }
        throw error;
      }

      await fetchTransactions();
      return true;
    } catch (error: any) {
      console.error('Error creating stock transaction:', error);
      // Don't show error toast for missing table, just log it
      if (!error.message?.includes('does not exist')) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to record transaction',
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  // Get recent stock out transactions
  const stockOutHistory = transactions.filter(t => t.transaction_type === 'out');
  
  // Get recent stock in transactions
  const stockInHistory = transactions.filter(t => t.transaction_type === 'in');

  return {
    transactions,
    stockOutHistory,
    stockInHistory,
    loading,
    createTransaction,
    refetch: fetchTransactions,
  };
}
