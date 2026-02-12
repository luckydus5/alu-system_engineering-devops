import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LeaveApproverRole = 'peat_manager' | 'hr_reviewer' | 'gm_approver' | 'om_approver' | 'it_manager' | 'it_officer';

export const APPROVER_ROLE_LABELS: Record<LeaveApproverRole, string> = {
  peat_manager: 'Peat Manager',
  hr_reviewer: 'HR Reviewer',
  gm_approver: 'General Manager',
  om_approver: 'Operations Manager',
  it_manager: 'IT Manager',
  it_officer: 'IT Officer',
};

export interface LeaveApprover {
  id: string;
  user_id: string;
  approver_role: LeaveApproverRole;
  company_id: string | null;
  is_active: boolean;
  granted_by: string;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string | null;
    email: string;
    department_id: string | null;
  };
}

export function useLeaveApprovers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: approvers = [], isLoading } = useQuery({
    queryKey: ['leave-approvers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_approvers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map((a: any) => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, department_id')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        return data.map((a: any) => ({
          ...a,
          profile: profileMap.get(a.user_id) || null,
        })) as LeaveApprover[];
      }

      return data as unknown as LeaveApprover[];
    },
  });

  const addApprover = useMutation({
    mutationFn: async (params: { user_id: string; approver_role: LeaveApproverRole; company_id?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('leave_approvers')
        .upsert({
          user_id: params.user_id,
          approver_role: params.approver_role,
          company_id: params.company_id || null,
          granted_by: userData.user.id,
          is_active: true,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-approvers'] });
      toast({ title: 'Leave approver added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add approver', description: error.message, variant: 'destructive' });
    },
  });

  const removeApprover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leave_approvers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-approvers'] });
      toast({ title: 'Leave approver removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove approver', description: error.message, variant: 'destructive' });
    },
  });

  return { approvers, isLoading, addApprover, removeApprover };
}

// Check if current user is a specific type of approver
export function useCurrentUserApproverRoles() {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['my-approver-roles'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return [];

      const { data, error } = await supabase
        .from('leave_approvers')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_active', true);

      if (error) throw error;
      return (data || []).map((d: any) => d.approver_role as LeaveApproverRole);
    },
  });

  return {
    approverRoles: roles,
    isPeatManager: roles.includes('peat_manager'),
    isGMApprover: roles.includes('gm_approver'),
    isOMApprover: roles.includes('om_approver'),
    isAnyApprover: roles.length > 0,
    isLoading,
  };
}
