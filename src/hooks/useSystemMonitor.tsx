import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from './useUserRole';
import { useToast } from './use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SystemEvent {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  description: string | null;
  metadata: unknown;
  user_id: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_started: string;
  last_activity: string;
  is_active: boolean;
  current_page: string | null;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

export interface SystemMetrics {
  activeSessions: number;
  inactiveSessions: number;
  totalUsers: number;
  recentEvents: SystemEvent[];
  dbStats: {
    totalRecords: Record<string, number>;
    recentActivity: {
      inserts24h: number;
      updates24h: number;
      deletes24h: number;
    };
  };
  performanceMetrics: {
    avgQueryTime: number;
    slowQueries: number;
  };
  authMetrics: {
    failedLogins24h: number;
    successfulLogins24h: number;
    suspiciousActivity: number;
  };
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
  };
  lastReportAt: string | null;
  generatedAt: string;
}

export function useSystemMonitor(autoRefreshInterval = 30000) {
  const { highestRole, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const canView = highestRole === 'super_admin';

  const fetchMetrics = useCallback(async () => {
    if (!canView) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase.functions.invoke('system-monitor', {
        body: {},
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setMetrics(data as SystemMetrics);
      setEvents(data.recentEvents || []);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      console.error('Failed to fetch system metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [canView]);

  const fetchSessions = useCallback(async () => {
    if (!canView) return;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .order('last_activity', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = (data || []).map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      
      const sessionsWithProfiles = (data || []).map(s => ({
        ...s,
        profiles: profileMap.get(s.user_id) || { full_name: null, email: '' }
      })) as UserSession[];
      
      setSessions(sessionsWithProfiles);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  }, [canView]);

  const fetchEvents = useCallback(async () => {
    if (!canView) return;

    try {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  }, [canView]);

  const resolveEvent = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('system_events')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;
      
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, resolved: true, resolved_at: new Date().toISOString() }
            : e
        )
      );
      
      toast({ title: 'Event resolved' });
    } catch (err) {
      console.error('Failed to resolve event:', err);
      toast({ title: 'Failed to resolve event', variant: 'destructive' });
    }
  }, [toast]);

  const generateReport = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('system-monitor', {
        body: { action: 'generate_report' },
      });

      if (error) throw error;
      
      toast({ title: 'System report generated' });
      fetchMetrics();
      return data;
    } catch (err) {
      console.error('Failed to generate report:', err);
      toast({ title: 'Failed to generate report', variant: 'destructive' });
    }
  }, [toast, fetchMetrics]);

  // Initial fetch
  useEffect(() => {
    if (!roleLoading && canView) {
      fetchMetrics();
      fetchSessions();
      fetchEvents();
    }
  }, [roleLoading, canView, fetchMetrics, fetchSessions, fetchEvents]);

  // Auto-refresh
  useEffect(() => {
    if (!canView) return;

    intervalRef.current = setInterval(() => {
      fetchMetrics();
      fetchSessions();
    }, autoRefreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [canView, autoRefreshInterval, fetchMetrics, fetchSessions]);

  // Real-time subscriptions for sessions
  useEffect(() => {
    if (!canView) return;

    channelRef.current = supabase
      .channel('system-monitor-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
        },
        () => {
          fetchSessions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_events',
        },
        (payload) => {
          const newEvent = payload.new as SystemEvent;
          setEvents((prev) => [newEvent, ...prev.slice(0, 99)]);
          
          // Show toast for critical/high severity events
          if (newEvent.severity === 'critical' || newEvent.severity === 'high') {
            toast({
              title: `⚠️ ${newEvent.title}`,
              description: newEvent.description || undefined,
              variant: 'destructive',
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [canView, fetchSessions, toast]);

  return {
    metrics,
    sessions,
    events,
    loading,
    lastRefresh,
    canView,
    refresh: useCallback(() => {
      fetchMetrics();
      fetchSessions();
      fetchEvents();
    }, [fetchMetrics, fetchSessions, fetchEvents]),
    resolveEvent,
    generateReport,
  };
}
