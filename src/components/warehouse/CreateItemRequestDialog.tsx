import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  Upload,
  Loader2,
  X,
  User,
  Package,
  FileText,
  CheckCircle2,
  Image as ImageIcon,
  Search,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';
import { useItemRequestApprovers, useCreateItemRequest } from '@/hooks/useItemRequests';
import { InventoryItem } from '@/hooks/useInventory';
import { Department } from '@/hooks/useDepartments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Type for selected items with quantity
interface SelectedItemWithQty {
  item: InventoryItem;
  quantity: number;
}

interface CreateItemRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  items: InventoryItem[];
  departments: Department[];
  onSuccess?: () => void;
}

export function CreateItemRequestDialog({
  open,
  onOpenChange,
  departmentId,
  items,
  departments,
  onSuccess,
}: CreateItemRequestDialogProps) {
  const { toast } = useToast();
  const { createRequest } = useCreateItemRequest();
  const { approvers, loading: approversLoading } = useItemRequestApprovers(open);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form fields
  const [requesterName, setRequesterName] = useState('');
  const [requesterDepartment, setRequesterDepartment] = useState<string>('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [usagePurpose, setUsagePurpose] = useState('');

  // Static list of requester departments
  const requesterDepartments = [
    'Procurement',
    'HR',
    'Peat Maintenance',
    'LAB (Peat)',
    'Warehouse',
    'Peat Admin',
    'Operators',
    'Camp',
    'CD&SE',
    'Cleaners',
    'IT',
    'Other'
  ];
  const [approverId, setApproverId] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  // Multiple items selection
  const [selectedItems, setSelectedItems] = useState<SelectedItemWithQty[]>([]);
  
  // Item search state
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemResults, setShowItemResults] = useState(false);
  const itemSearchRef = useRef<HTMLDivElement>(null);
  
  // Image upload
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fast item search - only show top 10 matching results (exclude already selected)
  const filteredItems = useMemo(() => {
    if (!itemSearchQuery.trim()) return [];
    const query = itemSearchQuery.toLowerCase();
    const selectedIds = new Set(selectedItems.map(s => s.item.id));
    const results: InventoryItem[] = [];
    
    for (let i = 0; i < items.length && results.length < 10; i++) {
      const item = items[i];
      if (selectedIds.has(item.id)) continue; // Skip already selected
      if (
        item.item_name.toLowerCase().includes(query) ||
        item.item_number.toLowerCase().includes(query)
      ) {
        results.push(item);
      }
    }
    return results;
  }, [items, itemSearchQuery, selectedItems]);

  // Memoize requester department options
  const requesterDepartmentOptions = useMemo(() => 
    requesterDepartments.map((dept) => (
      <SelectItem key={dept} value={dept}>
        {dept}
      </SelectItem>
    )), 
    []
  );

  // Memoize approver options
  const approverOptions = useMemo(() => 
    approvers.map((approver) => (
      <SelectItem key={approver.id} value={approver.id}>
        {approver.full_name}
        {approver.position && ` - ${approver.position}`}
      </SelectItem>
    )), 
    [approvers]
  );

  // Add item to selection
  const handleAddItem = useCallback((item: InventoryItem) => {
    setSelectedItems(prev => [...prev, { item, quantity: 1 }]);
    setItemSearchQuery('');
    setShowItemResults(false);
  }, []);

  // Remove item from selection
  const handleRemoveItem = useCallback((itemId: string) => {
    setSelectedItems(prev => prev.filter(s => s.item.id !== itemId));
  }, []);

  // Update item quantity
  const handleUpdateQuantity = useCallback((itemId: string, newQty: number) => {
    setSelectedItems(prev => prev.map(s => 
      s.item.id === itemId 
        ? { ...s, quantity: Math.max(1, Math.min(newQty, s.item.quantity)) }
        : s
    ));
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (itemSearchRef.current && !itemSearchRef.current.contains(e.target as Node)) {
        setShowItemResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = useCallback(() => {
    setRequesterName('');
    setRequesterDepartment('');
    setCustomDepartment('');
    setSelectedItems([]);
    setItemSearchQuery('');
    setUsagePurpose('');
    setApproverId('');
    setNotes('');
    setProofImage(null);
    setProofImagePreview(null);
    setShowItemResults(false);
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const removeImage = useCallback(() => {
    setProofImage(null);
    setProofImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || 'anonymous';
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('approval-proofs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('approval-proofs')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload Error',
        description: 'Failed to upload proof image',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!requesterName.trim()) {
      toast({ title: 'Error', description: 'Please enter requester name', variant: 'destructive' });
      return;
    }
    if (selectedItems.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one item', variant: 'destructive' });
      return;
    }
    if (!approverId) {
      toast({ title: 'Error', description: 'Please select an approver', variant: 'destructive' });
      return;
    }
    if (!proofImage) {
      toast({ title: 'Error', description: 'Please upload approval proof image', variant: 'destructive' });
      return;
    }

    // Check quantities
    for (const sel of selectedItems) {
      if (sel.quantity > sel.item.quantity) {
        toast({ 
          title: 'Error', 
          description: `Quantity for "${sel.item.item_name}" exceeds available stock (${sel.item.quantity})`, 
          variant: 'destructive' 
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Upload image
      setUploadingImage(true);
      const imageUrl = await uploadImage(proofImage);
      setUploadingImage(false);

      if (!imageUrl) {
        setIsSubmitting(false);
        return;
      }

      // Build item description for display (all items in one string)
      const itemDescriptions = selectedItems.map(s => 
        `${s.item.item_name} (x${s.quantity})`
      ).join(', ');

      // Build requested_items JSON for storage
      const requestedItems = selectedItems.map(s => ({
        id: s.item.id,
        item_number: s.item.item_number,
        item_name: s.item.item_name,
        quantity: s.quantity,
        previous_quantity: s.item.quantity,
        new_quantity: s.item.quantity - s.quantity,
      }));

      // Calculate totals
      const totalQuantity = selectedItems.reduce((sum, s) => sum + s.quantity, 0);

      // Determine the final department text
      const finalDepartment = requesterDepartment === 'Other' 
        ? customDepartment 
        : requesterDepartment;

      const success = await createRequest({
        department_id: departmentId,
        inventory_item_id: selectedItems.length === 1 ? selectedItems[0].item.id : null,
        requester_name: requesterName,
        requester_department_text: finalDepartment || null,
        item_description: itemDescriptions,
        quantity_requested: totalQuantity,
        previous_quantity: 0, // Not applicable for multi-item
        new_quantity: 0, // Not applicable for multi-item
        usage_purpose: usagePurpose,
        approved_by_id: approverId,
        approval_proof_url: imageUrl,
        notes: notes,
        requested_items: requestedItems, // Store all items as JSON
      });

      if (success) {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total items selected
  const totalItemsCount = selectedItems.length;
  const totalQuantity = selectedItems.reduce((sum, s) => sum + s.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Record Item Request
          </DialogTitle>
          <DialogDescription>
            Select one or more items for this request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Row 1: Requester Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="requester" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                Requester Name *
              </Label>
              <Input
                id="requester"
                placeholder="Enter name"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Requester Department</Label>
              <Select value={requesterDepartment} onValueChange={(val) => {
                setRequesterDepartment(val);
                if (val !== 'Other') setCustomDepartment('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {requesterDepartmentOptions}
                </SelectContent>
              </Select>
              {requesterDepartment === 'Other' && (
                <Input
                  placeholder="Enter department name..."
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>Usage / Purpose</Label>
              <Input
                placeholder="What will these items be used for?"
                value={usagePurpose}
                onChange={(e) => setUsagePurpose(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: Item Search and Approver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Item Search */}
            <div className="space-y-2 p-3 rounded-lg bg-teal-50 dark:bg-teal-950/40 border-2 border-teal-400 dark:border-teal-600" ref={itemSearchRef}>
              <Label className="flex items-center gap-1 text-teal-700 dark:text-teal-300 font-semibold text-base">
                <Package className="h-5 w-5" />
                Add Items *
              </Label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600" />
                <Input
                  placeholder="Search items by name..."
                  value={itemSearchQuery}
                  onChange={(e) => {
                    setItemSearchQuery(e.target.value);
                    setShowItemResults(true);
                  }}
                  onFocus={() => setShowItemResults(true)}
                  className="pl-9 border-teal-400 dark:border-teal-600 focus:border-teal-600 focus:ring-teal-500 bg-white dark:bg-slate-900"
                />
                
                {/* Search Results Dropdown */}
                {showItemResults && itemSearchQuery && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        No items found
                      </div>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-accent flex items-center justify-between gap-2 text-sm"
                          onClick={() => handleAddItem(item)}
                        >
                          <span className="truncate font-medium">
                            {item.item_name}
                          </span>
                          <span className={cn(
                            "text-xs px-1.5 py-0.5 rounded shrink-0",
                            item.quantity <= 0 ? 'bg-red-100 text-red-700' :
                            item.quantity <= 10 ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          )}>
                            Stock: {item.quantity}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Approver */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Approved By *
              </Label>
              <Select value={approverId} onValueChange={setApproverId}>
                <SelectTrigger>
                  <SelectValue placeholder={approversLoading ? "Loading..." : "Select approver"} />
                </SelectTrigger>
                <SelectContent>
                  {approverOptions}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected Items List */}
          {selectedItems.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-400 dark:border-blue-600">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Selected Items ({totalItemsCount})
                </Label>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                  Total Qty: {totalQuantity}
                </span>
              </div>
              <div className="border-2 border-blue-300 dark:border-blue-700 rounded-md divide-y divide-blue-200 dark:divide-blue-800 max-h-40 overflow-y-auto bg-white dark:bg-slate-900">
                {selectedItems.map((sel) => (
                  <div key={sel.item.id} className="p-2 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-blue-900 dark:text-blue-100">{sel.item.item_name}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Available: {sel.item.quantity} → Remaining: {sel.item.quantity - sel.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 border-blue-300 hover:bg-blue-100"
                        onClick={() => handleUpdateQuantity(sel.item.id, sel.quantity - 1)}
                        disabled={sel.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={sel.quantity}
                        onChange={(e) => handleUpdateQuantity(sel.item.id, parseInt(e.target.value) || 1)}
                        className="w-14 h-7 text-center text-sm"
                        min={1}
                        max={sel.item.quantity}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 border-blue-300 hover:bg-blue-100"
                        onClick={() => handleUpdateQuantity(sel.item.id, sel.quantity + 1)}
                        disabled={sel.quantity >= sel.item.quantity}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleRemoveItem(sel.item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 3: Photo Upload and Notes side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Approval Proof (Photo) *
              </Label>
              
              {proofImagePreview ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={proofImagePreview}
                    alt="Proof preview"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-20 flex-col gap-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs">Upload</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-20 flex-col gap-1"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs">Camera</span>
                </Button>
              </div>
            )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-[120px] resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || uploadingImage || selectedItems.length === 0}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingImage ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit ({totalItemsCount} items)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
