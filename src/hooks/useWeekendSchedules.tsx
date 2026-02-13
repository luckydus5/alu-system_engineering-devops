import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { startOfWeek, format } from 'date-fns';

export interface WeekendSchedule {
  id: string;
  employee_id: string;
  week_start_date: string;
  is_off_duty: boolean;
  assigned_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useWeekendSchedules(weekDate: Date) {
  const queryClient = useQueryClient();
  const weekStart = format(startOfWeek(weekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['weekend-schedules', weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekend_schedules')
        .select('*')
        .eq('week_start_date', weekStart);
      if (error) throw error;
      return data as WeekendSchedule[];
    },
  });

  const upsertSchedule = useMutation({
    mutationFn: async ({ employeeId, isOffDuty, assignedBy }: { employeeId: string; isOffDuty: boolean; assignedBy: string }) => {
      const { error } = await supabase
        .from('weekend_schedules')
        .upsert(
          {
            employee_id: employeeId,
            week_start_date: weekStart,
            is_off_duty: isOffDuty,
            assigned_by: assignedBy,
          },
          { onConflict: 'employee_id,week_start_date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekend-schedules', weekStart] });
    },
    onError: (error: any) => {
      toast.error('Failed to update schedule: ' + error.message);
    },
  });

  const bulkUpsert = useMutation({
    mutationFn: async ({ employeeIds, isOffDuty, assignedBy }: { employeeIds: string[]; isOffDuty: boolean; assignedBy: string }) => {
      const records = employeeIds.map(employeeId => ({
        employee_id: employeeId,
        week_start_date: weekStart,
        is_off_duty: isOffDuty,
        assigned_by: assignedBy,
      }));
      const { error } = await supabase
        .from('weekend_schedules')
        .upsert(records, { onConflict: 'employee_id,week_start_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekend-schedules', weekStart] });
      toast.success('Weekend schedule updated');
    },
    onError: (error: any) => {
      toast.error('Failed to update schedules: ' + error.message);
    },
  });

  const isEmployeeOffDuty = useCallback((employeeId: string) => {
    const schedule = schedules.find(s => s.employee_id === employeeId);
    return schedule?.is_off_duty ?? false;
  }, [schedules]);

  return {
    schedules,
    isLoading,
    upsertSchedule,
    bulkUpsert,
    isEmployeeOffDuty,
    weekStart,
  };
}
