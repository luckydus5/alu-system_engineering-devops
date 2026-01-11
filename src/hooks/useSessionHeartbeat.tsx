import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSessionHeartbeat() {
  const { user } = useAuth();
  const location = useLocation();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sendHeartbeat = useCallback(async () => {
    if (!user) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      await supabase.functions.invoke('system-monitor', {
        body: {},
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      // Also update local session in database
      await supabase
        .from('user_sessions')
        .upsert(
          {
            user_id: user.id,
            last_activity: new Date().toISOString(),
            is_active: true,
            current_page: location.pathname,
            user_agent: navigator.userAgent,
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        );
    } catch (error) {
      // Silent fail for heartbeat
      console.debug('Heartbeat failed:', error);
    }
  }, [user, location.pathname]);

  useEffect(() => {
    if (!user) return;

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval for heartbeat every 30 seconds
    intervalRef.current = setInterval(sendHeartbeat, 30000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Mark session as inactive on cleanup
      if (user) {
        supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .then(() => {});
      }
    };
  }, [user, sendHeartbeat]);

  // Also send heartbeat on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sendHeartbeat]);
}
