import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2, XCircle, Clock, Loader2, ShieldAlert,
  ArrowUpRight, CalendarDays, Users, FileText, Briefcase,
  Building2, Plus, ArrowRight, Leaf, Monitor, Shield
} from 'lucide-react';
import { useCurrentUserApproverRoles, APPROVER_ROLE_LABELS } from '@/hooks/useLeaveApprovers';
import { useCurrentUserLeavePermissions } from '@/hooks/useLeaveManagers';
import { useLeaveRequests, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, LeaveStatus, LeaveType } from '@/hooks/useLeaveRequests';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useDepartments } from '@/hooks/useDepartments';
import { POSITION_LABELS, POSITION_COLORS } from '@/lib/systemPositions';
import { EmployeeLeaveDashboard } from '@/components/hr/EmployeeLeaveDashboard';
import { CreateLeaveRequestDialog } from '@/components/hr/CreateLeaveRequestDialog';
import { getDepartmentIcon } from '@/lib/departmentIcons';
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

const POSITION_ICONS: Record<string, React.ElementType> = {
  peat_manager: Leaf,
  hr_reviewer: FileText,
  gm_approver: Shield,
  om_approver: Briefcase,
  it_manager: Monitor,
  it_officer: Monitor,
};

const POSITION_GRADIENTS: Record<string, string> = {
  peat_manager: 'from-emerald-600/15 via-green-500/10 to-lime-500/5',
  hr_reviewer: 'from-blue-600/15 via-sky-500/10 to-cyan-500/5',
  gm_approver: 'from-emerald-600/15 via-teal-500/10 to-green-500/5',
  om_approver: 'from-purple-600/15 via-violet-500/10 to-indigo-500/5',
  it_manager: 'from-rose-600/15 via-pink-500/10 to-red-500/5',
  it_officer: 'from-cyan-600/15 via-sky-500/10 to-blue-500/5',
};

const POSITION_ACCENT: Record<string, string> = {
  peat_manager: 'text-emerald-600',
  hr_reviewer: 'text-blue-600',
  gm_approver: 'text-emerald-700',
  om_approver: 'text-purple-600',
  it_manager: 'text-rose-600',
  it_officer: 'text-cyan-600',
};

