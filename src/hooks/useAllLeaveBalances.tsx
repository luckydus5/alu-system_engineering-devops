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

      // Fetch employees from Employee Hub (source of truth) matching by linked_user_id
      const { data: employees } = await supabase
        .from('employees')
        .select('id, full_name, email, linked_user_id, department_id, departments(name)')
        .in('linked_user_id', userIds);

      // Build lookup by linked_user_id
      const employeeMap = new Map(
        (employees || []).map(e => [e.linked_user_id!, { 
          full_name: e.full_name, 
          email: e.email, 
          department_id: e.department_id,
          department_name: (e.departments as any)?.name || null 
        }])
      );

      // Fallback: fetch profiles for users not found in employees table
      const unmatchedIds = userIds.filter(id => !employeeMap.has(id));
      if (unmatchedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, department_id')
          .in('id', unmatchedIds);
        
        const { data: departments } = await supabase
          .from('departments')
          .select('id, name');
        const deptMap = new Map(departments?.map(d => [d.id, d.name]) || []);
        
        (profiles || []).forEach(p => {
          employeeMap.set(p.id, {
            full_name: p.full_name,
            email: p.email,
            department_id: p.department_id,
            department_name: p.department_id ? deptMap.get(p.department_id) || null : null,
          });
        });
      }

      // Group balances by user
      const grouped = new Map<string, EmployeeLeaveBalance>();

      for (const bal of balances || []) {
        if (!grouped.has(bal.user_id)) {
          const empInfo = employeeMap.get(bal.user_id);
          grouped.set(bal.user_id, {
            user_id: bal.user_id,
            full_name: empInfo?.full_name || null,
            email: empInfo?.email || 'Unknown',
            department_name: empInfo?.department_name || null,
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
