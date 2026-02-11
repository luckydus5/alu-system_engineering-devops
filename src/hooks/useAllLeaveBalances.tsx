import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LeaveType } from './useLeaveRequests';

export interface EmployeeLeaveBalance {
  user_id: string;
  full_name: string | null;
  email: string;
  department_name: string | null;
  balances: {
    leave_type: LeaveType;
    total_days: number;
    used_days: number;
    remaining: number;
  }[];
}

export function useAllLeaveBalances() {
  const { data: employeeBalances = [], isLoading, refetch } = useQuery({
    queryKey: ['all-leave-balances'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      // Fetch all balances for current year
      const { data: balances, error: balError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('year', currentYear);

      if (balError) throw balError;

      // Get unique user IDs
      const userIds = [...new Set(balances?.map(b => b.user_id) || [])];
      if (userIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, department_id')
        .in('id', userIds);

      // Fetch departments
      const { data: departments } = await supabase
        .from('departments')
        .select('id, name');

      const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Group balances by user
      const grouped = new Map<string, EmployeeLeaveBalance>();

      for (const bal of balances || []) {
        if (!grouped.has(bal.user_id)) {
          const profile = profileMap.get(bal.user_id);
          grouped.set(bal.user_id, {
            user_id: bal.user_id,
            full_name: profile?.full_name || null,
            email: profile?.email || 'Unknown',
            department_name: profile?.department_id ? deptMap.get(profile.department_id) || null : null,
            balances: [],
          });
        }

        grouped.get(bal.user_id)!.balances.push({
          leave_type: bal.leave_type as LeaveType,
          total_days: Number(bal.total_days),
          used_days: Number(bal.used_days),
          remaining: Number(bal.total_days) - Number(bal.used_days),
        });
      }

      return Array.from(grouped.values()).sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      );
    },
  });

  // Initialize balances for all employees
  const initializeBalances = async () => {
    const { error } = await supabase.rpc('initialize_default_leave_balances' as any);
    if (error) throw error;
    refetch();
  };

  return { employeeBalances, isLoading, refetch, initializeBalances };
}
