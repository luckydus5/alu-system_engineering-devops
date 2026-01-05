import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

interface ReportStats {
  total: number;
  resolved: number;
  submitted: number;
  inReview: number;
  closed: number;
  draft: number;
}

interface DepartmentStats {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  total: number;
  resolved: number;
  pending: number;
  completion: number;
}

export function useReportStats() {
  const { user } = useAuth();
  const { roles } = useUserRole();
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    resolved: 0,
    submitted: 0,
    inReview: 0,
    closed: 0,
    draft: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch reports that the user can see (based on RLS)
        const { data: reports, error } = await supabase
          .from('reports')
          .select('id, status, department_id, departments(name, code)');

        if (error) throw error;

        // Calculate overall stats
        const reportStats: ReportStats = {
          total: reports?.length || 0,
          resolved: reports?.filter(r => r.status === 'resolved').length || 0,
          submitted: reports?.filter(r => r.status === 'submitted').length || 0,
          inReview: reports?.filter(r => r.status === 'in_review').length || 0,
          closed: reports?.filter(r => r.status === 'closed').length || 0,
          draft: reports?.filter(r => r.status === 'draft').length || 0,
        };
        setStats(reportStats);

        // Calculate department stats
        const deptMap = new Map<string, DepartmentStats>();
        reports?.forEach(report => {
          const deptId = report.department_id;
          const dept = report.departments as { name: string; code: string } | null;
          
          if (!deptMap.has(deptId)) {
            deptMap.set(deptId, {
              departmentId: deptId,
              departmentName: dept?.name || 'Unknown',
              departmentCode: dept?.code || 'UNK',
              total: 0,
              resolved: 0,
              pending: 0,
              completion: 0,
            });
          }
          
          const deptStats = deptMap.get(deptId)!;
          deptStats.total += 1;
          if (report.status === 'resolved') deptStats.resolved += 1;
          if (report.status === 'submitted' || report.status === 'in_review') deptStats.pending += 1;
        });

        // Calculate completion percentage
        deptMap.forEach(dept => {
          dept.completion = dept.total > 0 
            ? Math.round((dept.resolved / dept.total) * 100) 
            : 0;
        });

        setDepartmentStats(Array.from(deptMap.values()));
      } catch (error) {
        console.error('Error fetching report stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, roles]);

  return { stats, departmentStats, loading };
}
