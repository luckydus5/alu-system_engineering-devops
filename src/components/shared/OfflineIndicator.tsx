 import { useState, useEffect } from 'react';
 import { WifiOff, Wifi, RefreshCw, CloudOff, Check } from 'lucide-react';
 import { Badge } from '@/components/ui/badge';
 import { Button } from '@/components/ui/button';
 import { cn } from '@/lib/utils';
 import { useNetworkStatus } from '@/hooks/useNetworkStatus';
 import { formatDistanceToNow } from 'date-fns';
 
 interface OfflineIndicatorProps {
   pendingCount?: number;
   isSyncing?: boolean;
   lastSyncTime?: number | null;
   isOfflineData?: boolean;
   onSync?: () => void;
   className?: string;
 }
 
 export function OfflineIndicator({
   pendingCount = 0,
   isSyncing = false,
   lastSyncTime,
   isOfflineData = false,
   onSync,
   className,
 }: OfflineIndicatorProps) {
   const { isOnline } = useNetworkStatus();
   const [showDetails, setShowDetails] = useState(false);
 
   // Auto-hide details after 5 seconds
   useEffect(() => {
     if (showDetails) {
       const timer = setTimeout(() => setShowDetails(false), 5000);
       return () => clearTimeout(timer);
     }
   }, [showDetails]);
 
   // Don't show anything if online with no pending and not using offline data
   if (isOnline && pendingCount === 0 && !isOfflineData && !isSyncing) {
     return null;
   }
 
   const getStatusColor = () => {
     if (!isOnline) return 'bg-amber-500';
     if (isSyncing) return 'bg-blue-500';
     if (pendingCount > 0) return 'bg-orange-500';
     if (isOfflineData) return 'bg-amber-400';
     return 'bg-emerald-500';
   };
 
   const getStatusIcon = () => {
     if (!isOnline) return <WifiOff className="h-3 w-3" />;
     if (isSyncing) return <RefreshCw className="h-3 w-3 animate-spin" />;
     if (pendingCount > 0) return <CloudOff className="h-3 w-3" />;
     if (isOfflineData) return <CloudOff className="h-3 w-3" />;
     return <Check className="h-3 w-3" />;
   };
 
   const getStatusText = () => {
     if (!isOnline) return 'Offline';
     if (isSyncing) return 'Syncing...';
     if (pendingCount > 0) return `${pendingCount} pending`;
     if (isOfflineData) return 'Cached data';
     return 'Synced';
   };
 
   return (
     <div className={cn('relative', className)}>
       <Badge
         variant="secondary"
         className={cn(
           'cursor-pointer gap-1.5 px-2 py-1 text-white border-0',
           getStatusColor()
         )}
         onClick={() => setShowDetails(!showDetails)}
       >
         {getStatusIcon()}
         <span className="text-xs font-medium">{getStatusText()}</span>
       </Badge>
 
       {/* Expanded details dropdown */}
       {showDetails && (
         <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border p-3 z-50">
           <div className="space-y-2">
             {/* Connection status */}
             <div className="flex items-center gap-2">
               {isOnline ? (
                 <>
                   <Wifi className="h-4 w-4 text-emerald-500" />
                   <span className="text-sm text-foreground">Connected</span>
                 </>
               ) : (
                 <>
                   <WifiOff className="h-4 w-4 text-amber-500" />
                   <span className="text-sm text-foreground">No internet connection</span>
                 </>
               )}
             </div>
 
             {/* Last sync time */}
             {lastSyncTime && (
               <div className="text-xs text-muted-foreground">
                 Last synced: {formatDistanceToNow(new Date(lastSyncTime), { addSuffix: true })}
               </div>
             )}
 
             {/* Pending changes */}
             {pendingCount > 0 && (
               <div className="text-xs text-orange-600 dark:text-orange-400">
                 {pendingCount} change{pendingCount > 1 ? 's' : ''} waiting to sync
               </div>
             )}
 
             {/* Offline data warning */}
             {isOfflineData && (
               <div className="text-xs text-amber-600 dark:text-amber-400">
                 Showing cached data. Some info may be outdated.
               </div>
             )}
 
             {/* Sync button */}
             {isOnline && (pendingCount > 0 || isOfflineData) && onSync && (
               <Button
                 size="sm"
                 variant="outline"
                 className="w-full mt-2"
                 onClick={(e) => {
                   e.stopPropagation();
                   onSync();
                   setShowDetails(false);
                 }}
                 disabled={isSyncing}
               >
                 <RefreshCw className={cn('h-3 w-3 mr-2', isSyncing && 'animate-spin')} />
                 {isSyncing ? 'Syncing...' : 'Sync Now'}
               </Button>
             )}
           </div>
         </div>
       )}
     </div>
   );
 }