 import { useState, useEffect, useCallback } from 'react';
 
 export function useNetworkStatus() {
   const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
   const [wasOffline, setWasOffline] = useState(false);
 
   useEffect(() => {
     const handleOnline = () => {
       setIsOnline(true);
       // Track that we were offline and are now back
       if (wasOffline) {
         setWasOffline(false);
       }
     };
 
     const handleOffline = () => {
       setIsOnline(false);
       setWasOffline(true);
     };
 
     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);
 
     return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
     };
   }, [wasOffline]);
 
   return { isOnline, wasOffline };
 }