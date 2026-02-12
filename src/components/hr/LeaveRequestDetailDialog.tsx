import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, User, Clock, MessageSquare, Check, X, Loader2,
  Plane, Thermometer, Baby, Heart, Ban, ArrowRight, Building, Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LeaveStatus, LeaveType } from '@/hooks/useLeaveRequests';
import { cn } from '@/lib/utils';
import { generateLeaveApprovalPdf } from '@/lib/generateLeavePdf';
import { supabase } from '@/integrations/supabase/client';

interface LeaveRequestDetailDialogProps {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isHR?: boolean;
}

const STATUS_STYLES: Record<LeaveStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600' },
  manager_approved: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
  gm_pending: { bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-600' },
  cancelled: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

const LEAVE_ICONS: Record<LeaveType, React.ElementType> = {
  annual: Plane,
  sick: Thermometer,
  personal: User,
  maternity: Baby,
  paternity: Baby,
  bereavement: Heart,
  unpaid: Ban,
};

const LEAVE_COLORS: Record<LeaveType, string> = {
  annual: 'bg-blue-500/20 text-blue-600',
  sick: 'bg-red-500/20 text-red-600',
  personal: 'bg-purple-500/20 text-purple-600',
  maternity: 'bg-pink-500/20 text-pink-600',
  paternity: 'bg-cyan-500/20 text-cyan-600',
  bereavement: 'bg-slate-500/20 text-slate-600',
  unpaid: 'bg-amber-500/20 text-amber-600',
};

export function LeaveRequestDetailDialog({ requestId, open, onOpenChange, isHR = false }: LeaveRequestDetailDialogProps) {
  const [comment, setComment] = useState('');
  const { leaveRequests, updateRequestStatus, cancelRequest } = useLeaveRequests(undefined, isHR);
  
  const request = leaveRequests.find(r => r.id === requestId);

  if (!request) return null;

  const LeaveIcon = LEAVE_ICONS[request.leave_type];
  const canApprove = isHR && (request.status === 'pending' || request.status === 'manager_approved' || request.status === 'gm_pending');
  const canCancel = !isHR && request.status === 'pending';
  const isManagerApproval = request.status === 'pending';
  const isHRForward = request.status === 'manager_approved';
  const isGMApproval = request.status === 'gm_pending';
  const statusStyle = STATUS_STYLES[request.status];

  const handleApprove = async () => {
    let newStatus: LeaveStatus;
    if (isManagerApproval) {
      newStatus = 'manager_approved';
    } else if (isHRForward) {
      newStatus = 'gm_pending';
    } else {
      newStatus = 'approved';
    }
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

  const getInitials = (name: string | null | undefined, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl">Leave Request Details</DialogTitle>
            <Badge className={cn("border-0 shrink-0", statusStyle.bg, statusStyle.text)}>
              {LEAVE_STATUS_LABELS[request.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Requester Card */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
            <Avatar className="h-14 w-14 border-2 border-background shadow">
              <AvatarFallback className={cn("font-semibold text-lg", LEAVE_COLORS[request.leave_type])}>
                {getInitials(request.requester?.full_name, request.requester?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-lg">{request.requester?.full_name || 'Unknown User'}</p>
              <p className="text-sm text-muted-foreground">{request.requester?.email}</p>
              {request.department && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <Building className="h-3.5 w-3.5" />
                  {request.department.name}
                </div>
              )}
            </div>
          </div>

          {/* Leave Type & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border bg-card">
              <p className="text-sm text-muted-foreground mb-2">Leave Type</p>
              <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium", LEAVE_COLORS[request.leave_type])}>
                <LeaveIcon className="h-4 w-4" />
                {LEAVE_TYPE_LABELS[request.leave_type]}
              </div>
            </div>
            <div className="p-4 rounded-xl border bg-card">
              <p className="text-sm text-muted-foreground mb-2">Duration</p>
              <p className="text-2xl font-bold">{request.total_days}</p>
              <p className="text-sm text-muted-foreground">day{request.total_days > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Date Range */}
          <div className="p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Calendar className="h-4 w-4" />
              Date Range
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <p className="font-semibold">{format(new Date(request.start_date), 'MMM d, yyyy')}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <p className="font-semibold">{format(new Date(request.end_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>

          {/* Reason */}
          {request.reason && (
            <div className="p-4 rounded-xl border bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MessageSquare className="h-4 w-4" />
                Reason
              </div>
              <p className="text-foreground">{request.reason}</p>
            </div>
          )}

          <Separator />

          {/* Approval Timeline */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Approval Timeline</Label>
            
            <div className="relative pl-6 space-y-4">
              {/* Submitted */}
              <div className="relative">
                <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-primary" />
                <div className="absolute -left-[18px] top-4 bottom-0 w-0.5 bg-border" />
                <div className="p-3 rounded-lg border bg-card">
                  <p className="text-sm font-medium">Request Submitted</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>

              {/* Manager Action */}
              {request.manager_action_at && (
                <div className="relative">
                  <div className={cn(
                    "absolute -left-6 top-1 h-3 w-3 rounded-full",
                    request.status === 'rejected' ? 'bg-red-500' : 'bg-blue-500'
                  )} />
                  <div className="absolute -left-[18px] top-4 bottom-0 w-0.5 bg-border" />
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-sm font-medium">Manager Review</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.manager_action_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.manager_comment && (
                      <p className="text-sm mt-2 text-muted-foreground italic">
                        "{request.manager_comment}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* HR Action */}
              {request.hr_action_at && (
                <div className="relative">
                  <div className={cn(
                    "absolute -left-6 top-1 h-3 w-3 rounded-full",
                    request.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                  )} />
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-sm font-medium">HR Final Review</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.hr_action_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {request.hr_comment && (
                      <p className="text-sm mt-2 text-muted-foreground italic">
                        "{request.hr_comment}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* GM Action */}
              {(request as any).gm_action_at && (
                <div className="relative">
                  <div className={cn(
                    "absolute -left-6 top-1 h-3 w-3 rounded-full",
                    request.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                  )} />
                  <div className="absolute -left-[18px] top-4 bottom-0 w-0.5 bg-border" />
                  <div className="p-3 rounded-lg border bg-card">
                    <p className="text-sm font-medium">General Manager Review</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date((request as any).gm_action_at), 'MMM d, yyyy h:mm a')}
                    </p>
                    {(request as any).gm_comment && (
                      <p className="text-sm mt-2 text-muted-foreground italic">
                        "{(request as any).gm_comment}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Pending indicator */}
              {(request.status === 'pending' || request.status === 'manager_approved' || request.status === 'gm_pending') && (
                <div className="relative">
                  <div className="absolute -left-6 top-1 h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <p className="text-sm font-medium text-amber-600">
                      {request.status === 'pending' ? 'Awaiting Department Manager' : 
                       request.status === 'manager_approved' ? 'Awaiting HR to Forward to GM' :
                       'Awaiting General Manager Approval'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comment Input for Approvers */}
          {canApprove && (
            <div className="space-y-2">
              <Label>Add Comment (Optional)</Label>
              <Textarea
                placeholder="Add a comment for the requester..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
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
                className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
                onClick={handleApprove}
                disabled={updateRequestStatus.isPending}
              >
                {updateRequestStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {isManagerApproval ? 'Manager Approve' : isHRForward ? 'Forward to GM' : 'GM Approve'}
              </Button>
            </>
          )}

          {request.status === 'approved' && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={async () => {
                const profileIds = [request.manager_id, request.hr_reviewer_id, (request as any).gm_reviewer_id].filter(Boolean);
                const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
                const pm = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
                generateLeaveApprovalPdf({
                  employeeName: request.requester?.full_name || 'Unknown',
                  department: request.department?.name || '',
                  leaveType: LEAVE_TYPE_LABELS[request.leave_type],
                  startDate: format(parseISO(request.start_date), 'dd MMM yyyy'),
                  endDate: format(parseISO(request.end_date), 'dd MMM yyyy'),
                  totalDays: request.total_days,
                  reason: request.reason,
                  requestDate: format(parseISO(request.created_at), 'dd MMM yyyy'),
                  managerName: request.manager_id ? pm.get(request.manager_id) || 'Manager' : null,
                  managerDate: request.manager_action_at ? format(parseISO(request.manager_action_at), 'dd MMM yyyy') : null,
                  managerComment: request.manager_comment,
                  hrName: request.hr_reviewer_id ? pm.get(request.hr_reviewer_id) || 'HR' : null,
                  hrDate: request.hr_action_at ? format(parseISO(request.hr_action_at), 'dd MMM yyyy') : null,
                  hrComment: request.hr_comment,
                  gmName: (request as any).gm_reviewer_id ? pm.get((request as any).gm_reviewer_id) || 'GM' : null,
                  gmDate: (request as any).gm_action_at ? format(parseISO((request as any).gm_action_at), 'dd MMM yyyy') : null,
                  gmComment: (request as any).gm_comment,
                  status: request.status,
                });
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}

          {!canApprove && !canCancel && request.status !== 'approved' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
