import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CalendarDays, Clock, Download, Timer, CheckCircle2, 
  XCircle, AlertCircle, Palmtree, Thermometer, User, Baby, Heart, Ban
} from 'lucide-react';
import { format, differenceInDays, parseISO, isWithinInterval } from 'date-fns';
import { useLeaveRequests, useLeaveBalances, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LeaveType, LeaveStatus } from '@/hooks/useLeaveRequests';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { generateLeaveApprovalPdf } from '@/lib/generateLeavePdf';
import { supabase } from '@/integrations/supabase/client';
import { LeaveWorkflowProgress } from './LeaveWorkflowProgress';

const LEAVE_ICONS: Record<LeaveType, React.ElementType> = {
  annual: Palmtree,
  sick: Thermometer,
  personal: User,
  maternity: Baby,
  paternity: Baby,
  bereavement: Heart,
  unpaid: Ban,
};

const LEAVE_COLORS: Record<LeaveType, string> = {
  annual: 'text-emerald-600 bg-emerald-500/10',
  sick: 'text-red-600 bg-red-500/10',
  personal: 'text-blue-600 bg-blue-500/10',
  maternity: 'text-pink-600 bg-pink-500/10',
  paternity: 'text-cyan-600 bg-cyan-500/10',
  bereavement: 'text-slate-600 bg-slate-500/10',
  unpaid: 'text-amber-600 bg-amber-500/10',
};

const STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: 'text-amber-600 bg-amber-500/10',
  hr_approved: 'text-cyan-600 bg-cyan-500/10',
  manager_approved: 'text-blue-600 bg-blue-500/10',
  gm_pending: 'text-indigo-600 bg-indigo-500/10',
  approved: 'text-emerald-600 bg-emerald-500/10',
  rejected: 'text-red-600 bg-red-500/10',
  cancelled: 'text-muted-foreground bg-muted',
};

export function EmployeeLeaveDashboard({ departmentId }: { departmentId: string }) {
  const { user } = useAuth();
  const { leaveRequests, isLoading } = useLeaveRequests(departmentId);
  const { balances } = useLeaveBalances(user?.id);

  // Filter to current user's requests
  const myRequests = useMemo(() => 
    leaveRequests.filter(r => r.requester_id === user?.id).slice(0, 20),
    [leaveRequests, user?.id]
  );

  const today = new Date();

  // Active leave (currently on leave)
  const activeLeave = useMemo(() => 
    myRequests.find(r => {
      if (r.status !== 'approved') return false;
      try {
        return isWithinInterval(today, { start: parseISO(r.start_date), end: parseISO(r.end_date) });
      } catch { return false; }
    }),
    [myRequests, today]
  );

  const activeCountdown = useMemo(() => {
    if (!activeLeave) return null;
    const endDate = parseISO(activeLeave.end_date);
    const daysRemaining = Math.max(0, differenceInDays(endDate, today));
    const totalDays = activeLeave.total_days;
    const daysElapsed = Math.max(0, differenceInDays(today, parseISO(activeLeave.start_date)) + 1);
    return { daysRemaining, totalDays, daysElapsed, endDate };
  }, [activeLeave, today]);

  // Annual leave balance
  const annualBalance = useMemo(() => {
    const bal = balances.find(b => b.leave_type === 'annual');
    return bal ? { total: bal.total_days, used: bal.used_days, remaining: bal.total_days - bal.used_days } : { total: 18, used: 0, remaining: 18 };
  }, [balances]);

  const handleDownloadPdf = async (request: any) => {
    // Fetch approver profiles
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

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      {/* Active Leave Countdown */}
      {activeLeave && activeCountdown && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Timer className="h-7 w-7 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">You're Currently on {LEAVE_TYPE_LABELS[activeLeave.leave_type as LeaveType]}</h3>
                <p className="text-sm text-muted-foreground">
                  Return date: <strong>{format(activeCountdown.endDate, 'EEEE, MMMM d, yyyy')}</strong>
                </p>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <span className="text-3xl font-bold text-amber-600">{activeCountdown.daysRemaining}</span>
                    <span className="text-sm text-muted-foreground ml-1">days remaining</span>
                  </div>
                  <Progress 
                    value={(activeCountdown.daysElapsed / activeCountdown.totalDays) * 100} 
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-muted-foreground">
                    {activeCountdown.daysElapsed}/{activeCountdown.totalDays} elapsed
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Balances */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <Palmtree className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{annualBalance.remaining} <span className="text-sm font-normal">days</span></p>
            <p className="text-xs text-muted-foreground">Annual Leave Balance</p>
            <Progress value={(annualBalance.used / annualBalance.total) * 100} className="mt-2 h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-1">{annualBalance.used} of {annualBalance.total} days used</p>
          </CardContent>
        </Card>

        {balances.filter(b => b.leave_type !== 'annual').slice(0, 3).map(bal => {
          const Icon = LEAVE_ICONS[bal.leave_type as LeaveType] || Clock;
          const remaining = bal.total_days - bal.used_days;
          return (
            <Card key={bal.id}>
              <CardContent className="p-4 text-center">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mx-auto mb-2", LEAVE_COLORS[bal.leave_type as LeaveType])}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold">{remaining} <span className="text-sm font-normal">days</span></p>
                <p className="text-xs text-muted-foreground">{LEAVE_TYPE_LABELS[bal.leave_type as LeaveType]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Requests - Excel Style Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            My Leave Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {myRequests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No leave requests yet.
            </div>
          ) : (
            <ScrollArea className="max-h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className="text-xs font-bold uppercase tracking-wider w-[40px] text-center">#</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider">Dates</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Days</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider min-w-[200px]">Workflow Progress</TableHead>
                     <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.map((request, idx) => {
                    const isApproved = request.status === 'approved';
                    return (
                      <TableRow key={request.id} className="text-sm hover:bg-muted/30">
                        <TableCell className="text-center text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-medium">
                          {LEAVE_TYPE_LABELS[request.leave_type as LeaveType]}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(parseISO(request.start_date), 'dd MMM')} – {format(parseISO(request.end_date), 'dd MMM yy')}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{request.total_days}</TableCell>
                        <TableCell>
                          <LeaveWorkflowProgress
                            requestStatus={request.status as LeaveStatus}
                            createdAt={request.created_at}
                            hrActionAt={request.hr_action_at}
                            hrComment={request.hr_comment}
                            managerActionAt={request.manager_action_at}
                            managerComment={request.manager_comment}
                            gmActionAt={(request as any).gm_action_at}
                            gmComment={(request as any).gm_comment}
                            compact
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {isApproved ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => handleDownloadPdf(request)}
                              title="Download approved leave form"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
