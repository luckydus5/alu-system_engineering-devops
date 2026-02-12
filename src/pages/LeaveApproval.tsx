import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  CheckCircle2, XCircle, Clock, Loader2, ShieldAlert, 
  ArrowUpRight, Eye, CalendarDays, Users, FileText, Briefcase
} from 'lucide-react';
import { useCurrentUserApproverRoles, APPROVER_ROLE_LABELS, LeaveApproverRole } from '@/hooks/useLeaveApprovers';
import { useLeaveRequests, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, LeaveStatus, LeaveType } from '@/hooks/useLeaveRequests';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: 'text-amber-600 bg-amber-500/10',
  manager_approved: 'text-blue-600 bg-blue-500/10',
  gm_pending: 'text-indigo-600 bg-indigo-500/10',
  approved: 'text-emerald-600 bg-emerald-500/10',
  rejected: 'text-red-600 bg-red-500/10',
  cancelled: 'text-muted-foreground bg-muted',
};

export default function LeaveApproval() {
  const navigate = useNavigate();
  const { approverRoles, isPeatManager, isGMApprover, isOMApprover, isHRReviewer, isAnyApprover, isLoading: approverLoading } = useCurrentUserApproverRoles();
  const { highestRole } = useUserRole();
  const { leaveRequests, isLoading: leavesLoading, updateRequestStatus } = useLeaveRequests(undefined, true);

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  // Determine what requests this user can act on
  const actionableRequests = useMemo(() => {
    if (isPeatManager) {
      return leaveRequests.filter(r => r.status === 'pending');
    }
    if (isHRReviewer) {
      return leaveRequests.filter(r => r.status === 'manager_approved');
    }
    if (isGMApprover || isOMApprover) {
      return leaveRequests.filter(r => r.status === 'gm_pending');
    }
    return [];
  }, [leaveRequests, isPeatManager, isHRReviewer, isGMApprover, isOMApprover]);

  // All requests for reference
  const allRequests = useMemo(() => {
    return leaveRequests.filter(r => r.status !== 'cancelled').slice(0, 50);
  }, [leaveRequests]);

  const pendingCount = actionableRequests.length;
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    let newStatus: LeaveStatus;
    if (actionType === 'reject') {
      newStatus = 'rejected';
    } else if (isPeatManager) {
      newStatus = 'manager_approved';
    } else if (isHRReviewer) {
      newStatus = 'gm_pending';
    } else {
      newStatus = 'approved';
    }

    await updateRequestStatus.mutateAsync({
      id: selectedRequest.id,
      status: newStatus,
      comment: comment || undefined,
      isManager: isPeatManager,
      isHR: isHRReviewer,
    });

    setSelectedRequest(null);
    setActionType(null);
    setComment('');
  };

  const getRoleTitle = () => {
    if (isPeatManager) return 'Peat Manager';
    if (isHRReviewer) return 'HR Reviewer';
    if (isGMApprover) return 'General Manager';
    if (isOMApprover) return 'Operations Manager';
    return 'Leave Approver';
  };

  const getRoleIcon = () => {
    if (isPeatManager) return Briefcase;
    if (isGMApprover || isOMApprover) return Users;
    return FileText;
  };

  if (approverLoading || leavesLoading) {
    return (
      <DashboardLayout title="Leave Approval">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAnyApprover) {
    return (
      <DashboardLayout title="Access Denied">
        <Card className="shadow-corporate border-destructive/20">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-6">
              You are not assigned as a leave approver.<br />
              Contact your Super Admin to get access.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const RoleIcon = getRoleIcon();

  return (
    <DashboardLayout title={`${getRoleTitle()} - Leave Approval`}>
      <div className="space-y-6 animate-fade-in">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-blue-600/15 via-indigo-500/10 to-violet-500/5 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <RoleIcon className="h-6 w-6 text-blue-600" />
                <h1 className="text-2xl font-bold text-foreground tracking-tight">
                  {getRoleTitle()} Dashboard
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPeatManager && 'Review and approve leave requests before forwarding to HR'}
                {isHRReviewer && 'Review manager-approved requests and forward to GM for final approval'}
                {isGMApprover && 'Final approval for leave requests forwarded by HR'}
                {isOMApprover && 'Review and approve leave requests as Operations Manager'}
              </p>
              <div className="flex gap-2 mt-2">
                {approverRoles.map(role => (
                  <Badge key={role} variant="secondary" className="text-[10px]">
                    {APPROVER_ROLE_LABELS[role]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
          <Card className="shadow-corporate">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Awaiting Your Action</p>
            </CardContent>
          </Card>
          <Card className="shadow-corporate">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card className="shadow-corporate">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold">{allRequests.length}</p>
              <p className="text-xs text-muted-foreground">Total Requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests */}
        <Card className="shadow-corporate">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-amber-600" />
              Requests Awaiting Your Approval
              {pendingCount > 0 && (
                <Badge className="bg-amber-500/10 text-amber-600 text-xs ml-2">{pendingCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {actionableRequests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending requests — all caught up!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y">
                  {actionableRequests.map(req => (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">
                          {req.requester?.full_name || 'Employee'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {LEAVE_TYPE_LABELS[req.leave_type as LeaveType]} • {format(parseISO(req.start_date), 'MMM d')} - {format(parseISO(req.end_date), 'MMM d, yyyy')} • {req.total_days} days
                        </p>
                        {req.reason && (
                          <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{req.reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => { setSelectedRequest(req); setActionType('approve'); }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 text-red-600 hover:bg-red-50"
                          onClick={() => { setSelectedRequest(req); setActionType('reject'); }}
                        >
                          <XCircle className="h-4 w-4" />
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent All Requests */}
        <Card className="shadow-corporate">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-blue-600" />
              Recent Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[350px]">
              <div className="divide-y">
                {allRequests.slice(0, 20).map(req => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {req.requester?.full_name || 'Employee'} — {LEAVE_TYPE_LABELS[req.leave_type as LeaveType]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(req.start_date), 'MMM d')} - {format(parseISO(req.end_date), 'MMM d, yyyy')} • {req.total_days} days
                      </p>
                    </div>
                    <Badge className={cn('text-[10px] shrink-0', STATUS_COLORS[req.status as LeaveStatus])}>
                      {LEAVE_STATUS_LABELS[req.status as LeaveStatus]}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(v) => { if (!v) { setSelectedRequest(null); setActionType(null); setComment(''); }}}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/50 space-y-1">
                <p className="text-sm font-semibold">{selectedRequest.requester?.full_name || 'Employee'}</p>
                <p className="text-xs text-muted-foreground">
                  {LEAVE_TYPE_LABELS[selectedRequest.leave_type as LeaveType]} • {selectedRequest.total_days} days
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(selectedRequest.start_date), 'MMM d, yyyy')} → {format(parseISO(selectedRequest.end_date), 'MMM d, yyyy')}
                </p>
                {selectedRequest.reason && (
                  <p className="text-xs text-muted-foreground/80 italic mt-1">{selectedRequest.reason}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Comment (Optional)</label>
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={actionType === 'approve' ? 'Approved. Proceed to next stage.' : 'Reason for rejection...'}
                  rows={3}
                />
              </div>
              {actionType === 'approve' && isPeatManager && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">
                  <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />
                  This will be forwarded to HR for further review.
                </div>
              )}
              {actionType === 'approve' && isHRReviewer && (
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-xs text-indigo-700 dark:text-indigo-300">
                  <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />
                  This will be forwarded to GM/OM for final approval.
                </div>
              )}
              {actionType === 'approve' && (isGMApprover || isOMApprover) && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />
                  This will grant final approval to the leave request.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedRequest(null); setActionType(null); setComment(''); }}>Cancel</Button>
            <Button
              onClick={handleAction}
              disabled={updateRequestStatus.isPending}
              className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {updateRequestStatus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {actionType === 'approve' ? (isPeatManager ? 'Approve & Forward' : isHRReviewer ? 'Forward to GM' : 'Approve') : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
