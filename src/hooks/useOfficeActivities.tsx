import { useState, useCallback, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isToday, isFuture, parseISO } from 'date-fns';

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
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchActivities = useCallback(async () => {
    if (!departmentId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('office_activities')
        .select('*')
        .eq('department_id', departmentId)
        .order('is_pinned', { ascending: false })
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator info for each activity
      const activitiesWithCreators = await Promise.all(
        (data || []).map(async (activity) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', activity.created_by)
            .single();

          return {
            ...activity,
            activity_type: activity.activity_type as ActivityType,
            status: activity.status as OfficeActivity['status'],
            priority: activity.priority as OfficeActivity['priority'],
            attendees: activity.attendees || [],
            attachments: activity.attachments || [],
            creator: profile || undefined,
          } as OfficeActivity;
        })
      );

      setActivities(activitiesWithCreators);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error fetching activities',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [departmentId, toast]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const createActivity = async (data: CreateActivityData): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to create activities',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('office_activities')
        .insert({
          department_id: data.department_id,
          created_by: user.id,
          title: data.title,
          description: data.description || null,
          activity_type: data.activity_type,
          status: data.status || 'scheduled',
          priority: data.priority || 'normal',
          scheduled_at: data.scheduled_at || null,
          attendees: data.attendees || [],
          attachments: data.attachments || [],
          is_pinned: data.is_pinned || false,
        });

      if (error) throw error;

      toast({
        title: 'Activity created',
        description: 'Your activity has been created successfully',
      });

      await fetchActivities();
      return true;
    } catch (error: any) {
      console.error('Error creating activity:', error);
      toast({
        title: 'Error creating activity',
        description: error.message,
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
      const updateData: Record<string, any> = {};
      
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.activity_type !== undefined) updateData.activity_type = data.activity_type;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.scheduled_at !== undefined) updateData.scheduled_at = data.scheduled_at;
      if (data.attendees !== undefined) updateData.attendees = data.attendees;
      if (data.attachments !== undefined) updateData.attachments = data.attachments;
      if (data.is_pinned !== undefined) updateData.is_pinned = data.is_pinned;

      // Set completed_at when status changes to completed
      if (data.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('office_activities')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Activity updated',
        description: 'Your activity has been updated successfully',
      });

      await fetchActivities();
      return true;
    } catch (error: any) {
      console.error('Error updating activity:', error);
      toast({
        title: 'Error updating activity',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('office_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Activity deleted',
        description: 'The activity has been deleted successfully',
      });

      await fetchActivities();
      return true;
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      toast({
        title: 'Error deleting activity',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const togglePin = async (id: string, isPinned: boolean): Promise<boolean> => {
    return updateActivity(id, { is_pinned: !isPinned });
  };

  const stats = useMemo(() => {
    const total = activities.length;
    const scheduled = activities.filter(a => a.status === 'scheduled').length;
    const inProgress = activities.filter(a => a.status === 'in_progress').length;
    const completed = activities.filter(a => a.status === 'completed').length;
    const meetings = activities.filter(a => a.activity_type === 'meeting').length;
    const tasks = activities.filter(a => a.activity_type === 'task').length;

    return { total, scheduled, inProgress, completed, meetings, tasks };
  }, [activities]);

  const todayActivities = useMemo(() => {
    return activities.filter(activity => {
      if (!activity.scheduled_at) return false;
      return isToday(parseISO(activity.scheduled_at));
    });
  }, [activities]);

  const upcomingActivities = useMemo(() => {
    return activities.filter(activity => {
      if (!activity.scheduled_at) return false;
      const scheduledDate = parseISO(activity.scheduled_at);
      return isFuture(scheduledDate) && !isToday(scheduledDate);
    }).slice(0, 5);
  }, [activities]);

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
