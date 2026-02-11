import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingChecklist {
  id: string;
  employee_id: string;
  task_label: string;
  category: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TASKS = [
  { label: 'Welcome Email Sent', category: 'admin', sort_order: 1 },
  { label: 'Company Account Created', category: 'admin', sort_order: 2 },
  { label: 'Equipment Prepared', category: 'it', sort_order: 3 },
  { label: 'System Access Granted', category: 'it', sort_order: 4 },
  { label: 'Workspace Setup', category: 'facilities', sort_order: 5 },
  { label: 'HR Orientation Scheduled', category: 'hr', sort_order: 6 },
  { label: 'Employee Handbook Shared', category: 'hr', sort_order: 7 },
  { label: 'Mentor Assigned', category: 'hr', sort_order: 8 },
  { label: 'Training Plan Created', category: 'training', sort_order: 9 },
  { label: 'Team Introduction Meeting', category: 'team', sort_order: 10 },
];

export function useOnboardingChecklists() {
  const [checklists, setChecklists] = useState<OnboardingChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('onboarding_checklists')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      setChecklists(data || []);
    } catch (err) {
      console.error('Error fetching onboarding checklists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const initializeForEmployee = async (employeeId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const tasks = DEFAULT_TASKS.map(t => ({
      employee_id: employeeId,
      task_label: t.label,
      category: t.category,
      sort_order: t.sort_order,
      is_completed: false,
    }));
    const { error } = await supabase.from('onboarding_checklists').insert(tasks);
    if (error) throw error;
    await fetchChecklists();
  };

  const toggleTask = async (taskId: string, isCompleted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('onboarding_checklists')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by: isCompleted ? user?.id || null : null,
      })
      .eq('id', taskId);
    if (error) throw error;
    await fetchChecklists();
  };

  const getForEmployee = (employeeId: string) => {
    return checklists.filter(c => c.employee_id === employeeId);
  };

  return { checklists, loading, refetch: fetchChecklists, initializeForEmployee, toggleTask, getForEmployee };
}
