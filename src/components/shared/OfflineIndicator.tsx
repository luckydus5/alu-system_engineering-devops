 import { useEffect, useState } from 'react';
 import { Cloud, CloudOff, Loader2 } from 'lucide-react';
 import { cn } from '@/lib/utils';
 import { useNetworkStatus } from '@/hooks/useNetworkStatus';
 
 interface OfflineIndicatorProps {
   pendingCount?: number;
   isSyncing?: boolean;
   onSync?: () => void;
   className?: string;
 }
 
 export function OfflineIndicator({
   pendingCount = 0,
   isSyncing = false,
   onSync,
   className,
 }: OfflineIndicatorProps) {
   const { isOnline } = useNetworkStatus();
   const [showSaved, setShowSaved] = useState(false);
 
   // Show "Saved" briefly after sync completes
   useEffect(() => {
     if (isOnline && !isSyncing && pendingCount === 0) {
       setShowSaved(true);
       const timer = setTimeout(() => setShowSaved(false), 2000);
       return () => clearTimeout(timer);
     }
   }, [isOnline, isSyncing, pendingCount]);
 
   // Auto-trigger sync when coming back online
   useEffect(() => {
     if (isOnline && pendingCount > 0 && !isSyncing && onSync) {
       onSync();
     }
   }, [isOnline, pendingCount, isSyncing, onSync]);
 
   // Determine what to show
   const getStatus = () => {
     if (!isOnline) {
       return { text: 'Offline', icon: CloudOff, color: 'text-amber-500' };
     }
     if (isSyncing || pendingCount > 0) {
       return { text: 'Syncing...', icon: Loader2, color: 'text-blue-500', spin: true };
     }
     if (showSaved) {
       return { text: 'Saved', icon: Cloud, color: 'text-emerald-500' };
     }
     return null;
   };
 
   const status = getStatus();
 
   // Don't show anything when online and synced (after the "Saved" fades)
   if (!status) {
     return null;
   }
 
   const IconComponent = status.icon;
 
   return (
     <div className={cn('flex items-center gap-1.5', className)}>
       <IconComponent 
         className={cn(
           'h-3.5 w-3.5',
           status.color,
           status.spin && 'animate-spin'
         )} 
       />
       <span className={cn('text-xs font-medium', status.color)}>
         {status.text}
       </span>
     </div>
   );
 }