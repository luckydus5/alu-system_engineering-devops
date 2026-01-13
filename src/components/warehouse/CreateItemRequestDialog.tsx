import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { useItemRequests, useItemRequestApprovers } from '@/hooks/useItemRequests';
import { useInventory } from '@/hooks/useInventory';
import { useDepartments } from '@/hooks/useDepartments';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateItemRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  onSuccess?: () => void;
}

export function CreateItemRequestDialog({
  open,
  onOpenChange,
  departmentId,
  onSuccess,
}: CreateItemRequestDialogProps) {
  const { toast } = useToast();
  const { createRequest } = useItemRequests(departmentId);
  const { approvers, loading: approversLoading } = useItemRequestApprovers();
  const { items } = useInventory(departmentId);
  const { departments } = useDepartments();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form fields
  const [requesterName, setRequesterName] = useState('');
  const [requesterDepartmentId, setRequesterDepartmentId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [itemDescription, setItemDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [usagePurpose, setUsagePurpose] = useState('');
  const [approverId, setApproverId] = useState<string>('');
  const [notes, setNotes] = useState('');
  
  // Image upload
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Get selected item details
  const selectedItem = items.find(i => i.id === selectedItemId);
  const previousQuantity = selectedItem?.quantity || 0;
  const newQuantity = previousQuantity - quantity;

  // Update item description when item is selected
  useEffect(() => {
    if (selectedItem) {
      setItemDescription(`${selectedItem.item_number} - ${selectedItem.item_name}`);
    }
  }, [selectedItem]);

  const resetForm = () => {
    setRequesterName('');
    setRequesterDepartmentId('');
    setSelectedItemId('');
    setItemDescription('');
    setQuantity(1);
    setUsagePurpose('');
    setApproverId('');
    setNotes('');
    setProofImage(null);
    setProofImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setProofImage(null);
    setProofImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

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
    if (!itemDescription.trim()) {
      toast({ title: 'Error', description: 'Please enter item description', variant: 'destructive' });
      return;
    }
    if (quantity < 1) {
      toast({ title: 'Error', description: 'Quantity must be at least 1', variant: 'destructive' });
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
    if (selectedItem && quantity > selectedItem.quantity) {
      toast({ title: 'Error', description: 'Quantity exceeds available stock', variant: 'destructive' });
      return;
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

      const success = await createRequest({
        department_id: departmentId,
        inventory_item_id: selectedItemId || null,
        requester_name: requesterName,
        requester_department_id: requesterDepartmentId || null,
        item_description: itemDescription,
        quantity_requested: quantity,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        usage_purpose: usagePurpose,
        approved_by_id: approverId,
        approval_proof_url: imageUrl,
        notes: notes,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            Record Item Request
          </DialogTitle>
          <DialogDescription>
            Record an approved item request with proof documentation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Requester Info */}
          <div className="grid grid-cols-2 gap-3">
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
              <Select value={requesterDepartmentId} onValueChange={setRequesterDepartmentId}>
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
            </div>
          </div>

          {/* Item Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              Select Item (Optional)
            </Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select from inventory" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_number} - {item.item_name} (Stock: {item.quantity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Item Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Item Description *</Label>
            <Input
              id="description"
              placeholder="Enter item description"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
            />
          </div>

          {/* Quantity and Stock Info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={selectedItem?.quantity || 9999}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={cn(selectedItem && quantity > selectedItem.quantity && 'border-red-500')}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Previous Qty</Label>
              <div className="h-10 flex items-center justify-center bg-muted rounded-md font-mono">
                {previousQuantity}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Remaining (RE-QTY)</Label>
              <div className={cn(
                'h-10 flex items-center justify-center rounded-md font-mono font-bold',
                newQuantity <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                newQuantity < 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
              )}>
                {newQuantity}
              </div>
            </div>
          </div>

          {/* Usage Purpose */}
          <div className="space-y-2">
            <Label htmlFor="usage">Usage / Purpose</Label>
            <Input
              id="usage"
              placeholder="What will this item be used for?"
              value={usagePurpose}
              onChange={(e) => setUsagePurpose(e.target.value)}
            />
          </div>

          {/* Approver Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Approved By *
            </Label>
            <Select value={approverId} onValueChange={setApproverId} disabled={approversLoading}>
              <SelectTrigger>
                <SelectValue placeholder={approversLoading ? 'Loading...' : 'Select approver'} />
              </SelectTrigger>
              <SelectContent>
                {approvers.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No approvers configured. Contact super admin.
                  </div>
                ) : (
                  approvers.map((approver) => (
                    <SelectItem key={approver.id} value={approver.id}>
                      {approver.full_name}
                      {approver.position && ` - ${approver.position}`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

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
                  className="w-full h-48 object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
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
                  className="flex-1 h-24 flex-col gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs">Upload Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-24 flex-col gap-2"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs">Take Photo</span>
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Upload the signed approval document as proof
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || uploadingImage}
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
                Submit Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
