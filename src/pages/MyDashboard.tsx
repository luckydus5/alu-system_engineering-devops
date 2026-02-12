import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle2, XCircle, Clock, Loader2, ShieldAlert,
  CalendarDays, FileText, Briefcase, Plus, ArrowRight,
  Leaf, Monitor, Shield, ClipboardList, ArrowUpRight, Download, Users
} from 'lucide-react';
import { useCurrentUserApproverRoles, APPROVER_ROLE_LABELS } from '@/hooks/useLeaveApprovers';
import { useCurrentUserLeavePermissions } from '@/hooks/useLeaveManagers';
import { useLeaveRequests, LEAVE_STATUS_LABELS, LEAVE_TYPE_LABELS, LeaveStatus, LeaveType, useLeaveBalances } from '@/hooks/useLeaveRequests';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useDepartments } from '@/hooks/useDepartments';
import { POSITION_LABELS, POSITION_COLORS } from '@/lib/systemPositions';
import { CreateLeaveRequestDialog } from '@/components/hr/CreateLeaveRequestDialog';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { generateLeaveApprovalPdf } from '@/lib/generateLeavePdf';
import { supabase } from '@/integrations/supabase/client';

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
  peat_admin: Leaf,
  hr_reviewer: FileText,
  gm_approver: Shield,
  om_approver: Briefcase,
  it_manager: Monitor,
  it_officer: Monitor,
};

