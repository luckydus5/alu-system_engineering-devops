import { useSessionHeartbeat } from '@/hooks/useSessionHeartbeat';

export function SessionTracker() {
  useSessionHeartbeat();
  return null;
}
