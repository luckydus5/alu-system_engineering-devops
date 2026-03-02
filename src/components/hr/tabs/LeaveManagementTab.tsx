import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { 
  Search, Calendar as CalendarIcon, Clock, Users, FileText,
  CheckCircle2, XCircle, AlertCircle, Filter, RefreshCw,
  ChevronLeft, ChevronRight, Plus, Eye, MoreHorizontal,
  CalendarDays, LayoutGrid, List, Download, ArrowUpRight,
  Wallet, Timer, Calculator, Table2, Edit, Loader2, Settings2
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LeaveType, LeaveStatus } from '@/hooks/useLeaveRequests';
import { useAllLeaveBalances } from '@/hooks/useAllLeaveBalances';
import { useCurrentUserLeavePermissions } from '@/hooks/useLeaveManagers';
import { LeaveApplicationForm } from '../LeaveApplicationForm';
import { LeaveRequestDetailDialog } from '../LeaveRequestDetailDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyPolicies } from '@/hooks/useCompanyPolicies';
import { LeaveEntitlementConfig } from '../LeaveEntitlementConfig';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, differenceInDays, eachDayOfInterval as eachDay, isSaturday, isSunday, addDays } from 'date-fns';

interface LeaveManagementTabProps {
  departmentId: string;
}

const STATUS_CONFIG: Record<LeaveStatus, { color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { color: 'text-amber-600', bgColor: 'bg-amber-500/10', icon: Clock },
  hr_approved: { color: 'text-cyan-600', bgColor: 'bg-cyan-500/10', icon: ArrowUpRight },
  manager_approved: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', icon: AlertCircle },
  gm_pending: { color: 'text-indigo-600', bgColor: 'bg-indigo-500/10', icon: ArrowUpRight },
  approved: { color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', icon: CheckCircle2 },
  rejected: { color: 'text-red-600', bgColor: 'bg-red-500/10', icon: XCircle },
  cancelled: { color: 'text-slate-600', bgColor: 'bg-slate-500/10', icon: XCircle },
};

const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  annual: 'bg-blue-500',
  sick: 'bg-red-500',
  personal: 'bg-purple-500',
  maternity: 'bg-pink-500',
  paternity: 'bg-cyan-500',
  bereavement: 'bg-slate-500',
  unpaid: 'bg-amber-500',
};

