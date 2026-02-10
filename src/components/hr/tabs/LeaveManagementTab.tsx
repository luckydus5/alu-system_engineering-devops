import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { 
  Search, Calendar as CalendarIcon, Clock, Users, FileText,
  CheckCircle2, XCircle, AlertCircle, Filter, RefreshCw,
  ChevronLeft, ChevronRight, Plus, Eye, MoreHorizontal,
  CalendarDays, LayoutGrid, List, Download, ArrowUpRight
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LeaveType, LeaveStatus } from '@/hooks/useLeaveRequests';
import { LeaveApplicationForm } from '../LeaveApplicationForm';
import { LeaveRequestDetailDialog } from '../LeaveRequestDetailDialog';
import { cn } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths } from 'date-fns';

interface LeaveManagementTabProps {
  departmentId: string;
}

const STATUS_CONFIG: Record<LeaveStatus, { color: string; bgColor: string; icon: React.ElementType }> = {
  pending: { color: 'text-amber-600', bgColor: 'bg-amber-500/10', icon: Clock },
  manager_approved: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', icon: AlertCircle },
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

function LeaveRequestItem({ request, onView, onApprove, onReject }: {
  request: any;
  onView: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const statusConfig = STATUS_CONFIG[request.status as LeaveStatus];
  const StatusIcon = statusConfig.icon;
  const initials = request.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?';

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-slate-800/50 border hover:shadow-md transition-all">
      <Avatar className="h-12 w-12">
        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold truncate">{request.requester?.full_name || 'Unknown'}</h4>
          <Badge className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {LEAVE_STATUS_LABELS[request.status as LeaveStatus]}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className={cn("h-2 w-2 rounded-full", LEAVE_TYPE_COLORS[request.leave_type as LeaveType])} />
            {LEAVE_TYPE_LABELS[request.leave_type as LeaveType]}
          </span>
          <span>•</span>
          <span>{request.total_days} day(s)</span>
          <span>•</span>
          <span>{format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d')}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {(request.status === 'pending' || request.status === 'manager_approved') && onApprove && (
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-600 hover:bg-emerald-50" onClick={onApprove}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Approve
          </Button>
        )}
        {(request.status === 'pending' || request.status === 'manager_approved') && onReject && (
          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={onReject}>
            <XCircle className="h-4 w-4 mr-1" />
            Reject
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onView}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LeaveManagementTab({ departmentId }: LeaveManagementTabProps) {
  const [activeView, setActiveView] = useState<'requests' | 'calendar'>('requests');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  const { leaveRequests, isLoading, refetch, updateRequestStatus } = useLeaveRequests(undefined, true);

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
    managerApproved: leaveRequests.filter(r => r.status === 'manager_approved').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
  }), [leaveRequests]);

  const handleApprove = async (id: string, currentStatus: LeaveStatus) => {
    const newStatus: LeaveStatus = currentStatus === 'pending' ? 'manager_approved' : 'approved';
    await updateRequestStatus.mutateAsync({ id, status: newStatus, isManager: currentStatus === 'pending' });
  };

  const handleReject = async (id: string) => {
    await updateRequestStatus.mutateAsync({ id, status: 'rejected' });
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={cn("cursor-pointer transition-all hover:shadow-md", statusFilter === 'pending' && "ring-2 ring-amber-500")} onClick={() => setStatusFilter('pending')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
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
              <p className="text-sm text-muted-foreground">Awaiting HR</p>
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
        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-1">No leave requests found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No leave requests have been submitted yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {filteredRequests.map(request => (
                  <LeaveRequestItem
                    key={request.id}
                    request={request}
                    onView={() => setSelectedRequest(request.id)}
                    onApprove={() => handleApprove(request.id, request.status)}
                    onReject={() => handleReject(request.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      ) : (
        <LeaveCalendarView
          leaveRequests={leaveRequests}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
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
