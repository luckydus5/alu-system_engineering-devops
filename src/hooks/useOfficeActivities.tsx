import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type ActivityType = 'meeting' | 'task' | 'announcement' | 'update' | 'milestone' | 'event';

export interface OfficeActivity {
  id: string;
  department_id: string;
  created_by: string;
  title: string;
  description: string | null;
  activity_type: ActivityType;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  scheduled_at: string | null;
  completed_at: string | null;
  attendees: string[];
  attachments: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  creator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateActivityData {
  department_id: string;
  title: string;
  description?: string;
  activity_type: ActivityType;
  status?: OfficeActivity['status'];
  priority?: OfficeActivity['priority'];
  scheduled_at?: string;
  attendees?: string[];
  attachments?: string[];
  is_pinned?: boolean;
}

export function useOfficeActivities(departmentId?: string) {
  const [activities, setActivities] = useState<OfficeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    if (!departmentId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Using field_updates table but filtering for office-type updates
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

      // Transform to office activities format
      const transformed: OfficeActivity[] = (data || []).map((item) => ({
        id: item.id,
        department_id: item.department_id,
        created_by: item.created_by,
        title: item.title,
        description: item.description,
        activity_type: (item.metadata as any)?.activity_type || 'update',
        status: item.status as OfficeActivity['status'],
        priority: item.priority as OfficeActivity['priority'],
        scheduled_at: (item.metadata as any)?.scheduled_at || null,
        completed_at: item.status === 'completed' ? item.updated_at : null,
        attendees: (item.metadata as any)?.attendees || [],
        attachments: item.photos || [],
        is_pinned: item.is_pinned,
        created_at: item.created_at,
        updated_at: item.updated_at,
        creator: item.creator,
      }));

      setActivities(transformed);
    } catch (error: any) {
      console.error('Error fetching office activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [departmentId, toast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Real-time subscription
  useEffect(() => {
    if (!departmentId) return;

    const channel = supabase
      .channel(`office_activities_${departmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'field_updates',
          filter: `department_id=eq.${departmentId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [departmentId, fetchActivities]);

  const createActivity = async (data: CreateActivityData): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase.from('field_updates').insert({
        department_id: data.department_id,
        created_by: user.id,
        title: data.title,
        description: data.description,
        status: data.status || 'scheduled',
        priority: data.priority || 'normal',
        photos: data.attachments || [],
        tags: [],
        is_pinned: data.is_pinned || false,
        metadata: {
          activity_type: data.activity_type,
          scheduled_at: data.scheduled_at,
          attendees: data.attendees || [],
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity created successfully',
      });

      await fetchActivities();
      return true;
    } catch (error: any) {
      console.error('Error creating activity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create activity',
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateActivity = async (
    id: string,
    data: Partial<CreateActivityData>
  ): Promise<boolean> => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.status) updateData.status = data.status;
      if (data.priority) updateData.priority = data.priority;
      if (data.attachments) updateData.photos = data.attachments;
      if (data.is_pinned !== undefined) updateData.is_pinned = data.is_pinned;

      // Handle metadata updates
      if (data.activity_type || data.scheduled_at || data.attendees) {
        const { data: existing } = await supabase
          .from('field_updates')
          .select('metadata')
          .eq('id', id)
          .single();

        updateData.metadata = {
          ...(existing?.metadata as object || {}),
          ...(data.activity_type && { activity_type: data.activity_type }),
          ...(data.scheduled_at && { scheduled_at: data.scheduled_at }),
          ...(data.attendees && { attendees: data.attendees }),
        };
      }

      const { error } = await supabase
        .from('field_updates')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity updated',
      });

      await fetchActivities();
      return true;
    } catch (error: any) {
      console.error('Error updating activity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('field_updates').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Activity removed',
      });

      await fetchActivities();
      return true;
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete',
        variant: 'destructive',
      });
      return false;
    }
  };

  const togglePin = async (id: string, isPinned: boolean): Promise<boolean> => {
    return updateActivity(id, { is_pinned: !isPinned });
  };

  // Stats
  const stats = {
    total: activities.length,
    scheduled: activities.filter((a) => a.status === 'scheduled').length,
    inProgress: activities.filter((a) => a.status === 'in_progress').length,
    completed: activities.filter((a) => a.status === 'completed').length,
    meetings: activities.filter((a) => a.activity_type === 'meeting').length,
    tasks: activities.filter((a) => a.activity_type === 'task').length,
  };

  // Get today's activities
  const todayActivities = activities.filter((a) => {
    if (!a.scheduled_at) return false;
    const today = new Date().toDateString();
    return new Date(a.scheduled_at).toDateString() === today;
  });

  // Get upcoming activities (next 7 days)
  const upcomingActivities = activities.filter((a) => {
    if (!a.scheduled_at || a.status === 'completed') return false;
    const scheduled = new Date(a.scheduled_at);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return scheduled > now && scheduled <= weekFromNow;
  });

  return {
    activities,
    loading,
    stats,
    todayActivities,
    upcomingActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    togglePin,
    refetch: fetchActivities,
  };
}
