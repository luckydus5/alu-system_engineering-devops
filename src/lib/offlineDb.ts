 // IndexedDB storage for offline warehouse data
 import { openDB, DBSchema, IDBPDatabase } from 'idb';
 
 // Database schema interface
 interface WarehouseDB extends DBSchema {
   inventory_items: {
     key: string;
     value: {
       id: string;
       department_id: string;
       classification_id: string | null;
       location_id: string | null;
       item_number: string;
       item_name: string;
       quantity: number;
       min_quantity: number;
       location: string;
       description: string | null;
       unit: string;
       image_url: string | null;
       created_at: string;
       updated_at: string;
       created_by: string | null;
     };
     indexes: { 'by-department': string; 'by-classification': string; 'by-location': string };
   };
   warehouse_classifications: {
     key: string;
     value: {
       id: string;
       department_id: string;
       name: string;
       description: string | null;
       color: string | null;
       icon: string | null;
       sort_order: number | null;
       created_at: string;
       updated_at: string;
       created_by: string | null;
     };
     indexes: { 'by-department': string };
   };
   warehouse_locations: {
     key: string;
     value: {
       id: string;
       department_id: string;
       classification_id: string;
       parent_id: string | null;
       name: string;
       description: string | null;
       min_items: number | null;
       sort_order: number | null;
       created_at: string;
       updated_at: string;
       created_by: string | null;
     };
     indexes: { 'by-department': string; 'by-classification': string; 'by-parent': string };
   };
   pending_transactions: {
     key: string;
     value: {
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
     };
     indexes: { 'by-synced': number };
   };
   sync_metadata: {
     key: string;
     value: {
       key: string;
       value: string | number;
     };
   };
 }
 
 const DB_NAME = 'warehouse-offline-db';
 const DB_VERSION = 1;
 
 let dbPromise: Promise<IDBPDatabase<WarehouseDB>> | null = null;
 
 export function getDb(): Promise<IDBPDatabase<WarehouseDB>> {
   if (!dbPromise) {
     dbPromise = openDB<WarehouseDB>(DB_NAME, DB_VERSION, {
       upgrade(db) {
         // Inventory items store
         if (!db.objectStoreNames.contains('inventory_items')) {
           const itemsStore = db.createObjectStore('inventory_items', { keyPath: 'id' });
           itemsStore.createIndex('by-department', 'department_id');
           itemsStore.createIndex('by-classification', 'classification_id');
           itemsStore.createIndex('by-location', 'location_id');
         }
 
         // Classifications store
         if (!db.objectStoreNames.contains('warehouse_classifications')) {
           const classStore = db.createObjectStore('warehouse_classifications', { keyPath: 'id' });
           classStore.createIndex('by-department', 'department_id');
         }
 
         // Locations store
         if (!db.objectStoreNames.contains('warehouse_locations')) {
           const locStore = db.createObjectStore('warehouse_locations', { keyPath: 'id' });
           locStore.createIndex('by-department', 'department_id');
           locStore.createIndex('by-classification', 'classification_id');
           locStore.createIndex('by-parent', 'parent_id');
         }
 
         // Pending transactions for offline sync
         if (!db.objectStoreNames.contains('pending_transactions')) {
           const pendingStore = db.createObjectStore('pending_transactions', { keyPath: 'id' });
           pendingStore.createIndex('by-synced', 'synced');
         }
 
         // Sync metadata (last sync time, etc.)
         if (!db.objectStoreNames.contains('sync_metadata')) {
           db.createObjectStore('sync_metadata', { keyPath: 'key' });
         }
       },
     });
   }
   return dbPromise;
 }
 
 // Inventory items operations
 export async function cacheInventoryItems(items: WarehouseDB['inventory_items']['value'][]) {
   const db = await getDb();
   const tx = db.transaction('inventory_items', 'readwrite');
   await Promise.all([
     ...items.map(item => tx.store.put(item)),
     tx.done
   ]);
 }
 
 export async function getCachedInventoryItems(departmentId: string): Promise<WarehouseDB['inventory_items']['value'][]> {
   const db = await getDb();
   return db.getAllFromIndex('inventory_items', 'by-department', departmentId);
 }
 
 export async function clearCachedInventoryItems(departmentId: string) {
   const db = await getDb();
   const tx = db.transaction('inventory_items', 'readwrite');
   const index = tx.store.index('by-department');
   let cursor = await index.openCursor(departmentId);
   while (cursor) {
     await cursor.delete();
     cursor = await cursor.continue();
   }
   await tx.done;
 }
 
 // Classifications operations
 export async function cacheClassifications(classifications: WarehouseDB['warehouse_classifications']['value'][]) {
   const db = await getDb();
   const tx = db.transaction('warehouse_classifications', 'readwrite');
   await Promise.all([
     ...classifications.map(c => tx.store.put(c)),
     tx.done
   ]);
 }
 
 export async function getCachedClassifications(departmentId: string): Promise<WarehouseDB['warehouse_classifications']['value'][]> {
   const db = await getDb();
   return db.getAllFromIndex('warehouse_classifications', 'by-department', departmentId);
 }
 
 // Locations operations
 export async function cacheLocations(locations: WarehouseDB['warehouse_locations']['value'][]) {
   const db = await getDb();
   const tx = db.transaction('warehouse_locations', 'readwrite');
   await Promise.all([
     ...locations.map(l => tx.store.put(l)),
     tx.done
   ]);
 }
 
 export async function getCachedLocations(departmentId: string): Promise<WarehouseDB['warehouse_locations']['value'][]> {
   const db = await getDb();
   return db.getAllFromIndex('warehouse_locations', 'by-department', departmentId);
 }
 
 // Pending transactions for offline sync
 export async function addPendingTransaction(transaction: WarehouseDB['pending_transactions']['value']) {
   const db = await getDb();
   await db.put('pending_transactions', transaction);
 }
 
 export async function getPendingTransactions(): Promise<WarehouseDB['pending_transactions']['value'][]> {
   const db = await getDb();
   return db.getAllFromIndex('pending_transactions', 'by-synced', 0);
 }
 
 export async function markTransactionSynced(id: string) {
   const db = await getDb();
   const tx = await db.get('pending_transactions', id);
   if (tx) {
     tx.synced = true;
     await db.put('pending_transactions', tx);
   }
 }
 
 export async function deletePendingTransaction(id: string) {
   const db = await getDb();
   await db.delete('pending_transactions', id);
 }
 
 // Sync metadata operations
 export async function setLastSyncTime(departmentId: string, time: number) {
   const db = await getDb();
   await db.put('sync_metadata', { key: `lastSync_${departmentId}`, value: time });
 }
 
 export async function getLastSyncTime(departmentId: string): Promise<number | null> {
   const db = await getDb();
   const result = await db.get('sync_metadata', `lastSync_${departmentId}`);
   return result ? Number(result.value) : null;
 }
 
 // Update a single cached item (for optimistic updates during offline edits)
 export async function updateCachedItem(itemId: string, updates: Partial<WarehouseDB['inventory_items']['value']>) {
   const db = await getDb();
   const item = await db.get('inventory_items', itemId);
   if (item) {
     await db.put('inventory_items', { ...item, ...updates });
   }
 }