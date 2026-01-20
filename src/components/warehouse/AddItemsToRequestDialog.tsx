import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, Package, Minus, Search, X, Save } from 'lucide-react';
import { ItemRequest, RequestedItem } from '@/hooks/useItemRequests';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { clearInventoryCache } from '@/hooks/useInventory';

interface InventoryItem {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  description?: string;
}

interface AddItemsToRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ItemRequest | null;
  inventoryItems: InventoryItem[];
  onSuccess: () => void;
}

interface SelectedItem {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  maxQuantity: number;
}

export function AddItemsToRequestDialog({
  open,
  onOpenChange,
  request,
  inventoryItems,
  onSuccess,
}: AddItemsToRequestDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItem>>(new Map());

  // Get list of item IDs already in the request
  const existingItemIds = useMemo(() => {
    if (!request?.requested_items) return new Set<string>();
    return new Set(request.requested_items.map(item => item.item_id));
  }, [request]);

  // Filter out items already in the request and apply search
  const availableItems = useMemo(() => {
    return inventoryItems.filter(item => {
      // Exclude items already in the request
      if (existingItemIds.has(item.id)) return false;
      // Exclude items with 0 quantity
      if (item.quantity <= 0) return false;
      // Apply search filter
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.item_name.toLowerCase().includes(query) ||
        item.item_number.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    });
  }, [inventoryItems, existingItemIds, searchQuery]);

  const toggleItem = (item: InventoryItem, checked: boolean) => {
    const newSelected = new Map(selectedItems);
    if (checked) {
      newSelected.set(item.id, {
        id: item.id,
        item_number: item.item_number,
        item_name: item.item_name,
        quantity: 1,
        maxQuantity: item.quantity,
      });
    } else {
      newSelected.delete(item.id);
    }
    setSelectedItems(newSelected);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(itemId);
    if (item) {
      const newQty = Math.max(1, Math.min(item.maxQuantity, item.quantity + delta));
      newSelected.set(itemId, { ...item, quantity: newQty });
      setSelectedItems(newSelected);
    }
  };

  const handleSave = async () => {
    if (!request || selectedItems.size === 0) return;

    try {
      setSaving(true);

      // Get current requested_items from the request
      const currentItems: RequestedItem[] = request.requested_items || [];

      // Prepare new items to add
      const newItemsToAdd: RequestedItem[] = [];
      
      for (const [itemId, selected] of selectedItems.entries()) {
        const inventoryItem = inventoryItems.find(i => i.id === itemId);
        if (!inventoryItem) continue;

        const previousQty = inventoryItem.quantity;
        const newQty = previousQty - selected.quantity;

        newItemsToAdd.push({
          item_id: itemId,
          item_name: selected.item_name,
          quantity: selected.quantity,
          previous_quantity: previousQty,
          new_quantity: newQty,
        });

        // Reduce the inventory quantity
        const { error: rpcError } = await (supabase as any).rpc('reduce_item_quantity', {
          p_item_id: itemId,
          p_new_quantity: newQty,
        });

        if (rpcError) {
          console.error('Error reducing inventory:', rpcError);
          throw new Error(`Failed to reduce inventory for ${selected.item_name}`);
        }
      }

      // Merge current and new items
      const updatedItems = [...currentItems, ...newItemsToAdd];

      // Calculate new totals
      const totalQtyRequested = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

      // Update the item_request with new items
      const { error: updateError } = await (supabase as any)
        .from('item_requests')
        .update({
          requested_items: updatedItems,
          quantity_requested: totalQtyRequested,
          item_description: updatedItems.map(i => i.item_name).join(', '),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Clear inventory cache
      clearInventoryCache();

      toast({
        title: 'Success',
        description: `Added ${newItemsToAdd.length} item(s) to the request`,
      });

      // Reset state
      setSelectedItems(new Map());
      setSearchQuery('');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding items to request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add items to request',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedItems(new Map());
    setSearchQuery('');
    onOpenChange(false);
  };

  if (!request) return null;

  const totalNewItems = selectedItems.size;
  const totalNewQty = Array.from(selectedItems.values()).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-emerald-500 to-emerald-600">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Plus className="h-5 w-5" />
            Add Items to Request
          </DialogTitle>
          <p className="text-emerald-100 text-xs">
            Request by: {request.requester_name}
          </p>
        </DialogHeader>

        {/* Search */}
        <div className="p-4 pb-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Selected Items Summary */}
        {selectedItems.size > 0 && (
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-b">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {totalNewItems} item(s) selected ({totalNewQty} total qty)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedItems(new Map())}
                className="h-7 text-xs text-emerald-700 hover:text-emerald-800"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Available Items List */}
        <ScrollArea className="max-h-[350px]">
          <div className="p-4 space-y-2">
            {availableItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No available items found</p>
              </div>
            ) : (
              availableItems.map((item) => {
                const isSelected = selectedItems.has(item.id);
                const selectedItem = selectedItems.get(item.id);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                        : 'bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleItem(item, !!checked)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">{item.item_name}</span>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            {item.item_number}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>In Stock: {item.quantity}</span>
                        </div>
                      </div>

                      {/* Quantity Controls (shown when selected) */}
                      {isSelected && selectedItem && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, -1)}
                            disabled={selectedItem.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-mono text-sm">
                            {selectedItem.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, 1)}
                            disabled={selectedItem.quantity >= selectedItem.maxQuantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/30 flex gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="flex-1 gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedItems.size === 0}
            className="flex-1 gap-2 bg-emerald-500 hover:bg-emerald-600"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Add {totalNewItems} Item(s)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
