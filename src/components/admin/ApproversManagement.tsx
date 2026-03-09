import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Trash2,
  UserCheck,
  Loader2,
  RefreshCw,
  User,
  Briefcase,
} from 'lucide-react';
import { useItemRequestApprovers, ItemRequestApprover } from '@/hooks/useItemRequests';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function ApproversManagement() {
  const { approvers, loading, createApprover, deleteApprover, refetch } = useItemRequestApprovers();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState<ItemRequestApprover | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');

  const handleAddApprover = async () => {
    if (!fullName.trim()) return;
    
    setIsSubmitting(true);
    const success = await createApprover({
      full_name: fullName.trim(),
      position: position.trim() || undefined,
    });
    
    if (success) {
      setAddDialogOpen(false);
      setFullName('');
      setPosition('');
    }
    setIsSubmitting(false);
  };

  const handleDeleteApprover = async () => {
    if (!selectedApprover) return;
    
    setIsSubmitting(true);
    await deleteApprover(selectedApprover.id);
    setDeleteDialogOpen(false);
    setSelectedApprover(null);
    setIsSubmitting(false);
  };

  const openDeleteDialog = (approver: ItemRequestApprover) => {
    setSelectedApprover(approver);
    setDeleteDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-emerald-500" />
            Item Request Approvers
          </CardTitle>
          <CardDescription>
            Manage authorized personnel who can approve warehouse item requests
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refetch} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Approver
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : approvers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No approvers configured</p>
            <p className="text-sm">Add approvers to enable item request workflow</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setAddDialogOpen(true)}
            >
              Add First Approver
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Added On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvers.map((approver) => (
                <TableRow key={approver.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{approver.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {approver.position ? (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        {approver.position}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(approver.created_at), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={approver.is_active ? 'default' : 'secondary'}>
                      {approver.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(approver)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Approver Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              Add New Approver
            </DialogTitle>
            <DialogDescription>
              Add a person who is authorized to approve warehouse item requests.
              Their name will appear in the approval dropdown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position (Optional)</Label>
              <Input
                id="position"
                placeholder="e.g., Warehouse Manager, Director"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddApprover} 
              disabled={!fullName.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Approver'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Approver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedApprover?.full_name}</strong> as an approver?
              They will no longer appear in the approval dropdown for item requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApprover}
              className="bg-red-500 hover:bg-red-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
