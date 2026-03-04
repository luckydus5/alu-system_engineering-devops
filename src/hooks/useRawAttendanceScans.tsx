import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RawScan {
  id: string;
  file_upload_id: string | null;
  source_file: string;
  row_number: number;
  department_text: string | null;
  employee_name: string;
  fingerprint_number: string | null;
  scan_datetime: string;
  scan_status: string | null;
  scan_date: string;
  matched_employee_id: string | null;
  matched_employee_name: string | null;
  match_score: number | null;
  match_method: string | null;
  is_matched: boolean;
  was_imported: boolean;
  attendance_record_id: string | null;
  skip_reason: string | null;
  created_at: string;
}

export function useRawAttendanceScans(filters?: {
  fileUploadId?: string;
  sourceFile?: string;
  scanDate?: string;
  isMatched?: boolean;
  employeeName?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['raw-attendance-scans', filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from('attendance_raw_scans')
        .select('*')
        .order('scan_datetime', { ascending: true });

      if (filters?.fileUploadId) {
        query = query.eq('file_upload_id', filters.fileUploadId);
      }
      if (filters?.sourceFile) {
        query = query.eq('source_file', filters.sourceFile);
      }
      if (filters?.scanDate) {
        query = query.eq('scan_date', filters.scanDate);
      }
      if (filters?.isMatched !== undefined) {
        query = query.eq('is_matched', filters.isMatched);
      }
      if (filters?.employeeName) {
        query = query.ilike('employee_name', `%${filters.employeeName}%`);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(500);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as RawScan[];
    },
  });
}

export function useRawScansSummary() {
  return useQuery({
    queryKey: ['raw-scans-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('attendance_raw_scans')
        .select('source_file, is_matched, skip_reason, scan_date')
        .order('scan_date', { ascending: true });

      if (error) throw error;

      const scans = (data || []) as { source_file: string; is_matched: boolean; skip_reason: string | null; scan_date: string }[];
      
      const byFile = new Map<string, { total: number; matched: number; unmatched: number; wrongMonth: number; parseError: number; dates: Set<string> }>();
      
      for (const scan of scans) {
        if (!byFile.has(scan.source_file)) {
          byFile.set(scan.source_file, { total: 0, matched: 0, unmatched: 0, wrongMonth: 0, parseError: 0, dates: new Set() });
        }
        const f = byFile.get(scan.source_file)!;
        f.total++;
        f.dates.add(scan.scan_date);
        if (scan.is_matched) f.matched++;
        else if (scan.skip_reason === 'unmatched') f.unmatched++;
        else if (scan.skip_reason === 'wrong_month') f.wrongMonth++;
        else if (scan.skip_reason === 'parse_error') f.parseError++;
      }

      return Array.from(byFile.entries()).map(([file, stats]) => ({
        sourceFile: file,
        totalScans: stats.total,
        matched: stats.matched,
        unmatched: stats.unmatched,
        wrongMonth: stats.wrongMonth,
        parseError: stats.parseError,
        uniqueDates: stats.dates.size,
        dateRange: {
          from: [...stats.dates].sort()[0],
          to: [...stats.dates].sort().pop(),
        },
      }));
    },
  });
}