export default function MyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, roles, highestRole, grantedDepartmentIds } = useUserRole();
  const { approverRoles, isPeatManager, isGMApprover, isOMApprover, isAnyApprover, isLoading: approverLoading } = useCurrentUserApproverRoles();
  const { canFileForOthers, isLoading: permLoading } = useCurrentUserLeavePermissions();
  const { departments } = useDepartments();
  const primaryDeptId = roles[0]?.department_id;
  const { leaveRequests, isLoading: leavesLoading, updateRequestStatus } = useLeaveRequests(undefined, isAnyApprover);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  // Determine the user's primary position
  const primaryPosition = approverRoles[0] || null;
  const positionLabel = primaryPosition ? POSITION_LABELS[primaryPosition] : null;
  const positionColor = primaryPosition ? POSITION_COLORS[primaryPosition] : null;
  const PositionIcon = primaryPosition ? (POSITION_ICONS[primaryPosition] || Briefcase) : Briefcase;
  const positionGradient = primaryPosition ? (POSITION_GRADIENTS[primaryPosition] || POSITION_GRADIENTS.peat_manager) : POSITION_GRADIENTS.peat_manager;
  const positionAccent = primaryPosition ? (POSITION_ACCENT[primaryPosition] || 'text-primary') : 'text-primary';

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  // Departments user has access to
  const grantedDepts = departments.filter(d => grantedDepartmentIds.includes(d.id) && d.id !== primaryDeptId);
  const primaryDept = departments.find(d => d.id === primaryDeptId);
  const allDepts = [primaryDept, ...grantedDepts].filter(Boolean);

  // Approval-related data
  const actionableRequests = (() => {
    if (isPeatManager) return leaveRequests.filter(r => r.status === 'pending');
    if (isGMApprover || isOMApprover) return leaveRequests.filter(r => r.status === 'gm_pending');
    return [];
  })();

  const filedByMe = canFileForOthers ? leaveRequests.filter(r => (r as any).submitted_by_id === user?.id && r.requester_id !== user?.id) : [];
  const approvedCount = leaveRequests.filter(r => r.status === 'approved').length;

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    let newStatus: LeaveStatus;
    if (actionType === 'reject') {
      newStatus = 'rejected';
    } else if (isPeatManager) {
      newStatus = 'manager_approved';
    } else {
      newStatus = 'approved';
    }
    await updateRequestStatus.mutateAsync({
      id: selectedRequest.id,
      status: newStatus,
      comment: comment || undefined,
      isManager: isPeatManager,
    });
    setSelectedRequest(null);
    setActionType(null);
    setComment('');
  };

  if (approverLoading || permLoading) {
    return (
      <DashboardLayout title="My Dashboard">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // If user has no position, show a friendly message
  if (!isAnyApprover && !canFileForOthers) {
    return (
      <DashboardLayout title="My Dashboard">
        <Card className="shadow-corporate border-muted">
          <CardContent className="py-12 text-center">
            <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Special Position Assigned</h3>
            <p className="text-muted-foreground mb-6">
              You don't have a system position yet.<br />
              Contact your Super Admin to get assigned.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={positionLabel || 'My Dashboard'}>
      <div className="space-y-6 animate-fade-in">
        {/* Hero Header with Position Identity */}
        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${positionGradient} p-5 sm:p-6`}>
          <div className="absolute top-3 right-3 opacity-10">
            <PositionIcon className="h-20 w-20 sm:h-24 sm:w-24" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-background text-foreground text-lg font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                  {profile?.full_name || 'User'}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {positionLabel && positionColor && (
                    <Badge variant="outline" className={`text-xs font-semibold ${positionColor}`}>
                      {positionLabel}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize opacity-70">
                    {highestRole}
                  </Badge>
                </div>
              </div>
            </div>
            {canFileForOthers && primaryDeptId && (
              <Button
                onClick={() => setLeaveDialogOpen(true)}
                className={`gap-2 rounded-xl shadow-md`}
                size="lg"
              >
                <Plus className="h-5 w-5" />
                File Leave Request
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {isAnyApprover && (
            <Card className="shadow-sm border">
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-2xl font-bold">{actionableRequests.length}</p>
                <p className="text-[11px] text-muted-foreground">Awaiting Action</p>
              </CardContent>
            </Card>
          )}
          <Card className="shadow-sm border">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-[11px] text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          {canFileForOthers && (
            <Card className="shadow-sm border">
              <CardContent className="p-4 text-center">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{filedByMe.length}</p>
                <p className="text-[11px] text-muted-foreground">Filed for Others</p>
              </CardContent>
            </Card>
          )}
          <Card className="shadow-sm border">
            <CardContent className="p-4 text-center">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mx-auto mb-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
              </div>
              <p className="text-2xl font-bold">{allDepts.length}</p>
              <p className="text-[11px] text-muted-foreground">Departments</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Requests for Approvers */}
        {isAnyApprover && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className={`h-5 w-5 ${positionAccent}`} />
                Requests Awaiting Your Approval
                {actionableRequests.length > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 text-xs ml-2">{actionableRequests.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {actionableRequests.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
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
                            className="h-8 gap-1 text-emerald-600 hover:bg-emerald-500/10"
                            onClick={() => { setSelectedRequest(req); setActionType('approve'); }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-red-600 hover:bg-red-500/10"
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
        )}

        {/* My Leave Dashboard */}
        {primaryDeptId && (
          <EmployeeLeaveDashboard departmentId={primaryDeptId} />
        )}

        {/* Departments Access */}
        {allDepts.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className={`h-5 w-5 ${positionAccent}`} />
                Your Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allDepts.map(dept => {
                  if (!dept) return null;
                  const Icon = getDepartmentIcon(dept.code);
                  const isPrimary = dept.id === primaryDeptId;
                  return (
                    <Link key={dept.id} to={`/department/${dept.code.toLowerCase()}`} className="group">
                      <Card className="transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors bg-primary/10 group-hover:bg-primary/20`}>
                            <Icon className={`h-6 w-6 ${positionAccent}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{dept.name}</p>
                            <Badge variant={isPrimary ? 'default' : 'secondary'} className="text-[10px] mt-1">
                              {isPrimary ? 'Primary' : 'Granted Access'}
                            </Badge>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Filed for Others */}
        {canFileForOthers && filedByMe.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className={`h-5 w-5 ${positionAccent}`} />
                Recently Filed for Others
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filedByMe.slice(0, 10).map(req => (
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(v) => { if (!v) { setSelectedRequest(null); setActionType(null); setComment(''); } }}>
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
                <div className="p-3 rounded-xl bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300">
                  <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />
                  This will be forwarded to HR for further review.
                </div>
              )}
              {actionType === 'approve' && (isGMApprover || isOMApprover) && (
                <div className="p-3 rounded-xl bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-300">
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
              {actionType === 'approve' ? (isPeatManager ? 'Approve & Forward' : 'Approve') : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      {canFileForOthers && primaryDeptId && (
        <CreateLeaveRequestDialog
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          departmentId={primaryDeptId}
        />
      )}
    </DashboardLayout>
  );
}
