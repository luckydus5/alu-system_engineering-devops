import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanyLeaveWorkflow {
  id: string;
  company_id: string;
  hr_review_enabled: boolean;
  manager_review_enabled: boolean;
  final_approver_role: 'gm' | 'om' | 'either';
  created_at: string;
  updated_at: string;
}

export function useCompanyLeaveWorkflows() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['company-leave-workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_leave_workflows')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as unknown as CompanyLeaveWorkflow[];
    },
  });

  const upsertWorkflow = useMutation({
    mutationFn: async (params: {
      company_id: string;
      hr_review_enabled: boolean;
      manager_review_enabled: boolean;
      final_approver_role: 'gm' | 'om' | 'either';
    }) => {
      const { data, error } = await supabase
        .from('company_leave_workflows')
        .upsert({
          company_id: params.company_id,
          hr_review_enabled: params.hr_review_enabled,
          manager_review_enabled: params.manager_review_enabled,
          final_approver_role: params.final_approver_role,
        } as any, { onConflict: 'company_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-leave-workflows'] });
      toast({ title: 'Workflow updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update workflow', description: error.message, variant: 'destructive' });
    },
  });

  const getWorkflowForCompany = (companyId: string | null): CompanyLeaveWorkflow | null => {
    if (!companyId) return null;
    return workflows.find(w => w.company_id === companyId) || null;
  };

  // Get the effective workflow steps for a company
  const getWorkflowSteps = (companyId: string | null): string[] => {
    const workflow = getWorkflowForCompany(companyId);
    const steps: string[] = ['submit'];

    // Default: HR → Manager → GM/OM
    if (!workflow) {
      steps.push('hr_review', 'manager_review', 'final_approval');
      return steps;
    }

    if (workflow.hr_review_enabled) steps.push('hr_review');
    if (workflow.manager_review_enabled) steps.push('manager_review');
    steps.push('final_approval');

    return steps;
  };

  return {
    workflows,
    isLoading,
    upsertWorkflow,
    getWorkflowForCompany,
    getWorkflowSteps,
  };
}
