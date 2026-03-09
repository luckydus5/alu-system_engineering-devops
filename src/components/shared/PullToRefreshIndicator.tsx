import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({ pullProgress, isRefreshing }: PullToRefreshIndicatorProps) {
  if (pullProgress === 0 && !isRefreshing) return null;

  return (
    <div 
      className={cn(
        "absolute left-0 right-0 flex justify-center z-50 transition-all duration-200",
        isRefreshing ? "top-4" : "top-0"
      )}
      style={{ 
        transform: isRefreshing ? 'none' : `translateY(${Math.min(pullProgress, 100) * 0.5}px)`,
        opacity: isRefreshing ? 1 : Math.min(pullProgress / 50, 1)
      }}
    >
      <div className={cn(
        "bg-primary rounded-full p-2 shadow-lg",
        isRefreshing && "animate-spin"
      )}>
        <RefreshCw className="h-5 w-5 text-primary-foreground" />
      </div>
    </div>
  );
}
