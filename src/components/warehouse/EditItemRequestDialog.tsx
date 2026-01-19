import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Save, X } from 'lucide-react';
import { ItemRequest, ItemRequestApprover } from '@/hooks/useItemRequests';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Department } from '@/hooks/useDepartments';

interface EditItemRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ItemRequest | null;
  approvers: ItemRequestApprover[];
  departments: Department[];
  onSuccess: () => void;
}

export function EditItemRequestDialog({
  open,
  onOpenChange,
  request,
  approvers,
  departments,
  onSuccess,
}: EditItemRequestDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  const [requesterName, setRequesterName] = useState('');
  const [requesterDepartmentId, setRequesterDepartmentId] = useState<string>('');
  const [requesterDepartmentText, setRequesterDepartmentText] = useState('');
  const [usagePurpose, setUsagePurpose] = useState('');
  const [approverId, setApproverId] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Populate form when request changes
  useEffect(() => {
    if (request) {
      setRequesterName(request.requester_name || '');
      setRequesterDepartmentId(request.requester_department_id || '');
      setRequesterDepartmentText(request.requester_department_text || '');
      setUsagePurpose(request.usage_purpose || '');
      setApproverId(request.approved_by_id || '');
      setNotes(request.notes || '');
    }
  }, [request]);

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

      const updateData: any = {
        requester_name: requesterName.trim(),
        requester_department_id: requesterDepartmentId || null,
        requester_department_text: requesterDepartmentText.trim() || null,
        usage_purpose: usagePurpose.trim() || null,
        approved_by_id: approverId,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('item_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item request updated successfully',
      });

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

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Save className="h-5 w-5" />
            Edit Item Request
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-4 space-y-4">
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
                <li>Items and quantities (would affect inventory)</li>
                <li>Approval proof image</li>
                <li>Request date</li>
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-muted/30 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
