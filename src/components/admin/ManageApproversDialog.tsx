import { useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  UserCheck,
  Plus,
  Trash2,
  Loader2,
  Users,
  Briefcase,
} from 'lucide-react';
import { useItemRequestApprovers, ItemRequestApprover } from '@/hooks/useItemRequests';
import { format } from 'date-fns';

interface ManageApproversDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageApproversDialog({ open, onOpenChange }: ManageApproversDialogProps) {
  const { approvers, loading, createApprover, deleteApprover, refetch } = useItemRequestApprovers();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [approverToDelete, setApproverToDelete] = useState<ItemRequestApprover | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    
    setIsSubmitting(true);
    const success = await createApprover({
      full_name: newName.trim(),
      position: newPosition.trim() || undefined,
    });
    
    if (success) {
      setNewName('');
      setNewPosition('');
      setIsAdding(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!approverToDelete) return;
    
    await deleteApprover(approverToDelete.id);
    setDeleteConfirmOpen(false);
    setApproverToDelete(null);
  };

  const openDeleteConfirm = (approver: ItemRequestApprover) => {
    setApproverToDelete(approver);
    setDeleteConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              Manage Item Request Approvers
            </DialogTitle>
            <DialogDescription>
              Add or remove people who can approve warehouse item requests
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Approver */}
            {isAdding ? (
              <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Plus className="h-4 w-4" />
                  Add New Approver
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter full name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="position" className="text-xs">Position</Label>
                    <Input
                      id="position"
                      placeholder="e.g., Manager"
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAdding(false);
                      setNewName('');
                      setNewPosition('');
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={isSubmitting || !newName.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Add Approver'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4" />
                Add New Approver
              </Button>
            )}

            {/* Approvers List */}
            <div className="border rounded-lg">
              <div className="px-3 py-2 bg-muted/50 border-b flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Active Approvers ({approvers.length})</span>
              </div>
              
              <ScrollArea className="h-[250px]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : approvers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No approvers configured</p>
                    <p className="text-xs">Add approvers who can sign item requests</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead className="w-[60px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvers.map((approver) => (
                        <TableRow key={approver.id}>
                          <TableCell className="font-medium">
                            {approver.full_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {approver.position || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => openDeleteConfirm(approver)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Approver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{approverToDelete?.full_name}</strong> from the list of approvers?
              <br /><br />
              They will no longer appear in the approver selection for new item requests. Existing records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