export default function MyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, roles, highestRole } = useUserRole();
  const { approverRoles, isPeatManager, isGMApprover, isOMApprover, isHRReviewer, isAnyApprover, isLoading: approverLoading } = useCurrentUserApproverRoles();
  const { canFileForOthers, isLoading: permLoading } = useCurrentUserLeavePermissions();
  const { departments } = useDepartments();
  const primaryDeptId = roles[0]?.department_id;
  const { leaveRequests, isLoading: leavesLoading, updateRequestStatus } = useLeaveRequests(undefined, isAnyApprover);
  const { balances } = useLeaveBalances(user?.id);

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [myLeaveDialogOpen, setMyLeaveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Update default tab once async data loads
  useEffect(() => {
    if (!approverLoading && !permLoading) {
      if (canFileForOthers) setActiveTab('filed');
      else if (isAnyApprover) setActiveTab('approvals');
    }
  }, [approverLoading, permLoading, canFileForOthers, isAnyApprover]);

  const primaryPosition = approverRoles[0] || null;
  const positionLabel = primaryPosition ? POSITION_LABELS[primaryPosition] : null;
  const positionColor = primaryPosition ? POSITION_COLORS[primaryPosition] : null;

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';

  // My own leave requests
  const myRequests = leaveRequests.filter(r => r.requester_id === user?.id);

  // Approval-related data
  const actionableRequests = (() => {
    if (isPeatManager) return leaveRequests.filter(r => r.status === 'pending');
    if (isHRReviewer) return leaveRequests.filter(r => r.status === 'manager_approved');
    if (isGMApprover || isOMApprover) return leaveRequests.filter(r => r.status === 'gm_pending');
    return [];
  })();

  const filedByMe = canFileForOthers ? leaveRequests.filter(r => (r as any).submitted_by_id === user?.id && r.requester_id !== user?.id) : [];

  // Leave balance
  const annualBalance = (() => {
    const bal = balances.find(b => b.leave_type === 'annual');
    return bal ? { total: bal.total_days, used: bal.used_days, remaining: bal.total_days - bal.used_days } : { total: 18, used: 0, remaining: 18 };
  })();

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

  const handleDownloadPdf = async (request: any) => {
    const profileIds = [request.manager_id, request.hr_reviewer_id, (request as any).gm_reviewer_id].filter(Boolean);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', profileIds);
    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    generateLeaveApprovalPdf({
      employeeName: request.requester?.full_name || 'Unknown',
      department: request.department?.name || 'Unknown',
      leaveType: LEAVE_TYPE_LABELS[request.leave_type as LeaveType],
      startDate: format(parseISO(request.start_date), 'dd MMM yyyy'),
      endDate: format(parseISO(request.end_date), 'dd MMM yyyy'),
      totalDays: request.total_days,
      reason: request.reason,
      requestDate: format(parseISO(request.created_at), 'dd MMM yyyy'),
      managerName: request.manager_id ? profileMap.get(request.manager_id) || 'Manager' : null,
      managerDate: request.manager_action_at ? format(parseISO(request.manager_action_at), 'dd MMM yyyy') : null,
      managerComment: request.manager_comment,
      hrName: request.hr_reviewer_id ? profileMap.get(request.hr_reviewer_id) || 'HR' : null,
      hrDate: request.hr_action_at ? format(parseISO(request.hr_action_at), 'dd MMM yyyy') : null,
      hrComment: request.hr_comment,
      gmName: (request as any).gm_reviewer_id ? profileMap.get((request as any).gm_reviewer_id) || 'GM' : null,
      gmDate: (request as any).gm_action_at ? format(parseISO((request as any).gm_action_at), 'dd MMM yyyy') : null,
      gmComment: (request as any).gm_comment,
      status: request.status,
    });
  };

  if (approverLoading || permLoading) {
    return (
      <DashboardLayout title="Leave Management" noBackground>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  // Access denied for users with no position
  if (!isAnyApprover && !canFileForOthers) {
    return (
      <DashboardLayout title="Leave Management" noBackground>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="shadow-lg border-destructive/20 max-w-md w-full">
            <CardContent className="py-14 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
                <ShieldAlert className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Access Denied</h3>
              <p className="text-muted-foreground mb-6">
                No special position has been assigned to you.<br />
                Please contact your Super Admin to get a system position assigned.
              </p>
              <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
                <ArrowRight className="h-4 w-4 rotate-180" />
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const pendingCount = myRequests.filter(r => r.status === 'pending' || r.status === 'manager_approved' || r.status === 'gm_pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;

  return (
    <DashboardLayout title="Leave Management" noBackground>
      <div className="space-y-5 animate-fade-in">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-bold text-foreground">{profile?.full_name || 'User'}</h2>
              <div className="flex items-center gap-2">
                {positionLabel && positionColor && (
                  <Badge variant="outline" className={`text-[10px] font-semibold ${positionColor}`}>
                    {positionLabel}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] capitalize opacity-60">
                  {highestRole}
                </Badge>
              </div>
            </div>
          </div>
          {primaryDeptId && canFileForOthers ? (
            <div className="flex items-center gap-2">
              <Button onClick={() => setLeaveDialogOpen(true)} className="gap-2 shadow-sm">
                <Users className="h-4 w-4" />
                File for Employee
              </Button>
              <Button variant="outline" onClick={() => setMyLeaveDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                My Leave
              </Button>
            </div>
          ) : primaryDeptId ? (
            <Button onClick={() => setMyLeaveDialogOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              New Leave Request
            </Button>
          ) : null}
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CalendarDays className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{annualBalance.remaining}</p>
                <p className="text-[10px] text-muted-foreground">Days Left</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Clock className="h-4.5 w-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{approvedCount}</p>
                <p className="text-[10px] text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          {isAnyApprover && (
            <Card className="border border-destructive/20">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4.5 w-4.5 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold">{actionableRequests.length}</p>
                  <p className="text-[10px] text-muted-foreground">To Review</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 sm:grid-cols-3 h-11 bg-muted/60">
            {canFileForOthers && (
              <TabsTrigger value="filed" className="text-xs sm:text-sm gap-1.5">
                <Users className="h-3.5 w-3.5 hidden sm:block" />
                Filed for Others
              </TabsTrigger>
            )}
            {isAnyApprover && (
              <TabsTrigger value="approvals" className="text-xs sm:text-sm gap-1.5 relative">
                <ClipboardList className="h-3.5 w-3.5 hidden sm:block" />
                Approvals
                {actionableRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] text-destructive-foreground flex items-center justify-center font-bold">
                    {actionableRequests.length}
                  </span>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1.5">
              <FileText className="h-3.5 w-3.5 hidden sm:block" />
              My Leaves
            </TabsTrigger>
          </TabsList>



          {/* MY LEAVES TAB */}
          <TabsContent value="overview" className="mt-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">My Leave Requests</CardTitle>
                <Badge variant="secondary" className="text-[10px]">{myRequests.length} total</Badge>
              </CardHeader>
              <CardContent className="p-0">
                {myRequests.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No leave requests yet</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setLeaveDialogOpen(true)}>
                      <Plus className="h-3.5 w-3.5" /> Create one
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-[10px] font-bold uppercase w-[36px] text-center">#</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase">Type</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase">Start</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase">End</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-center">Days</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                          <TableHead className="text-[10px] font-bold uppercase text-center w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {myRequests.map((req, i) => (
                          <TableRow key={req.id} className="text-sm">
                            <TableCell className="text-center text-muted-foreground font-mono text-xs py-2">{i + 1}</TableCell>
                            <TableCell className="font-medium py-2">{LEAVE_TYPE_LABELS[req.leave_type as LeaveType]}</TableCell>
                            <TableCell className="font-mono text-xs py-2">{format(parseISO(req.start_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="font-mono text-xs py-2">{format(parseISO(req.end_date), 'dd MMM yyyy')}</TableCell>
                            <TableCell className="text-center font-semibold py-2">{req.total_days}</TableCell>
                            <TableCell className="py-2">
                              <Badge className={cn("text-[9px]", STATUS_COLORS[req.status as LeaveStatus])}>
                                {LEAVE_STATUS_LABELS[req.status as LeaveStatus]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center py-2">
                              {req.status === 'approved' ? (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadPdf(req)} title="Download PDF">
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* APPROVALS TAB */}
          {isAnyApprover && (
            <TabsContent value="approvals" className="mt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    Requests Awaiting Your Approval
                  </CardTitle>
                  {actionableRequests.length > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-600 text-xs">{actionableRequests.length}</Badge>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {actionableRequests.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">All caught up — no pending requests!</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="text-[10px] font-bold uppercase">#</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Employee</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Type</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Dates</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-center">Days</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Reason</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {actionableRequests.map((req, i) => (
                            <TableRow key={req.id} className="text-sm">
                              <TableCell className="text-muted-foreground font-mono text-xs py-2">{i + 1}</TableCell>
                              <TableCell className="font-medium py-2">{req.requester?.full_name || 'Employee'}</TableCell>
                              <TableCell className="py-2">{LEAVE_TYPE_LABELS[req.leave_type as LeaveType]}</TableCell>
                              <TableCell className="font-mono text-xs py-2">
                                {format(parseISO(req.start_date), 'dd MMM')} – {format(parseISO(req.end_date), 'dd MMM')}
                              </TableCell>
                              <TableCell className="text-center font-semibold py-2">{req.total_days}</TableCell>
                              <TableCell className="text-xs text-muted-foreground py-2 max-w-[120px] truncate">{req.reason || '—'}</TableCell>
                              <TableCell className="py-2">
                                <div className="flex items-center gap-1 justify-center">
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600 hover:bg-emerald-500/10"
                                    onClick={() => { setSelectedRequest(req); setActionType('approve'); }}>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:bg-destructive/10"
                                    onClick={() => { setSelectedRequest(req); setActionType('reject'); }}>
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}




          {/* FILED FOR OTHERS TAB */}
          {canFileForOthers && (
            <TabsContent value="filed" className="mt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Filed for Others</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{filedByMe.length} total</Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {filedByMe.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No requests filed for others yet</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="text-[10px] font-bold uppercase w-[36px] text-center">#</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Employee</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Type</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Dates</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase text-center">Days</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filedByMe.map((req, i) => (
                            <TableRow key={req.id} className="text-sm">
                              <TableCell className="text-center text-muted-foreground font-mono text-xs py-2">{i + 1}</TableCell>
                              <TableCell className="font-medium py-2">{req.requester?.full_name || 'Employee'}</TableCell>
                              <TableCell className="py-2">{LEAVE_TYPE_LABELS[req.leave_type as LeaveType]}</TableCell>
                              <TableCell className="font-mono text-xs py-2">
                                {format(parseISO(req.start_date), 'dd MMM')} – {format(parseISO(req.end_date), 'dd MMM yyyy')}
                              </TableCell>
                              <TableCell className="text-center font-semibold py-2">{req.total_days}</TableCell>
                              <TableCell className="py-2">
                                <Badge className={cn("text-[9px]", STATUS_COLORS[req.status as LeaveStatus])}>
                                  {LEAVE_STATUS_LABELS[req.status as LeaveStatus]}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(v) => { if (!v) { setSelectedRequest(null); setActionType(null); setComment(''); } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
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
              {actionType === 'approve' && isHRReviewer && (
                <div className="p-3 rounded-xl bg-indigo-500/10 text-xs text-indigo-700 dark:text-indigo-300">
                  <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />
                  This will be forwarded to GM/OM for final approval.
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
              className={actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-destructive hover:bg-destructive/90'}
            >
              {updateRequestStatus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {actionType === 'approve' ? (isPeatManager ? 'Approve & Forward' : isHRReviewer ? 'Approve & Forward to GM' : 'Approve') : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File for Employee Dialog (on-behalf default ON) */}
      {primaryDeptId && (
        <CreateLeaveRequestDialog
          open={leaveDialogOpen}
          onOpenChange={setLeaveDialogOpen}
          departmentId={primaryDeptId}
          defaultOnBehalf={true}
        />
      )}

      {/* My Own Leave Dialog */}
      {primaryDeptId && (
        <CreateLeaveRequestDialog
          open={myLeaveDialogOpen}
          onOpenChange={setMyLeaveDialogOpen}
          departmentId={primaryDeptId}
        />
      )}
    </DashboardLayout>
  );
}
