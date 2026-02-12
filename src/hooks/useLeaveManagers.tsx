import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LeaveManager {
  id: string;
  user_id: string;
  granted_by: string;
  can_file_for_others: boolean;
  can_edit_balances: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    email: string;
    department_id: string | null;
  };
}

export function useLeaveManagers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveManagers = [], isLoading } = useQuery({
    queryKey: ['leave-managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_managers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for these users
      if (data && data.length > 0) {
        const userIds = data.map((m: any) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, department_id')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data.map((m: any) => ({
          ...m,
          profile: profileMap.get(m.user_id) || null,
        })) as LeaveManager[];
      }

      return data as unknown as LeaveManager[];
    },
  });

  const addLeaveManager = useMutation({
    mutationFn: async (params: { user_id: string; can_file_for_others: boolean; can_edit_balances: boolean }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('leave_managers')
        .upsert({
          user_id: params.user_id,
          granted_by: userData.user.id,
          can_file_for_others: params.can_file_for_others,
          can_edit_balances: params.can_edit_balances,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-managers'] });
      toast({ title: 'Leave manager permissions updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update permissions', description: error.message, variant: 'destructive' });
    },
  });

  const removeLeaveManager = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_managers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-managers'] });
      toast({ title: 'Leave manager removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove leave manager', description: error.message, variant: 'destructive' });
    },
  });

  return { leaveManagers, isLoading, addLeaveManager, removeLeaveManager };
}

// Hook to check if current user has leave manager permissions
export function useCurrentUserLeavePermissions() {
  const { data: permissions, isLoading } = useQuery({
    queryKey: ['my-leave-permissions'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await supabase
        .from('leave_managers')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (error) throw error;
      return data as { can_file_for_others: boolean; can_edit_balances: boolean } | null;
    },
  });

  return {
    canFileForOthers: permissions?.can_file_for_others ?? false,
    canEditBalances: permissions?.can_edit_balances ?? false,
    isLoading,
  };
}
