import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'remote';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  department_id: string;
  attendance_date: string;
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
  department?: {
    name: string;
  };
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  on_leave: 'On Leave',
  remote: 'Remote',
};

export const ATTENDANCE_STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: 'bg-emerald-500/20 text-emerald-600',
  absent: 'bg-red-500/20 text-red-600',
  late: 'bg-amber-500/20 text-amber-600',
  half_day: 'bg-orange-500/20 text-orange-600',
  on_leave: 'bg-blue-500/20 text-blue-600',
  remote: 'bg-purple-500/20 text-purple-600',
};

export function useAttendance(departmentId?: string, date?: Date) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance', departmentId, dateStr || 'all'],
    queryFn: async () => {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          department:departments(name)
        `)
        .order('attendance_date', { ascending: false });

      if (dateStr) {
        query = query.eq('attendance_date', dateStr);
      }

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      
      // Fetch user profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(r => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        return data.map(record => ({
          ...record,
          user: profileMap.get(record.user_id) || null,
        })) as unknown as AttendanceRecord[];
      }
      
      return data as unknown as AttendanceRecord[];
    },
    enabled: true,
  });

  const clockIn = useMutation({
    mutationFn: async (departmentId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert({
          user_id: userData.user.id,
          department_id: departmentId,
          attendance_date: format(new Date(), 'yyyy-MM-dd'),
          clock_in: new Date().toISOString(),
          status: 'present' as AttendanceStatus,
        }, {
          onConflict: 'user_id,attendance_date',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Clocked in successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to clock in', description: error.message, variant: 'destructive' });
    },
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('attendance_records')
        .update({ clock_out: new Date().toISOString() })
        .eq('user_id', userData.user.id)
        .eq('attendance_date', format(new Date(), 'yyyy-MM-dd'))
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Clocked out successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to clock out', description: error.message, variant: 'destructive' });
    },
  });

  const updateAttendance = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttendanceRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from('attendance_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: 'Attendance updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update attendance', description: error.message, variant: 'destructive' });
    },
  });

  const bulkImportAttendance = useMutation({
    mutationFn: async (importRecords: {
      user_id: string;
      department_id: string;
      attendance_date: string;
      clock_in: string | null;
      clock_out: string | null;
      status: AttendanceStatus;
      notes?: string;
    }[]) => {
      // Upsert in batches of 50
      const batchSize = 50;
      let totalInserted = 0;
      for (let i = 0; i < importRecords.length; i += batchSize) {
        const batch = importRecords.slice(i, i + batchSize);
        const { error } = await supabase
          .from('attendance_records')
          .upsert(batch as any, { onConflict: 'user_id,attendance_date' });
        if (error) throw error;
        totalInserted += batch.length;
      }
      return { totalInserted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({ title: `${data.totalInserted} attendance records imported successfully` });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to import attendance', description: error.message, variant: 'destructive' });
    },
  });

  return {
    records,
    isLoading,
    refetch,
    clockIn,
    clockOut,
    updateAttendance,
    bulkImportAttendance,
  };
}
export function useMyAttendance() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: todayRecord, isLoading } = useQuery({
    queryKey: ['my-attendance', today],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('attendance_date', today)
        .maybeSingle();

      if (error) throw error;
      return data as AttendanceRecord | null;
    },
    enabled: true,
  });

  return { todayRecord, isLoading };
}
