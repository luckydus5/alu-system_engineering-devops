import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Calendar, User, Clock, MessageSquare, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LeaveStatus } from '@/hooks/useLeaveRequests';

interface LeaveRequestDetailDialogProps {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isHR?: boolean;
}

const STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-600',
  manager_approved: 'bg-blue-500/20 text-blue-600',
  approved: 'bg-emerald-500/20 text-emerald-600',
  rejected: 'bg-red-500/20 text-red-600',
  cancelled: 'bg-muted text-muted-foreground',
};

export function LeaveRequestDetailDialog({ requestId, open, onOpenChange, isHR = false }: LeaveRequestDetailDialogProps) {
  const [comment, setComment] = useState('');
  const { leaveRequests, updateRequestStatus, cancelRequest } = useLeaveRequests(undefined, isHR);
  
  const request = leaveRequests.find(r => r.id === requestId);

  if (!request) return null;

  const canApprove = isHR && (request.status === 'pending' || request.status === 'manager_approved');
  const canCancel = !isHR && request.status === 'pending';
  const isManagerApproval = request.status === 'pending';

  const handleApprove = async () => {
    const newStatus: LeaveStatus = isManagerApproval ? 'manager_approved' : 'approved';
    await updateRequestStatus.mutateAsync({
      id: requestId,
      status: newStatus,
      comment: comment || undefined,
      isManager: isManagerApproval,
    });
    setComment('');
    onOpenChange(false);
  };

  const handleReject = async () => {
    await updateRequestStatus.mutateAsync({
      id: requestId,
      status: 'rejected',
      comment: comment || undefined,
      isManager: isManagerApproval,
    });
    setComment('');
    onOpenChange(false);
  };

  const handleCancel = async () => {
    await cancelRequest.mutateAsync(requestId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Leave Request Details
            <Badge className={STATUS_COLORS[request.status]}>
              {LEAVE_STATUS_LABELS[request.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Requester Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{request.requester?.full_name || 'Unknown'}</p>
              <p className="text-sm text-muted-foreground">{request.requester?.email}</p>
            </div>
          </div>

          {/* Leave Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Leave Type</p>
              <p className="font-medium">{LEAVE_TYPE_LABELS[request.leave_type]}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">{request.total_days} day(s)</p>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Date Range</p>
              <p className="font-medium">
                {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Reason
              </Label>
              <p className="p-3 rounded-lg bg-muted/50 text-sm">{request.reason}</p>
            </div>
          )}

          <Separator />

          {/* Approval History */}
          <div className="space-y-3">
            <Label>Approval History</Label>
            
            {request.manager_action_at && (
              <div className="p-3 rounded-lg border space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Manager Action:</span>
                  <span>{format(new Date(request.manager_action_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {request.manager_comment && (
                  <p className="text-sm pl-6">{request.manager_comment}</p>
                )}
              </div>
            )}

            {request.hr_action_at && (
              <div className="p-3 rounded-lg border space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">HR Action:</span>
                  <span>{format(new Date(request.hr_action_at), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {request.hr_comment && (
                  <p className="text-sm pl-6">{request.hr_comment}</p>
                )}
              </div>
            )}
          </div>

          {/* Comment Input for Approvers */}
          {canApprove && (
            <div className="space-y-2">
              <Label>Add Comment (Optional)</Label>
              <Textarea
                placeholder="Add a comment for the requester..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canCancel && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelRequest.isPending}
              className="w-full sm:w-auto"
            >
              {cancelRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cancel Request
            </Button>
          )}

          {canApprove && (
            <>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 w-full sm:w-auto"
                onClick={handleReject}
                disabled={updateRequestStatus.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                onClick={handleApprove}
                disabled={updateRequestStatus.isPending}
              >
                {updateRequestStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isManagerApproval ? 'Manager Approve' : 'HR Approve'}
              </Button>
            </>
          )}

          {!canApprove && !canCancel && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
