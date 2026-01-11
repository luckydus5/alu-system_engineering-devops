import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSessionHeartbeat() {
  const { user } = useAuth();
  const location = useLocation();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPageRef = useRef<string>('');
  const isUnmountingRef = useRef(false);

  const sendHeartbeat = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_sessions')
        .upsert(
          {
            user_id: user.id,
            last_activity: new Date().toISOString(),
            is_active: true,
            current_page: location.pathname,
            user_agent: navigator.userAgent.substring(0, 200),
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        );

      if (error) {
        console.debug('Heartbeat upsert failed:', error.message);
      }
    } catch (error) {
      console.debug('Heartbeat failed:', error);
    }
  }, [user, location.pathname]);

  // Send heartbeat on page change
  useEffect(() => {
    if (location.pathname !== lastPageRef.current) {
      lastPageRef.current = location.pathname;
      sendHeartbeat();
    }
  }, [location.pathname, sendHeartbeat]);

  // Set up interval heartbeat - delay initial to not block login
  useEffect(() => {
    if (!user) return;

    // Delay first heartbeat to not block login/navigation
    const initialTimeout = setTimeout(() => {
      sendHeartbeat();
    }, 2000);

    // Set up interval for heartbeat every 30 seconds (balanced frequency)
    intervalRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, sendHeartbeat]);

  // Handle visibility change - only send heartbeat when visible, don't mark inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sendHeartbeat, user]);

  // Only mark as inactive on actual page unload (closing tab/window)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        // Synchronous request to mark inactive on page close
        const data = JSON.stringify({ is_active: false });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(
          `https://edumcnnilpnbdxcjpchw.supabase.co/rest/v1/user_sessions?user_id=eq.${user.id}`,
          blob
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);
}
