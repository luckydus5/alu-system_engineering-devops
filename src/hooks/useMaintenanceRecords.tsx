import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ServiceType = 'preventive' | 'corrective' | 'breakdown';
export type ConditionType = 'good' | 'fair' | 'poor';

export interface MaintenanceRecord {
  id: string;
  fleet_id: string;
  operator_id: string | null;
  service_type: ServiceType;
  service_description: string;
  maintenance_date: string;
  delivery_time_hours: number | null;
  machine_hours: number | null;
  condition_after_service: ConditionType | null;
  current_status: string | null;
  remarks: string | null;
  checked_by: string | null;
  next_service_due: string | null;
  department_id: string;
  created_at: string;
  updated_at: string;
  fleet?: {
    fleet_number: string;
    machine_type: string;
  } | null;
  operator?: {
    full_name: string | null;
    email: string;
  } | null;
}

export function useMaintenanceRecords(departmentId?: string) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!departmentId) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('department_id', departmentId)
        .order('maintenance_date', { ascending: false });

      if (fetchError) throw fetchError;

      // Enrich with fleet and operator data
      const enrichedRecords = await Promise.all(
        (data || []).map(async (record) => {
          const { data: fleetData } = await supabase
            .from('fleets')
            .select('fleet_number, machine_type')
            .eq('id', record.fleet_id)
            .single();

          let operator = null;
          if (record.operator_id) {
            const { data: operatorData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', record.operator_id)
              .single();
            operator = operatorData;
          }

          return {
            ...record,
            service_type: record.service_type as ServiceType,
            condition_after_service: record.condition_after_service as ConditionType | null,
            fleet: fleetData,
            operator
          };
        })
      );

      setRecords(enrichedRecords);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const createRecord = async (data: {
    fleet_id: string;
    operator_id?: string;
    service_type: ServiceType;
    service_description: string;
    maintenance_date: string;
    delivery_time_hours?: number;
    machine_hours?: number;
    condition_after_service?: ConditionType;
    current_status?: string;
    remarks?: string;
    checked_by?: string;
    next_service_due?: string;
    issues?: string[];
  }) => {
    if (!departmentId) throw new Error('Department ID required');

    const { issues, ...recordData } = data;

    const { data: newRecord, error } = await supabase
      .from('maintenance_records')
      .insert({
        ...recordData,
        department_id: departmentId
      })
      .select()
      .single();

    if (error) throw error;

    // Insert issues if provided
    if (issues && issues.length > 0) {
      const issueInserts = issues.map(issue => ({
        fleet_id: data.fleet_id,
        issue_description: issue
      }));

      const { error: issuesError } = await supabase
        .from('fleet_issues')
        .insert(issueInserts);

      if (issuesError) {
        console.error('Failed to insert issues:', issuesError);
      }
    }

    await fetchRecords();
    return newRecord;
  };

  // Get current month's service count
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const servicesThisMonth = records.filter(r => r.maintenance_date >= startOfMonth.split('T')[0]).length;

  // Get current maintenance (in progress)
  const currentMaintenance = records.filter(r => 
    r.current_status?.toLowerCase().includes('progress') || 
    r.current_status?.toLowerCase().includes('repair')
  ).slice(0, 5);

  // Get upcoming services
  const today = new Date().toISOString().split('T')[0];
  const upcomingServices = records
    .filter(r => r.next_service_due && r.next_service_due >= today)
    .sort((a, b) => (a.next_service_due || '').localeCompare(b.next_service_due || ''))
    .slice(0, 5);

  // Recent activity (last 5)
  const recentActivity = records.slice(0, 5);

  return { 
    records, 
    loading, 
    error, 
    refetch: fetchRecords, 
    createRecord,
    servicesThisMonth,
    currentMaintenance,
    upcomingServices,
    recentActivity
  };
}
