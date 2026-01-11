import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useSessionHeartbeat() {
  const { user } = useAuth();
  const location = useLocation();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPageRef = useRef<string>('');

  const sendHeartbeat = useCallback(async () => {
    if (!user) return;

    try {
      // Update session in database directly
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
        console.debug('Heartbeat upsert failed, trying insert:', error.message);
        // Try insert if upsert failed
        await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            last_activity: new Date().toISOString(),
            is_active: true,
            current_page: location.pathname,
            user_agent: navigator.userAgent.substring(0, 200),
          });
      }
    } catch (error) {
      // Silent fail for heartbeat
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

  // Set up interval heartbeat
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

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      } else if (user) {
        // Mark as inactive when tab is hidden
        supabase
          .from('user_sessions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .then(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sendHeartbeat, user]);

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        // Use sendBeacon for reliable delivery on page unload
        const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://edumcnnilpnbdxcjpchw.supabase.co'}/rest/v1/user_sessions?user_id=eq.${user.id}`;
        navigator.sendBeacon(url);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);
}
