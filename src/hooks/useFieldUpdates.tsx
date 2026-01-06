import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface FieldUpdate {
  id: string;
  department_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: 'active' | 'in_progress' | 'completed' | 'on_hold' | 'issue';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  location: string | null;
  photos: string[];
  tags: string[];
  metadata: Record<string, any>;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  comments_count?: number;
}

export interface FieldUpdateComment {
  id: string;
  field_update_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateFieldUpdateData {
  department_id: string;
  title: string;
  description?: string;
  status?: FieldUpdate['status'];
  priority?: FieldUpdate['priority'];
  location?: string;
  photos?: string[];
  tags?: string[];
  is_pinned?: boolean;
}

export function useFieldUpdates(departmentId?: string) {
  const [updates, setUpdates] = useState<FieldUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchUpdates = useCallback(async () => {
    if (!departmentId) {
      setUpdates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('field_updates')
        .select(`
          *,
          creator:profiles!field_updates_created_by_fkey(id, full_name, avatar_url)
        `)
        .eq('department_id', departmentId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get comment counts for each update
      const updatesWithCounts = await Promise.all(
        (data || []).map(async (update) => {
          const { count } = await supabase
            .from('field_update_comments')
            .select('*', { count: 'exact', head: true })
            .eq('field_update_id', update.id);

          return {
            ...update,
            photos: update.photos || [],
            tags: update.tags || [],
            metadata: update.metadata || {},
            comments_count: count || 0,
          } as FieldUpdate;
        })
      );

      setUpdates(updatesWithCounts);
    } catch (error: any) {
      console.error('Error fetching field updates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load field updates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [departmentId, toast]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  // Real-time subscription
  useEffect(() => {
    if (!departmentId) return;

    const channel = supabase
      .channel(`field_updates_${departmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'field_updates',
          filter: `department_id=eq.${departmentId}`,
        },
        () => {
          fetchUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [departmentId, fetchUpdates]);

  const createUpdate = async (data: CreateFieldUpdateData): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create updates',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase.from('field_updates').insert({
        ...data,
        created_by: user.id,
        photos: data.photos || [],
        tags: data.tags || [],
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Field update posted successfully',
      });

      await fetchUpdates();
      return true;
    } catch (error: any) {
      console.error('Error creating field update:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create update',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateFieldUpdate = async (
    id: string,
    data: Partial<CreateFieldUpdateData>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('field_updates')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Update modified successfully',
      });

      await fetchUpdates();
      return true;
    } catch (error: any) {
      console.error('Error updating field update:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteUpdate = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('field_updates').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Field update removed',
      });

      await fetchUpdates();
      return true;
    } catch (error: any) {
      console.error('Error deleting field update:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete',
        variant: 'destructive',
      });
      return false;
    }
  };

  const togglePin = async (id: string, isPinned: boolean): Promise<boolean> => {
    return updateFieldUpdate(id, { is_pinned: !isPinned });
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('field-updates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('field-updates')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload photo',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Stats
  const stats = {
    total: updates.length,
    active: updates.filter((u) => u.status === 'active').length,
    inProgress: updates.filter((u) => u.status === 'in_progress').length,
    completed: updates.filter((u) => u.status === 'completed').length,
    issues: updates.filter((u) => u.status === 'issue').length,
    urgent: updates.filter((u) => u.priority === 'urgent').length,
  };

  return {
    updates,
    loading,
    stats,
    createUpdate,
    updateFieldUpdate,
    deleteUpdate,
    togglePin,
    uploadPhoto,
    refetch: fetchUpdates,
  };
}

export function useFieldUpdateComments(updateId?: string) {
  const [comments, setComments] = useState<FieldUpdateComment[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchComments = useCallback(async () => {
    if (!updateId) {
      setComments([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('field_update_comments')
        .select(`
          *,
          user:profiles!field_update_comments_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq('field_update_id', updateId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [updateId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (content: string): Promise<boolean> => {
    if (!user || !updateId) return false;

    try {
      const { error } = await supabase.from('field_update_comments').insert({
        field_update_id: updateId,
        user_id: user.id,
        content,
      });

      if (error) throw error;
      await fetchComments();
      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('field_update_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await fetchComments();
      return true;
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete comment',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    comments,
    loading,
    addComment,
    deleteComment,
    refetch: fetchComments,
  };
}
