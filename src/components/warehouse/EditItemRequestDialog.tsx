import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, X, Plus, Minus, Package, Search, PlusCircle } from 'lucide-react';
import { ItemRequest, ItemRequestApprover } from '@/hooks/useItemRequests';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/hooks/useDepartments';
import { clearInventoryCache } from '@/hooks/useInventory';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  description?: string;
}

interface SelectedItem {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  maxQuantity: number;
}

interface EditItemRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ItemRequest | null;
  approvers: ItemRequestApprover[];
  departments: Department[];
  inventoryItems?: InventoryItem[];
  canAddItems?: boolean;
  onSuccess: () => void;
}

export function EditItemRequestDialog({
  open,
  onOpenChange,
  request,
  approvers,
  departments,
  inventoryItems = [],
  canAddItems = false,
  onSuccess,
}: EditItemRequestDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  
  // Form states for details
  const [requesterName, setRequesterName] = useState('');
  const [requesterDepartmentId, setRequesterDepartmentId] = useState<string>('');
  const [requesterDepartmentText, setRequesterDepartmentText] = useState('');
  const [usagePurpose, setUsagePurpose] = useState('');
  const [approverId, setApproverId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // States for adding items
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Get existing item IDs from request to filter them out
  const existingItemIds = useMemo(() => {
    if (!request?.requested_items) return new Set<string>();
    return new Set(request.requested_items.map(item => item.item_id).filter(Boolean));
  }, [request]);

  // Filter available items (exclude already requested items and items with 0 stock)
  const availableItems = useMemo(() => {
    // Important for performance: only filter the (potentially huge) inventory list
    // when the user is actually on the "Add Items" tab.
    if (!canAddItems || activeTab !== 'add-items') return [];

    const q = deferredSearchQuery.trim().toLowerCase();

    return inventoryItems.filter((item) => {
      if (existingItemIds.has(item.id)) return false;
      if (item.quantity <= 0) return false;
      if (!q) return true;
      return (
        item.item_name.toLowerCase().includes(q) ||
        item.item_number.toLowerCase().includes(q)
      );
    });
  }, [inventoryItems, existingItemIds, deferredSearchQuery, canAddItems, activeTab]);

  const MAX_RENDERED_ITEMS = 200;

  // Populate form when request changes
  useEffect(() => {
    if (request) {
      setRequesterName(request.requester_name || '');
      setRequesterDepartmentId(request.requester_department_id || '');
      setRequesterDepartmentText(request.requester_department_text || '');
      setUsagePurpose(request.usage_purpose || '');
      setApproverId(request.approved_by_id || '');
      setNotes(request.notes || '');
      setSelectedItems([]);
      setSearchQuery('');
      setActiveTab('details');
    }
  }, [request]);

  const toggleItem = (item: InventoryItem, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, {
        id: item.id,
        item_number: item.item_number,
        item_name: item.item_name,
        quantity: 1,
        maxQuantity: item.quantity,
      }]);
    } else {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, Math.min(item.maxQuantity, item.quantity + delta));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    if (!request) return;
    
    if (!requesterName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Requester name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!approverId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an approver',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // First, handle adding new items if any
      if (selectedItems.length > 0) {
        // Reduce inventory for each selected item
        for (const item of selectedItems) {
          const inventoryItem = inventoryItems.find(i => i.id === item.id);
          if (inventoryItem) {
            const newQuantity = inventoryItem.quantity - item.quantity;
            const { error: rpcError } = await supabase.rpc('reduce_item_quantity', {
              p_item_id: item.id,
              p_new_quantity: newQuantity,
            });
            if (rpcError) throw rpcError;
          }
        }

        // Prepare new items to add to requested_items
        const newRequestedItems = selectedItems.map(item => {
          const inventoryItem = inventoryItems.find(i => i.id === item.id);
          return {
            item_id: item.id,
            item_number: item.item_number,
            item_name: item.item_name,
            quantity: item.quantity,
            previous_quantity: inventoryItem?.quantity || 0,
            new_quantity: (inventoryItem?.quantity || 0) - item.quantity,
          };
        });

        // Merge with existing requested items
        const existingItems = request.requested_items || [];
        const mergedItems = [...existingItems, ...newRequestedItems];

        // Calculate new totals
        const totalQuantityRequested = mergedItems.reduce((sum, item) => sum + item.quantity, 0);
        const itemDescription = mergedItems.map(item => `${item.item_name} (x${item.quantity})`).join(', ');

        const updateData: any = {
          requester_name: requesterName.trim(),
          requester_department_id: requesterDepartmentId || null,
          requester_department_text: requesterDepartmentText.trim() || null,
          usage_purpose: usagePurpose.trim() || null,
          approved_by_id: approverId,
          notes: notes.trim() || null,
          requested_items: mergedItems,
          quantity_requested: totalQuantityRequested,
          item_description: itemDescription,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('item_requests')
          .update(updateData)
          .eq('id', request.id);

        if (error) throw error;

        clearInventoryCache();

        toast({
          title: 'Success',
          description: `Request updated with ${selectedItems.length} new item(s) added`,
        });
      } else {
        // Just update the details without adding items
        const updateData: any = {
          requester_name: requesterName.trim(),
          requester_department_id: requesterDepartmentId || null,
          requester_department_text: requesterDepartmentText.trim() || null,
          usage_purpose: usagePurpose.trim() || null,
          approved_by_id: approverId,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('item_requests')
          .update(updateData)
          .eq('id', request.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Item request updated successfully',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating item request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update item request',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedItems([]);
    setSearchQuery('');
    setActiveTab('details');
    onOpenChange(false);
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Save className="h-5 w-5" />
            Edit Item Request
          </DialogTitle>
          <DialogDescription className="text-blue-100 text-sm">
            Modify request details{canAddItems && ' or add new items'}
          </DialogDescription>
        </DialogHeader>

        {canAddItems ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full rounded-none border-b bg-muted/30">
              <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
              <TabsTrigger value="add-items" className="flex-1 gap-1">
                <PlusCircle className="h-4 w-4" />
                Add Items
                {selectedItems.length > 0 && (
                  <Badge variant="secondary" className="h-5 ml-1">
                    {selectedItems.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0">
              <ScrollArea className="h-[calc(90vh-250px)]">
                <div className="p-4 space-y-4">
                  {renderDetailsForm()}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="add-items" className="mt-0">
              <div className="p-4 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Selected items summary */}
                {selectedItems.length > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {selectedItems.length} item(s) selected • 
                      Total: {selectedItems.reduce((sum, i) => sum + i.quantity, 0)} units
                    </p>
                  </div>
                )}

                {/* Items list */}
                <ScrollArea className="h-[calc(90vh-380px)]">
                  <div className="space-y-2">
                    {availableItems.length > MAX_RENDERED_ITEMS && (
                      <div className="rounded-lg border p-2 text-xs text-muted-foreground">
                        Showing first {MAX_RENDERED_ITEMS} of {availableItems.length} items. Use search to narrow results.
                      </div>
                    )}

                    {availableItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No items available to add</p>
                      </div>
                    ) : (
                      availableItems.slice(0, MAX_RENDERED_ITEMS).map((item) => {
                        const isSelected = selectedItems.some(s => s.id === item.id);
                        const selectedItem = selectedItems.find(s => s.id === item.id);
                        
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                              isSelected 
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" 
                                : "border-border hover:bg-muted/50"
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => toggleItem(item, !!checked)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.item_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.item_number} • Stock: {item.quantity}
                              </p>
                            </div>
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
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="p-4 space-y-4">
              {renderDetailsForm()}
            </div>
          </ScrollArea>
        )}

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
            disabled={saving}
            className="flex-1 gap-2 bg-blue-500 hover:bg-blue-600"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {selectedItems.length > 0 ? `Save & Add ${selectedItems.length} Items` : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  function renderDetailsForm() {
    return (
      <>
        {/* Requester Name */}
        <div className="space-y-2">
          <Label htmlFor="requesterName">Requester Name *</Label>
          <Input
            id="requesterName"
            value={requesterName}
            onChange={(e) => setRequesterName(e.target.value)}
            placeholder="Enter requester name"
          />
        </div>

        {/* Requester Department */}
        <div className="space-y-2">
          <Label>Requester Department</Label>
          <Select
            value={requesterDepartmentId}
            onValueChange={(value) => {
              setRequesterDepartmentId(value);
              if (value) {
                const dept = departments.find(d => d.id === value);
                setRequesterDepartmentText(dept?.name || '');
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Or enter manually:</p>
          <Input
            value={requesterDepartmentText}
            onChange={(e) => {
              setRequesterDepartmentText(e.target.value);
              setRequesterDepartmentId('');
            }}
            placeholder="e.g., Peat Maintenance"
          />
        </div>

        {/* Usage Purpose */}
        <div className="space-y-2">
          <Label htmlFor="usagePurpose">Usage Purpose</Label>
          <Textarea
            id="usagePurpose"
            value={usagePurpose}
            onChange={(e) => setUsagePurpose(e.target.value)}
            placeholder="What will this item be used for?"
            rows={2}
          />
        </div>

        {/* Approver */}
        <div className="space-y-2">
          <Label>Approved By *</Label>
          <Select value={approverId} onValueChange={setApproverId}>
            <SelectTrigger>
              <SelectValue placeholder="Select approver" />
            </SelectTrigger>
            <SelectContent>
              {approvers.map((approver) => (
                <SelectItem key={approver.id} value={approver.id}>
                  {approver.full_name}
                  {approver.position && (
                    <span className="text-muted-foreground ml-1">
                      ({approver.position})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
            rows={2}
          />
        </div>

        {/* Info about non-editable fields */}
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-sm">
          <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">
            Note: The following cannot be edited:
          </p>
          <ul className="text-amber-600 dark:text-amber-400/80 text-xs list-disc list-inside space-y-0.5">
            <li>Existing items and quantities</li>
            <li>Approval proof image</li>
            <li>Request date</li>
          </ul>
          {canAddItems && (
            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-2">
              ✓ You can add new items via the "Add Items" tab
            </p>
          )}
        </div>
      </>
    );
  }
}