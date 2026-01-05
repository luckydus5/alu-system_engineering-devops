import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useFleetAudit() {
  const { user } = useAuth();

  // Log changes directly to console for now (audit table doesn't exist)
  const logChange = async (entry: {
    fleet_id: string;
    action: string;
    field_name?: string;
    old_value?: string;
    new_value?: string;
  }) => {
    if (!user?.id) return;
    
    console.log('[Fleet Audit]', {
      ...entry,
      user_id: user.id,
      timestamp: new Date().toISOString()
    });
  };

  const updateFleetWithAudit = async (
    fleetId: string,
    field: string,
    oldValue: string | number | null,
    newValue: string | number
  ) => {
    const { error } = await supabase
      .from('fleets')
      .update({ [field]: newValue })
      .eq('id', fleetId);

    if (error) throw error;

    await logChange({
      fleet_id: fleetId,
      action: 'update',
      field_name: field,
      old_value: String(oldValue ?? ''),
      new_value: String(newValue)
    });
  };

  const resolveIssueWithAudit = async (issueId: string, fleetId: string, issueDescription: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('fleet_issues')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', issueId);

    if (error) throw error;

    await logChange({
      fleet_id: fleetId,
      action: 'resolve_issue',
      field_name: 'issue',
      old_value: issueDescription,
      new_value: 'resolved'
    });
  };

  return { logChange, updateFleetWithAudit, resolveIssueWithAudit };
}