function LeaveCalendarView({ leaveRequests, selectedMonth, onMonthChange }: {
  leaveRequests: any[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}) {
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const approvedLeaves = leaveRequests.filter(r => r.status === 'approved');

  const getLeavesForDay = (day: Date) => {
    return approvedLeaves.filter(leave => {
      const start = parseISO(leave.start_date);
      const end = parseISO(leave.end_date);
      return isWithinInterval(day, { start, end });
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Leave Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(selectedMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(selectedMonth, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(selectedMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(monthStart.getDay()).fill(null).map((_, i) => (
            <div key={`empty-${i}`} className="h-24" />
          ))}
          {days.map(day => {
            const leaves = getLeavesForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toISOString()}
                className={cn(
                  "h-24 p-1 border rounded-lg transition-colors",
                  isToday && "bg-primary/5 border-primary",
                  !isToday && "hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1",
                  isToday && "text-primary"
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {leaves.slice(0, 3).map((leave, idx) => (
                    <div 
                      key={leave.id}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate text-white",
                        LEAVE_TYPE_COLORS[leave.leave_type as LeaveType]
                      )}
                      title={leave.requester?.full_name}
                    >
                      {leave.requester?.full_name?.split(' ')[0] || 'Unknown'}
                    </div>
                  ))}
                  {leaves.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">
                      +{leaves.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(LEAVE_TYPE_LABELS).slice(0, 5).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={cn("h-2.5 w-2.5 rounded-full", LEAVE_TYPE_COLORS[type as LeaveType])} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveRequestsTable({ requests, onView, onApprove, onReject, employeeBalances }: {
  requests: any[];
  onView: (id: string) => void;
  onApprove: (id: string, status: LeaveStatus) => void;
  onReject: (id: string) => void;
  employeeBalances: any[];
}) {
  const today = new Date();

  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-muted/60 border-b">
                  <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold w-8">#</th>
                  <th className="sticky left-8 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold min-w-[160px]">Employee</th>
                  <th className="px-3 py-2.5 text-left font-semibold min-w-[100px]">Leave Type</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Start Date</th>
                  <th className="px-3 py-2.5 text-center font-semibold">End Date</th>
                  <th className="px-3 py-2.5 text-center font-semibold bg-blue-50 dark:bg-blue-900/20">Total Days</th>
                  <th className="px-3 py-2.5 text-center font-semibold bg-amber-50 dark:bg-amber-900/20">Days Elapsed</th>
                  <th className="px-3 py-2.5 text-center font-semibold bg-orange-50 dark:bg-orange-900/20">Days Left</th>
                  <th className="px-3 py-2.5 text-center font-semibold bg-emerald-50 dark:bg-emerald-900/20">Balance Remaining</th>
                  <th className="px-3 py-2.5 text-center font-semibold min-w-[110px]">Status</th>
                  <th className="px-3 py-2.5 text-center font-semibold min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-16 text-muted-foreground">
                      <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No leave requests found</p>
                    </td>
                  </tr>
                ) : (
                  requests.map((request, idx) => {
                    const startDate = parseISO(request.start_date);
                    const endDate = parseISO(request.end_date);
                    const isActive = request.status === 'approved' && isWithinInterval(today, { start: startDate, end: endDate });
                    const isUpcoming = request.status === 'approved' && startDate > today;
                    const isPast = endDate < today;

                    // Days elapsed (only for active/past approved leaves)
                    let daysElapsed = 0;
                    let daysLeft = 0;
                    if (request.status === 'approved') {
                      if (isActive) {
                        daysElapsed = Math.max(0, differenceInDays(today, startDate) + 1);
                        daysLeft = Math.max(0, differenceInDays(endDate, today));
                      } else if (isPast) {
                        daysElapsed = request.total_days;
                        daysLeft = 0;
                      } else if (isUpcoming) {
                        daysElapsed = 0;
                        daysLeft = request.total_days;
                      }
                    }

                    // Find balance remaining for this employee
                    const empBalance = employeeBalances.find(e => e.user_id === request.requester_id);
                    const leaveTypeBal = empBalance?.balances?.find((b: any) => b.leave_type === request.leave_type);
                    const balanceRemaining = leaveTypeBal ? leaveTypeBal.remaining : '—';

                    const statusConfig = STATUS_CONFIG[request.status as LeaveStatus];
                    const StatusIcon = statusConfig.icon;
                    const canAct = request.status === 'pending' || request.status === 'manager_approved' || request.status === 'gm_pending';

                    return (
                      <tr 
                        key={request.id} 
                        className={cn(
                          "border-b hover:bg-muted/30 transition-colors cursor-pointer",
                          isActive && "bg-amber-50/40 dark:bg-amber-900/10",
                        )}
                        onClick={() => onView(request.id)}
                      >
                        <td className="sticky left-0 z-10 bg-background px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="sticky left-8 z-10 bg-background px-3 py-2">
                          <div className="font-medium truncate max-w-[160px]">{request.requester?.full_name || 'Unknown'}</div>
                          <div className="text-[10px] text-muted-foreground">{request.department?.name || ''}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("h-2 w-2 rounded-full shrink-0", LEAVE_TYPE_COLORS[request.leave_type as LeaveType])} />
                            <span className="truncate">{LEAVE_TYPE_LABELS[request.leave_type as LeaveType]}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">{format(startDate, 'dd-MMM-yy')}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">{format(endDate, 'dd-MMM-yy')}</td>
                        <td className="px-3 py-2 text-center font-bold bg-blue-50/30 dark:bg-blue-900/5">{request.total_days}</td>
                        <td className={cn(
                          "px-3 py-2 text-center font-medium bg-amber-50/30 dark:bg-amber-900/5",
                          isActive && "text-amber-700 font-bold"
                        )}>
                          {request.status === 'approved' ? (
                            <span>{daysElapsed}{isActive && <span className="text-[10px] ml-0.5">▶</span>}</span>
                          ) : '—'}
                        </td>
                        <td className={cn(
                          "px-3 py-2 text-center font-medium bg-orange-50/30 dark:bg-orange-900/5",
                          isActive && daysLeft <= 2 && "text-red-600 font-bold"
                        )}>
                          {request.status === 'approved' ? daysLeft : '—'}
                        </td>
                        <td className={cn(
                          "px-3 py-2 text-center font-bold bg-emerald-50/30 dark:bg-emerald-900/5",
                          typeof balanceRemaining === 'number' && balanceRemaining <= 5 && "text-red-600",
                          typeof balanceRemaining === 'number' && balanceRemaining > 5 && "text-emerald-600"
                        )}>
                          {balanceRemaining}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge className={cn("text-[10px] px-2", statusConfig.bgColor, statusConfig.color)}>
                            <StatusIcon className="h-3 w-3 mr-0.5" />
                            {LEAVE_STATUS_LABELS[request.status as LeaveStatus]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {canAct && (
                              <>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-emerald-600 hover:bg-emerald-50" onClick={() => onApprove(request.id, request.status)}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600 hover:bg-red-50" onClick={() => onReject(request.id)}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onView(request.id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Leave Date Calculator — uses Leave Start Date and Leave End Date (both inclusive)
function calculateLeaveDays(leaveStart: Date, leaveEnd: Date): { calendarDays: number; workingDays: number; saturdays: number; sundays: number; totalLeaveDays: number } {
  if (leaveEnd < leaveStart) return { calendarDays: 0, workingDays: 0, saturdays: 0, sundays: 0, totalLeaveDays: 0 };
  
  const days = eachDayOfInterval({ start: leaveStart, end: leaveEnd });
  let workingDays = 0, saturdays = 0, sundays = 0;
  
  days.forEach(day => {
    if (isSunday(day)) sundays++;
    else if (isSaturday(day)) saturdays++;
    else workingDays++;
  });
  
  // Formula: Mon-Fri (full) + Saturdays × 0.5 + Sundays × 0
  const totalLeaveDays = workingDays + saturdays * 0.5;
  
  return { calendarDays: days.length, workingDays, saturdays, sundays, totalLeaveDays };
}

function LeaveDateCalculator() {
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  
  const result = useMemo(() => {
    if (!leaveStart || !leaveEnd) return null;
    try {
      return calculateLeaveDays(new Date(leaveStart), new Date(leaveEnd));
    } catch { return null; }
  }, [leaveStart, leaveEnd]);

  const examples = [
    { start: '2025-11-03', end: '2025-11-10' },
    { start: '2025-01-13', end: '2025-01-17' },
    { start: '2025-07-02', end: '2025-07-11' },
    { start: '2025-09-15', end: '2025-10-03' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            📅 Quick Date Range Calculator
          </CardTitle>
          <CardDescription>Enter the first and last day of leave to calculate total leave days</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Leave Start Date</label>
              <Input type="date" value={leaveStart} onChange={e => setLeaveStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Leave End Date</label>
              <Input type="date" value={leaveEnd} onChange={e => setLeaveEnd(e.target.value)} />
            </div>
          </div>

          {result && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 space-y-2">
                <h4 className="font-semibold text-sm">Results:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Calendar Days (Leave):</span>
                  <span className="font-medium">{result.calendarDays}</span>
                  <span className="text-muted-foreground">Working Days (Mon-Fri):</span>
                  <span className="font-medium">{result.workingDays}</span>
                  <span className="text-muted-foreground">Saturdays in Leave:</span>
                  <span className="font-medium">{result.saturdays}</span>
                  <span className="text-muted-foreground">Sundays in Leave:</span>
                  <span className="font-medium">{result.sundays}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg">TOTAL LEAVE DAYS:</span>
                    <span className="font-bold text-2xl text-primary">{result.totalLeaveDays}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>📝 Rule: Start & End dates are both counted as leave days (inclusive)</p>
            <p>📝 Formula: Mon-Fri (full) + Saturdays × 0.5 + Sundays × 0</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Leave Start</th>
                <th className="text-left py-2 font-medium">Leave End</th>
                <th className="text-right py-2 font-medium">Leave Days</th>
              </tr>
            </thead>
            <tbody>
              {examples.map((ex, i) => {
                const calc = calculateLeaveDays(new Date(ex.start), new Date(ex.end));
                return (
                  <tr key={i} className="border-b hover:bg-muted/30">
                    <td className="py-2">{format(new Date(ex.start), 'dd-MMM-yyyy')}</td>
                    <td className="py-2">{format(new Date(ex.end), 'dd-MMM-yyyy')}</td>
                    <td className="py-2 text-right font-bold text-primary">{calc.totalLeaveDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// Leave Allowance & Balance Tracker (Excel Page 4)
function LeaveAllowanceTracker({ employeeBalances, leaveRequests, balanceSearch, onSearchChange, onInitialize, canEditBalances, policyValues }: {
  employeeBalances: any[];
  leaveRequests: any[];
  balanceSearch: string;
  onSearchChange: (v: string) => void;
  onInitialize: () => void;
  canEditBalances: boolean;
  policyValues?: { annualAllowance: number; monthlyAccrual: number; capAccrual: boolean };
}) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const annualAllowance = policyValues?.annualAllowance ?? 18;
  const monthlyAccrual = policyValues?.monthlyAccrual ?? 1.5;
  const capAccrual = policyValues?.capAccrual ?? true;
  const [editingEmployee, setEditingEmployee] = useState<{ userId: string; name: string; currentTotal: number } | null>(null);
  const [newAllowance, setNewAllowance] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveAllowance = async () => {
    if (!editingEmployee) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('leave_balances')
        .update({ total_days: Number(newAllowance) })
        .eq('user_id', editingEmployee.userId)
        .eq('leave_type', 'annual')
        .eq('year', currentYear);
      if (error) throw error;
      toast({ title: `Updated ${editingEmployee.name}'s annual leave to ${newAllowance} days` });
      setEditingEmployee(null);
      onInitialize(); // Refetch
    } catch (err: any) {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employeeBalances.filter(emp =>
    !balanceSearch ||
    emp.full_name?.toLowerCase().includes(balanceSearch.toLowerCase()) ||
    emp.email.toLowerCase().includes(balanceSearch.toLowerCase())
  );

  // Group by department
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredEmployees.forEach(emp => {
      const dept = emp.department_name || 'Unassigned';
      const list = map.get(dept) || [];
      list.push(emp);
      map.set(dept, list);
    });
    return map;
  }, [filteredEmployees]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 className="h-5 w-5 text-primary" />
              📊 Leave Allowance & Balance Tracker {currentYear}
            </CardTitle>
            <CardDescription>
              Annual Leave: {annualAllowance} days | Monthly Accrual: {monthlyAccrual} days/month | 
              Accrued so far ({currentMonth} months): <strong>{Math.min(currentMonth * monthlyAccrual, capAccrual ? annualAllowance : Infinity)} days</strong>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={balanceSearch} onChange={e => onSearchChange(e.target.value)} className="pl-10 w-[200px]" />
            </div>
            <Button variant="outline" size="sm" onClick={onInitialize}>
              <Plus className="h-4 w-4 mr-1" /> Initialize All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No leave balances found</h3>
            <p className="text-sm text-muted-foreground mb-4">Click "Initialize All" to set default balances</p>
          </div>
        ) : (
          <ScrollArea className="w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[900px]">
                <thead>
                 <tr className="bg-muted/50 border-b">
                     <th className="sticky left-0 z-10 bg-muted/90 px-2 py-2 text-left font-semibold w-8">No</th>
                     <th className="px-2 py-2 text-left font-semibold w-16">Dept</th>
                     <th className="sticky left-8 z-10 bg-muted/90 px-2 py-2 text-left font-semibold min-w-[160px]">Employee Name</th>
                     <th className="px-2 py-2 text-center font-semibold bg-amber-50 dark:bg-amber-900/20">Carry Over</th>
                     <th className="px-2 py-2 text-center font-semibold bg-emerald-50 dark:bg-emerald-900/20">Allowance</th>
                     <th className="px-2 py-2 text-center font-semibold bg-cyan-50 dark:bg-cyan-900/20">Accrued ({currentMonth}mo)</th>
                     <th className="px-2 py-2 text-center font-semibold bg-blue-50 dark:bg-blue-900/20">TOTAL Entitlement</th>
                     <th className="px-2 py-2 text-center font-semibold bg-orange-50 dark:bg-orange-900/20">Days Used</th>
                     <th className="px-2 py-2 text-center font-semibold bg-violet-50 dark:bg-violet-900/20">Balance</th>
                     <th className="px-2 py-2 text-center font-semibold">Status</th>
                     <th className="px-2 py-2 text-left font-semibold min-w-[100px]">Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {Array.from(grouped.entries()).map(([deptName, deptEmployees]) => (
                    <>
                      <tr key={`dept-${deptName}`} className="bg-primary/5 border-b">
                        <td colSpan={11} className="px-2 py-1.5 font-bold text-sm text-primary">
                          ► {deptName.toUpperCase()}
                        </td>
                      </tr>
                      {deptEmployees.map((emp, idx) => {
                        // Find annual leave balance
                        const annualBal = emp.balances.find((b: any) => b.leave_type === 'annual');
                        const totalEntitlement = annualBal ? annualBal.total_days : annualAllowance;
                        const usedDays = annualBal ? annualBal.used_days : 0;
                        
                        // Accrued days = months elapsed × monthly accrual, capped at allowance
                        const accruedDays = capAccrual 
                          ? Math.min(currentMonth * monthlyAccrual, totalEntitlement)
                          : currentMonth * monthlyAccrual;
                        
                        const balance = accruedDays - usedDays;
                        
                        // Check active leave
                        const activeLeave = leaveRequests.find((r: any) => {
                          if (r.requester_id !== emp.user_id || r.status !== 'approved') return false;
                          try {
                            const now = new Date();
                            return isWithinInterval(now, { start: parseISO(r.start_date), end: parseISO(r.end_date) });
                          } catch { return false; }
                        });

                        return (
                          <tr key={emp.user_id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="sticky left-0 z-10 bg-background px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">{deptName.substring(0, 8)}</td>
                            <td className="sticky left-8 z-10 bg-background px-2 py-1.5 font-medium truncate max-w-[160px]">{emp.full_name || emp.email}</td>
                            <td className="px-2 py-1.5 text-center bg-amber-50/50 dark:bg-amber-900/10">0</td>
                            <td className="px-2 py-1.5 text-center font-medium bg-emerald-50/50 dark:bg-emerald-900/10">{totalEntitlement}</td>
                            <td className="px-2 py-1.5 text-center font-semibold bg-cyan-50/50 dark:bg-cyan-900/10 text-cyan-700 dark:text-cyan-400">{accruedDays}</td>
                            <td className="px-2 py-1.5 text-center font-bold bg-blue-50/50 dark:bg-blue-900/10">{totalEntitlement}</td>
                            <td className="px-2 py-1.5 text-center font-medium bg-orange-50/50 dark:bg-orange-900/10">{usedDays}</td>
                            <td className={cn(
                              "px-2 py-1.5 text-center font-bold",
                              balance > 0 ? "text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10" : "text-red-600 bg-red-50/50 dark:bg-red-900/10"
                            )}>
                              {balance}
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              {activeLeave ? (
                                <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">
                                  <Timer className="h-3 w-3 mr-0.5" /> On Leave
                                </Badge>
                              ) : balance <= 0 ? (
                                <Badge className="bg-red-500/10 text-red-600 text-[10px]">Exhausted</Badge>
                              ) : balance <= 5 ? (
                                <Badge className="bg-amber-500/10 text-amber-600 text-[10px]">Low</Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">Available</Badge>
                              )}
                            </td>
                            <td className="px-2 py-1.5 flex items-center gap-1">
                              {activeLeave && <span className="text-muted-foreground text-[10px]">Until {format(parseISO(activeLeave.end_date), 'MMM d')}</span>}
                              {canEditBalances && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 ml-auto"
                                  onClick={() => {
                                    setEditingEmployee({ userId: emp.user_id, name: emp.full_name || emp.email, currentTotal: totalEntitlement });
                                    setNewAllowance(String(totalEntitlement));
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}

        {/* Summary Footer */}
        {filteredEmployees.length > 0 && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex flex-wrap gap-6 text-sm">
              <span>📊 Total Employees: <strong>{filteredEmployees.length}</strong></span>
              <span>📅 Annual Allowance: <strong>{annualAllowance} days</strong></span>
              <span>📈 Monthly Accrual: <strong>{monthlyAccrual} days/month</strong></span>
              <span>📝 Formula: Mon-Fri = 1 day, Saturday = 0.5 day, Sunday = 0</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Balance Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Leave Allowance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Employee</Label>
              <p className="text-sm font-medium">{editingEmployee?.name}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Annual Leave Days ({currentYear})</Label>
              <Input
                type="number"
                value={newAllowance}
                onChange={(e) => setNewAllowance(e.target.value)}
                min={0}
                max={365}
                className="h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                Default is {annualAllowance} days. Current: {editingEmployee?.currentTotal} days.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingEmployee(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveAllowance} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function LeaveManagementTab({ departmentId }: LeaveManagementTabProps) {
  const [activeView, setActiveView] = useState<'requests' | 'calendar' | 'balances' | 'calculator' | 'entitlements'>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [balanceSearch, setBalanceSearch] = useState('');

  const { leaveRequests, isLoading, refetch, updateRequestStatus } = useLeaveRequests(undefined, true);
  const { employeeBalances, isLoading: balancesLoading, initializeBalances } = useAllLeaveBalances();
  const { canEditBalances: userCanEditBalances } = useCurrentUserLeavePermissions();
  const { hasRole, roles } = useUserRole();
  // HR department staff get full access — check if user is in the HR department
  const isInHRDept = roles.some(r => r.department_id === departmentId);
  const isHROrAdmin = hasRole('admin') || hasRole('super_admin') || isInHRDept;

  // Fetch leave policy values
  const { getPolicyValue } = useCompanyPolicies();
  const policyValues = useMemo(() => ({
    annualAllowance: Number(getPolicyValue('leave', 'default_annual_days', '18')) || 18,
    monthlyAccrual: Number(getPolicyValue('leave', 'monthly_accrual_days', '1.5')) || 1.5,
    capAccrual: getPolicyValue('leave', 'accrual_cap_to_annual', 'true') === 'true',
  }), [getPolicyValue]);
  const canEditBalances = isHROrAdmin || userCanEditBalances;

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter(request => {
      const matchesSearch = 
        request.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requester?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.leave_type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [leaveRequests, searchTerm, statusFilter, typeFilter]);

  const stats = useMemo(() => ({
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    hrApproved: leaveRequests.filter(r => r.status === 'hr_approved').length,
    managerApproved: leaveRequests.filter(r => r.status === 'manager_approved').length,
    gmPending: leaveRequests.filter(r => r.status === 'gm_pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
  }), [leaveRequests]);

  // New workflow: pending (HR) → hr_approved (Manager) → manager_approved (GM/OM) → approved
  const handleApprove = async (id: string, currentStatus: LeaveStatus) => {
    let newStatus: LeaveStatus;
    if (currentStatus === 'pending') {
      // HR approves → goes to department manager
      newStatus = 'hr_approved';
    } else if (currentStatus === 'hr_approved') {
      // Department manager approves → goes to GM/OM
      newStatus = 'manager_approved';
    } else if (currentStatus === 'manager_approved' || currentStatus === 'gm_pending') {
      // GM/OM gives final approval
      newStatus = 'approved';
    } else {
      newStatus = 'approved';
    }
    await updateRequestStatus.mutateAsync({ id, status: newStatus, isHR: currentStatus === 'pending', isManager: currentStatus === 'hr_approved' });
  };

  const handleReject = async (id: string) => {
    await updateRequestStatus.mutateAsync({ id, status: 'rejected' });
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'pending' && "ring-2 ring-amber-500")} onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending HR</p>
            </div>
          </CardContent>
        </Card>

        <Card className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'hr_approved' && "ring-2 ring-cyan-500")} onClick={() => setStatusFilter('hr_approved')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.hrApproved}</p>
              <p className="text-sm text-muted-foreground">HR Approved</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'manager_approved' && "ring-2 ring-blue-500")} onClick={() => setStatusFilter('manager_approved')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.managerApproved}</p>
              <p className="text-sm text-muted-foreground">Mgr Approved</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'approved' && "ring-2 ring-emerald-500")} onClick={() => setStatusFilter('approved')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'rejected' && "ring-2 ring-red-500")} onClick={() => setStatusFilter('rejected')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => setStatusFilter('all')}>
                Clear Filters
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border p-1">
                <Button
                  variant={activeView === 'requests' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('requests')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Requests
                </Button>
                <Button
                  variant={activeView === 'calendar' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('calendar')}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Calendar
                </Button>
                <Button
                  variant={activeView === 'balances' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('balances')}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Allowance
                </Button>
                <Button
                  variant={activeView === 'calculator' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('calculator')}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Calculator
                </Button>
                <Button
                  variant={activeView === 'entitlements' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveView('entitlements')}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Entitlements
                </Button>
              </div>
              
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Request Leave
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeView === 'requests' ? (
        <LeaveRequestsTable
          requests={filteredRequests}
          onView={(id) => setSelectedRequest(id)}
          onApprove={handleApprove}
          onReject={handleReject}
          employeeBalances={employeeBalances}
        />
      ) : activeView === 'calendar' ? (
        <LeaveCalendarView
          leaveRequests={leaveRequests}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      ) : activeView === 'balances' ? (
        <LeaveAllowanceTracker
          employeeBalances={employeeBalances}
          leaveRequests={leaveRequests}
          balanceSearch={balanceSearch}
          onSearchChange={setBalanceSearch}
          onInitialize={initializeBalances}
          canEditBalances={canEditBalances}
          policyValues={policyValues}
        />
      ) : activeView === 'entitlements' ? (
        <LeaveEntitlementConfig departmentId={departmentId} />
      ) : (
        <LeaveDateCalculator />
      )}

      {/* Dialogs */}
      <LeaveApplicationForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        departmentId={departmentId}
        mode="create"
      />

      {selectedRequest && (
        <LeaveRequestDetailDialog
          requestId={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          isHR
        />
      )}
    </div>
  );
}
