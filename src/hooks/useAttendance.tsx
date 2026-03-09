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

export function useAttendance(departmentId?: string, date?: Date, dateRange?: { from: string; to: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;
  const rangeKey = dateRange ? `${dateRange.from}..${dateRange.to}` : undefined;

  const { data: records = [], isLoading, refetch } = useQuery({
    queryKey: ['attendance', departmentId, dateStr || rangeKey || 'all'],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let from = 0;

      // Build first page query
      const buildQuery = (rangeFrom: number) => {
        let query = supabase
          .from('attendance_records')
          .select('id,user_id,department_id,attendance_date,clock_in,clock_out,status,notes,shift_type,total_hours,regular_hours,overtime_hours,created_at,updated_at,department:departments(name)')
          .order('attendance_date', { ascending: false })
          .range(rangeFrom, rangeFrom + PAGE_SIZE - 1);

        if (dateStr) {
          query = query.eq('attendance_date', dateStr);
        } else if (dateRange) {
          query = query.gte('attendance_date', dateRange.from).lte('attendance_date', dateRange.to);
        }
        if (departmentId) {
          query = query.eq('department_id', departmentId);
        }
        return query;
      };

      // Fetch first page
      const { data: firstPage, error: firstErr } = await buildQuery(0);
      if (firstErr) throw firstErr;
      if (!firstPage || firstPage.length === 0) return [] as AttendanceRecord[];

      allData = firstPage;

      // If first page is full, fetch remaining pages in parallel
      if (firstPage.length === PAGE_SIZE) {
        // Estimate: fetch next 5 pages in parallel (covers up to 6000 records)
        const parallelPages = Array.from({ length: 5 }, (_, i) => buildQuery((i + 1) * PAGE_SIZE));
        const results = await Promise.all(parallelPages);
        for (const res of results) {
          if (res.error) throw res.error;
          if (res.data && res.data.length > 0) allData = allData.concat(res.data);
          if (!res.data || res.data.length < PAGE_SIZE) break;
        }
      }

      // Fetch user profiles in parallel batches
      if (allData.length > 0) {
        const userIds = [...new Set(allData.map(r => r.user_id))];
        const profileBatches = [];
        for (let i = 0; i < userIds.length; i += 200) {
          profileBatches.push(
            supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', userIds.slice(i, i + 200))
          );
        }
        const profileResults = await Promise.all(profileBatches);
        const allProfiles: any[] = [];
        for (const res of profileResults) {
          if (res.data) allProfiles.push(...res.data);
        }
        const profileMap = new Map(allProfiles.map(p => [p.id, p]));

        return allData.map(record => ({
          ...record,
          user: profileMap.get(record.user_id) || null,
        })) as unknown as AttendanceRecord[];
      }

      return allData as unknown as AttendanceRecord[];
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes to avoid re-fetching on tab switches
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
      shift_type?: string;
      total_hours?: number;
      regular_hours?: number;
      overtime_hours?: number;
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
