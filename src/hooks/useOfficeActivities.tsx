import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Note: This hook uses field_updates table which doesn't exist in the database yet
// Stubbed out until the table is created

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
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchActivities = useCallback(async () => {
    // Stubbed - table doesn't exist
    setActivities([]);
    setLoading(false);
  }, [departmentId]);

  const createActivity = async (data: CreateActivityData): Promise<boolean> => {
    toast({
      title: 'Feature not available',
      description: 'Office activities feature is not yet configured',
      variant: 'destructive',
    });
    return false;
  };

  const updateActivity = async (
    id: string,
    data: Partial<CreateActivityData>
  ): Promise<boolean> => {
    return false;
  };

  const deleteActivity = async (id: string): Promise<boolean> => {
    return false;
  };

  const togglePin = async (id: string, isPinned: boolean): Promise<boolean> => {
    return false;
  };

  const stats = {
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    meetings: 0,
    tasks: 0,
  };

  const todayActivities: OfficeActivity[] = [];
  const upcomingActivities: OfficeActivity[] = [];

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
