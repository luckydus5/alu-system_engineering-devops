 import { useState, useEffect, useCallback, useRef } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 import {
   getPendingTransactions,
   deletePendingTransaction,
   addPendingTransaction,
   updateCachedItem,
 } from '@/lib/offlineDb';
 import { useNetworkStatus } from './useNetworkStatus';
 
 interface PendingTransaction {
   id: string;
   inventory_item_id: string;
   department_id: string;
   transaction_type: 'stock_in' | 'stock_out';
   quantity: number;
   previous_quantity: number;
   new_quantity: number;
   notes: string | null;
   created_at: string;
   synced: boolean;
 }
 
 export function useOfflineSync(departmentId: string | undefined) {
   const { isOnline } = useNetworkStatus();
   const { toast } = useToast();
   const [pendingCount, setPendingCount] = useState(0);
   const [isSyncing, setIsSyncing] = useState(false);
   const syncInProgress = useRef(false);
 
   // Check pending count on mount and when online status changes
   const refreshPendingCount = useCallback(async () => {
     try {
       const pending = await getPendingTransactions();
       setPendingCount(pending.length);
     } catch (error) {
       console.error('Error getting pending transactions:', error);
     }
   }, []);
 
   useEffect(() => {
     refreshPendingCount();
   }, [refreshPendingCount]);
 
   // Sync pending transactions when coming back online
   const syncPendingTransactions = useCallback(async () => {
     if (!isOnline || syncInProgress.current) return;
 
     syncInProgress.current = true;
     setIsSyncing(true);
 
     try {
       const pending = await getPendingTransactions();
       
       if (pending.length === 0) {
         setIsSyncing(false);
         syncInProgress.current = false;
         return;
       }
 
       let successCount = 0;
       let errorCount = 0;
 
       for (const tx of pending) {
         try {
           // Get current item quantity from server to ensure we have latest
           const { data: currentItem } = await supabase
             .from('inventory_items')
             .select('quantity')
             .eq('id', tx.inventory_item_id)
             .maybeSingle();
 
           if (!currentItem) {
             // Item was deleted, remove pending transaction
             await deletePendingTransaction(tx.id);
             continue;
           }
 
           // Calculate the new quantity based on the transaction
           const quantityChange = tx.transaction_type === 'stock_in' ? tx.quantity : -tx.quantity;
           const newQuantity = Math.max(0, currentItem.quantity + quantityChange);
 
           // Update the item
           const { error: updateError } = await supabase
             .from('inventory_items')
             .update({ quantity: newQuantity })
             .eq('id', tx.inventory_item_id);
 
           if (updateError) throw updateError;
 
           // Create the stock transaction record
           const { data: userData } = await supabase.auth.getUser();
 
           const { error: txError } = await supabase
             .from('stock_transactions')
             .insert({
               inventory_item_id: tx.inventory_item_id,
               department_id: tx.department_id,
               transaction_type: tx.transaction_type,
               quantity: tx.quantity,
               previous_quantity: currentItem.quantity,
               new_quantity: newQuantity,
               notes: tx.notes ? `[Offline] ${tx.notes}` : '[Synced from offline]',
               created_by: userData.user?.id,
             });
 
           if (txError) throw txError;
 
           // Remove from pending
           await deletePendingTransaction(tx.id);
           successCount++;
         } catch (error) {
           console.error('Error syncing transaction:', tx.id, error);
           errorCount++;
         }
       }
 
       await refreshPendingCount();
 
       if (successCount > 0) {
         toast({
           title: 'Sync Complete',
           description: `${successCount} offline change${successCount > 1 ? 's' : ''} synced successfully`,
         });
       }
 
       if (errorCount > 0) {
         toast({
           title: 'Sync Issues',
           description: `${errorCount} change${errorCount > 1 ? 's' : ''} failed to sync. Will retry later.`,
           variant: 'destructive',
         });
       }
     } catch (error) {
       console.error('Error during sync:', error);
     } finally {
       setIsSyncing(false);
       syncInProgress.current = false;
     }
   }, [isOnline, toast, refreshPendingCount]);
 
   // Auto-sync when coming back online
   useEffect(() => {
     if (isOnline) {
       syncPendingTransactions();
     }
   }, [isOnline, syncPendingTransactions]);
 
   // Add an offline transaction (optimistic update)
   const addOfflineTransaction = useCallback(async (
     itemId: string,
     transactionType: 'stock_in' | 'stock_out',
     quantity: number,
     previousQuantity: number,
     notes: string | null
   ) => {
     if (!departmentId) return false;
 
     const newQuantity = transactionType === 'stock_in' 
       ? previousQuantity + quantity 
       : Math.max(0, previousQuantity - quantity);
 
     const transaction: PendingTransaction = {
       id: crypto.randomUUID(),
       inventory_item_id: itemId,
       department_id: departmentId,
       transaction_type: transactionType,
       quantity,
       previous_quantity: previousQuantity,
       new_quantity: newQuantity,
       notes,
       created_at: new Date().toISOString(),
       synced: false,
     };
 
     try {
       // Save to IndexedDB
       await addPendingTransaction(transaction);
 
       // Update cached item for optimistic UI
       await updateCachedItem(itemId, { quantity: newQuantity });
 
       await refreshPendingCount();
 
       return true;
     } catch (error) {
       console.error('Error adding offline transaction:', error);
       return false;
     }
   }, [departmentId, refreshPendingCount]);
 
   return {
     pendingCount,
     isSyncing,
     isOnline,
     syncPendingTransactions,
     addOfflineTransaction,
     refreshPendingCount,
   };
 }