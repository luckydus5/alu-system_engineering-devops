import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('*')
          .order('name');

        if (error) throw error;
        setDepartments(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  return { departments, loading, error };
}
