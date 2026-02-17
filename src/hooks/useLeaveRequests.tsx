import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type LeaveType = 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'bereavement' | 'unpaid';
export type LeaveStatus = 'pending' | 'hr_approved' | 'manager_approved' | 'gm_pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  requester_id: string;
  department_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: LeaveStatus;
  manager_id: string | null;
  manager_action_at: string | null;
  manager_comment: string | null;
  hr_reviewer_id: string | null;
  hr_action_at: string | null;
  hr_comment: string | null;
  gm_reviewer_id: string | null;
  gm_action_at: string | null;
  gm_comment: string | null;
  created_at: string;
  updated_at: string;
  requester?: {
    full_name: string | null;
    email: string;
  };
  department?: {
    name: string;
  };
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type: LeaveType;
  total_days: number;
  used_days: number;
  year: number;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  bereavement: 'Bereavement Leave',
  unpaid: 'Unpaid Leave',
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: 'Pending HR',
  hr_approved: 'HR Approved',
  manager_approved: 'Mgr Approved',
  gm_pending: 'Awaiting GM',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export function useLeaveRequests(departmentId?: string, isHR = false) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leaveRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['leave-requests', departmentId, isHR],
    queryFn: async () => {
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          department:departments(name)
        `)
        .order('created_at', { ascending: false });

      if (departmentId && !isHR) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch requester profiles separately
      if (data && data.length > 0) {
        const requesterIds = [...new Set(data.map(r => r.requester_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', requesterIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        return data.map(request => ({
          ...request,
          requester: profileMap.get(request.requester_id) || null,
        })) as unknown as LeaveRequest[];
      }
      
      return data as unknown as LeaveRequest[];
    },
    enabled: true,
  });

  const createRequest = useMutation({
    mutationFn: async (request: {
      leave_type: LeaveType;
      start_date: string;
      end_date: string;
      total_days: number;
      reason?: string;
      department_id: string;
      employee_id?: string;
      company_id?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const insertData: Record<string, unknown> = {
        ...request,
        requester_id: request.employee_id || userData.user.id,
      };

      // If filing on behalf of an employee, track who submitted
      if (request.employee_id) {
        insertData.submitted_by_id = userData.user.id;
        insertData.requester_id = request.employee_id;
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: 'Leave request submitted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to submit leave request', description: error.message, variant: 'destructive' });
    },
  });

  const updateRequestStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      comment,
      isManager = false,
      isHR = false,
    }: {
      id: string;
      status: LeaveStatus;
      comment?: string;
      isManager?: boolean;
      isHR?: boolean;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const updateData: Record<string, unknown> = { status };

      if (isManager) {
        // Peat Manager approving → manager_approved
        updateData.manager_id = userData.user.id;
        updateData.manager_action_at = new Date().toISOString();
        if (comment) updateData.manager_comment = comment;
      } else if (isHR) {
        // HR forwarding to GM → gm_pending, or HR rejecting
        updateData.hr_reviewer_id = userData.user.id;
        updateData.hr_action_at = new Date().toISOString();
        if (comment) updateData.hr_comment = comment;
      } else {
        // GM/OM final decision → approved or rejected
        updateData.gm_reviewer_id = userData.user.id;
        updateData.gm_action_at = new Date().toISOString();
        if (comment) updateData.gm_comment = comment;
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: 'Leave request updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update request', description: error.message, variant: 'destructive' });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' as LeaveStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast({ title: 'Leave request cancelled' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to cancel request', description: error.message, variant: 'destructive' });
    },
  });

  return {
    leaveRequests,
    isLoading,
    refetch,
    createRequest,
    updateRequestStatus,
    cancelRequest,
  };
}

export function useLeaveBalances(userId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['leave-balances', userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('year', new Date().getFullYear());

      if (error) throw error;
      return data as unknown as LeaveBalance[];
    },
    enabled: true,
  });

  const updateBalance = useMutation({
    mutationFn: async (balance: Partial<LeaveBalance> & { user_id: string; leave_type: LeaveType }) => {
      const { data, error } = await supabase
        .from('leave_balances')
        .upsert({
          ...balance,
          year: new Date().getFullYear(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      toast({ title: 'Leave balance updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update balance', description: error.message, variant: 'destructive' });
    },
  });

  return { balances, isLoading, updateBalance };
}
