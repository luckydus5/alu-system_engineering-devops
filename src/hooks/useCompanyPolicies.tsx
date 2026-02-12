import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CompanyPolicy {
  id: string;
  company_id: string | null;
  policy_category: string;
  policy_key: string;
  policy_value: string;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCompanyPolicies(companyId?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policies = [], isLoading, refetch } = useQuery({
    queryKey: ['company-policies', companyId ?? 'global'],
    queryFn: async () => {
      // Fetch global defaults + company-specific overrides
      let query = supabase
        .from('company_policies')
        .select('*')
        .order('policy_category')
        .order('policy_key');

      if (companyId) {
        query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // If company-specific, merge: company overrides global
      if (companyId && data) {
        const merged = new Map<string, CompanyPolicy>();
        // First add globals
        data.filter(p => !p.company_id).forEach(p => {
          merged.set(`${p.policy_category}:${p.policy_key}`, p as CompanyPolicy);
        });
        // Then override with company-specific
        data.filter(p => p.company_id === companyId).forEach(p => {
          merged.set(`${p.policy_category}:${p.policy_key}`, p as CompanyPolicy);
        });
        return Array.from(merged.values());
      }

      return (data || []) as CompanyPolicy[];
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ 
      policyCategory, 
      policyKey, 
      policyValue, 
      targetCompanyId 
    }: { 
      policyCategory: string; 
      policyKey: string; 
      policyValue: string; 
      targetCompanyId?: string | null;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('company_policies')
        .upsert({
          company_id: targetCompanyId || null,
          policy_category: policyCategory,
          policy_key: policyKey,
          policy_value: policyValue,
          updated_by: user.user?.id || null,
        }, {
          onConflict: targetCompanyId 
            ? 'company_id,policy_category,policy_key' 
            : undefined,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-policies'] });
      toast({ title: 'Policy updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update policy', description: error.message, variant: 'destructive' });
    },
  });

  const bulkUpdatePolicies = useMutation({
    mutationFn: async (updates: { policy_category: string; policy_key: string; policy_value: string; company_id?: string | null }[]) => {
      const { data: user } = await supabase.auth.getUser();
      const userId = user.user?.id || null;

      for (const u of updates) {
        const cid = u.company_id || null;

        // Check if the policy already exists
        let query = supabase
          .from('company_policies')
          .select('id')
          .eq('policy_category', u.policy_category)
          .eq('policy_key', u.policy_key);

        if (cid) {
          query = query.eq('company_id', cid);
        } else {
          query = query.is('company_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('company_policies')
            .update({ policy_value: u.policy_value, updated_by: userId })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('company_policies')
            .insert({
              company_id: cid,
              policy_category: u.policy_category,
              policy_key: u.policy_key,
              policy_value: u.policy_value,
              updated_by: userId,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      // Sync leave balances with updated policies
      supabase.rpc('initialize_default_leave_balances').then(() => {
        queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      });
      queryClient.invalidateQueries({ queryKey: ['company-policies'] });
      toast({ title: 'All policies saved successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to save policies', description: error.message, variant: 'destructive' });
    },
  });

  // Helper to get a specific policy value
  const getPolicyValue = (category: string, key: string, defaultValue?: string): string => {
    const policy = policies.find(p => p.policy_category === category && p.policy_key === key);
    return policy?.policy_value ?? defaultValue ?? '';
  };

  // Get all policies for a category
  const getCategoryPolicies = (category: string): CompanyPolicy[] => {
    return policies.filter(p => p.policy_category === category);
  };

  return {
    policies,
    isLoading,
    refetch,
    updatePolicy,
    bulkUpdatePolicies,
    getPolicyValue,
    getCategoryPolicies,
  };
}
