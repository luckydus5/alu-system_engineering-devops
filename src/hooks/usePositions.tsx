import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Position {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: {
    name: string;
  };
}

export function usePositions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading, refetch } = useQuery({
    queryKey: ['positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('positions')
        .select(`
          *,
          department:departments(name)
        `)
        .order('level', { ascending: true });

      if (error) throw error;
      return data as unknown as Position[];
    },
  });

  const createPosition = useMutation({
    mutationFn: async (position: {
      name: string;
      description?: string;
      department_id?: string | null;
      level?: number;
    }) => {
      const { data, error } = await supabase
        .from('positions')
        .insert(position)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast({ title: 'Position created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create position', description: error.message, variant: 'destructive' });
    },
  });

  const updatePosition = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Position> & { id: string }) => {
      const { data, error } = await supabase
        .from('positions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast({ title: 'Position updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update position', description: error.message, variant: 'destructive' });
    },
  });

  const deletePosition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      toast({ title: 'Position deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete position', description: error.message, variant: 'destructive' });
    },
  });

  const activePositions = positions.filter(p => p.is_active);

  return {
    positions,
    activePositions,
    isLoading,
    refetch,
    createPosition,
    updatePosition,
    deletePosition,
  };
}
