import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FleetStatus = 'operational' | 'under_maintenance' | 'out_of_service';

export interface FleetIssue {
  id: string;
  issue_description: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface Fleet {
  id: string;
  fleet_number: string;
  machine_type: string;
  status: FleetStatus;
  operator_id: string | null;
  department_id: string;
  delivery_date: string | null;
  machine_hours: number;
  current_status: string | null;
  condition: string | null;
  remarks: string | null;
  checked_by_name: string | null;
  last_inspection_date: string | null;
  created_at: string;
  updated_at: string;
  operator?: {
    full_name: string | null;
    email: string;
  } | null;
  issues?: FleetIssue[];
  last_maintenance?: {
    maintenance_date: string;
    next_service_due: string | null;
    remarks: string | null;
  } | null;
}

export function useFleets(departmentId?: string) {
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFleets = useCallback(async () => {
    if (!departmentId) {
      setFleets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: fleetsData, error: fleetsError } = await supabase
        .from('fleets')
        .select('*')
        .eq('department_id', departmentId)
        .order('fleet_number');

      if (fleetsError) throw fleetsError;

      // Fetch operator details, issues, and last maintenance for each fleet
      const enrichedFleets = await Promise.all(
        (fleetsData || []).map(async (fleet) => {
          let operator = null;
          if (fleet.operator_id) {
            const { data: operatorData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', fleet.operator_id)
              .single();
            operator = operatorData;
          }

          // Get fleet issues
          const { data: issuesData } = await supabase
            .from('fleet_issues')
            .select('*')
            .eq('fleet_id', fleet.id)
            .eq('is_resolved', false)
            .order('created_at', { ascending: true });

          // Get last maintenance record
          const { data: maintenanceData } = await supabase
            .from('maintenance_records')
            .select('maintenance_date, next_service_due, remarks')
            .eq('fleet_id', fleet.id)
            .order('maintenance_date', { ascending: false })
            .limit(1)
            .single();

          return {
            ...fleet,
            status: fleet.status as FleetStatus,
            operator,
            issues: issuesData || [],
            last_maintenance: maintenanceData
          };
        })
      );

      setFleets(enrichedFleets);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchFleets();
  }, [fetchFleets]);

  const createFleet = async (data: {
    fleet_number: string;
    machine_type: string;
    status?: FleetStatus;
    operator_id?: string;
    delivery_date?: string;
    machine_hours?: number;
    current_status?: string;
    condition?: string;
    remarks?: string;
    checked_by_name?: string;
    last_inspection_date?: string;
  }) => {
    if (!departmentId) throw new Error('Department ID required');

    const { data: newFleet, error } = await supabase
      .from('fleets')
      .insert({
        ...data,
        department_id: departmentId
      })
      .select()
      .single();

    if (error) throw error;
    await fetchFleets();
    return newFleet;
  };

  const updateFleet = async (id: string, data: Partial<Fleet>) => {
    const { error } = await supabase
      .from('fleets')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    await fetchFleets();
  };

  const addFleetIssue = async (fleetId: string, issueDescription: string) => {
    const { error } = await supabase
      .from('fleet_issues')
      .insert({
        fleet_id: fleetId,
        issue_description: issueDescription
      });

    if (error) throw error;
    await fetchFleets();
  };

  const resolveFleetIssue = async (issueId: string) => {
    const { error } = await supabase
      .from('fleet_issues')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString()
      })
      .eq('id', issueId);

    if (error) throw error;
    await fetchFleets();
  };

  // Calculate stats
  const stats = {
    operational: fleets.filter(f => f.status === 'operational' || f.condition === 'operational' || f.condition === 'good_condition').length,
    underMaintenance: fleets.filter(f => f.status === 'under_maintenance' || f.condition === 'under_repair').length,
    outOfService: fleets.filter(f => f.status === 'out_of_service' || f.condition === 'grounded' || f.condition === 'decommissioned').length,
    waitingParts: fleets.filter(f => f.condition === 'waiting_parts').length,
    total: fleets.length,
    withIssues: fleets.filter(f => (f.issues?.length || 0) > 0).length
  };

  return { 
    fleets, 
    loading, 
    error, 
    stats, 
    refetch: fetchFleets, 
    createFleet, 
    updateFleet,
    addFleetIssue,
    resolveFleetIssue
  };
}
