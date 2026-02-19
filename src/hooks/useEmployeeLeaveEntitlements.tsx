import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeLeaveEntitlement {
  id: string;
  user_id: string;
  annual_days: number;
  monthly_accrual: number;
  sick_days: number;
  personal_days: number;
  maternity_days: number;
  paternity_days: number;
  bereavement_days: number;
  unpaid_days: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type EntitlementUpsert = {
  user_id: string;
  annual_days: number;
  sick_days?: number;
  personal_days?: number;
  maternity_days?: number;
  paternity_days?: number;
  bereavement_days?: number;
  unpaid_days?: number;
  notes?: string | null;
};

export function useEmployeeLeaveEntitlements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entitlements = [], isLoading } = useQuery({
    queryKey: ['employee-leave-entitlements'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employee_leave_entitlements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EmployeeLeaveEntitlement[];
    },
  });

  const upsertEntitlement = useMutation({
    mutationFn: async (payload: EntitlementUpsert) => {
      const { error } = await (supabase as any)
        .from('employee_leave_entitlements')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-entitlements'] });
      queryClient.invalidateQueries({ queryKey: ['all-leave-balances'] });
      toast({ title: 'Entitlement saved', description: 'Employee leave entitlement updated successfully.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteEntitlement = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any)
        .from('employee_leave_entitlements')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-leave-entitlements'] });
      toast({ title: 'Reset to default', description: 'Employee will now use global leave policy.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const getEntitlementForUser = (userId: string) =>
    entitlements.find(e => e.user_id === userId);

  return { entitlements, isLoading, upsertEntitlement, deleteEntitlement, getEntitlementForUser };
}
