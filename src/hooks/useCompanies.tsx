import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Company {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // derived
  parent_name?: string;
  children?: Company[];
}

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (fetchError) throw fetchError;

      // Build hierarchy
      const all = (data || []) as Company[];
      const parentMap = new Map<string, string>();
      all.forEach(c => {
        if (c.parent_id) {
          const parent = all.find(p => p.id === c.parent_id);
          if (parent) parentMap.set(c.id, parent.name);
        }
      });

      const mapped = all.map(c => ({
        ...c,
        parent_name: c.parent_id ? parentMap.get(c.id) || null : null,
        children: all.filter(child => child.parent_id === c.id),
      }));

      setCompanies(mapped);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch companies'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Get parent companies (no parent_id)
  const parentCompanies = companies.filter(c => !c.parent_id);
  // Get subsidiaries
  const subsidiaries = companies.filter(c => !!c.parent_id);

  const addCompany = async (company: { name: string; code: string; parent_id?: string | null; description?: string; logo_url?: string }) => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert(company)
        .select()
        .single();
      if (error) throw error;
      await fetchCompanies();
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err instanceof Error ? err : new Error('Failed to add company') };
    }
  };

  return {
    companies,
    parentCompanies,
    subsidiaries,
    loading,
    error,
    refetch: fetchCompanies,
    addCompany,
  };
}
