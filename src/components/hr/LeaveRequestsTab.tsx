import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Search, Filter, Calendar, RefreshCw, 
  Clock, CheckCircle2, XCircle, AlertCircle, FileText
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LeaveStatus } from '@/hooks/useLeaveRequests';
import { CreateLeaveRequestDialog } from './CreateLeaveRequestDialog';
import { LeaveApplicationForm } from './LeaveApplicationForm';
import { LeaveRequestDetailDialog } from './LeaveRequestDetailDialog';
import { LeaveRequestCard } from './LeaveRequestCard';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LeaveRequestsTabProps {
  departmentId: string;
  isHR?: boolean;
}

const STATUS_TABS = [
  { value: 'all', label: 'All', icon: Calendar },
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-amber-600' },
  { value: 'manager_approved', label: 'Awaiting HR', icon: AlertCircle, color: 'text-blue-600' },
  { value: 'approved', label: 'Approved', icon: CheckCircle2, color: 'text-emerald-600' },
  { value: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600' },
];

export function LeaveRequestsTab({ departmentId, isHR = false }: LeaveRequestsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [leaveApplicationFormOpen, setLeaveApplicationFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  
  const { leaveRequests, isLoading, refetch, updateRequestStatus } = useLeaveRequests(departmentId, isHR);

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = 
      request.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      LEAVE_TYPE_LABELS[request.leave_type].toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = leaveTypeFilter === 'all' || request.leave_type === leaveTypeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Group by status for counts
  const statusCounts = {
    all: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    manager_approved: leaveRequests.filter(r => r.status === 'manager_approved').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
    cancelled: leaveRequests.filter(r => r.status === 'cancelled').length,
  };

  const handleQuickApprove = async (id: string, currentStatus: LeaveStatus) => {
    const newStatus: LeaveStatus = currentStatus === 'pending' ? 'manager_approved' : 'approved';
    await updateRequestStatus.mutateAsync({ id, status: newStatus, isManager: currentStatus === 'pending' });
  };

  const handleQuickReject = async (id: string) => {
    await updateRequestStatus.mutateAsync({ id, status: 'rejected' });
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Leave Requests</h2>
            <p className="text-sm text-muted-foreground">
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {isHR && (
              <Button onClick={() => setLeaveApplicationFormOpen(true)} size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
                <FileText className="h-4 w-4 mr-2" />
                My Leave Request
              </Button>
            )}
            {!isHR && (
              <Button onClick={() => setLeaveApplicationFormOpen(true)} size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
          <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto flex-nowrap">
            {STATUS_TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-2 px-3 data-[state=active]:bg-background whitespace-nowrap"
              >
                <tab.icon className={cn("h-4 w-4", tab.color)} />
                <span className="hidden xs:inline">{tab.label}</span>
                {statusCounts[tab.value as keyof typeof statusCounts] > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "h-5 min-w-5 px-1.5 text-xs",
                      tab.value === 'pending' && statusCounts.pending > 0 && "bg-amber-500/20 text-amber-600",
                      tab.value === 'manager_approved' && statusCounts.manager_approved > 0 && "bg-blue-500/20 text-blue-600"
                    )}
                  >
                    {statusCounts[tab.value as keyof typeof statusCounts]}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Filters */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
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
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div className="space-y-3 max-h-[60vh] md:max-h-[600px] overflow-y-auto overscroll-contain pr-1">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">No leave requests found</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {searchTerm || statusFilter !== 'all' || leaveTypeFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No leave requests have been submitted yet'}
                </p>
              </div>
            ) : (
              filteredRequests.map(request => (
                <LeaveRequestCard
                  key={request.id}
                  request={request}
                  onView={() => setSelectedRequest(request.id)}
                  onApprove={isHR ? () => handleQuickApprove(request.id, request.status) : undefined}
                  onReject={isHR ? () => handleQuickReject(request.id) : undefined}
                  showActions={isHR}
                />
              ))
            )}
          </div>

      </div>

      <CreateLeaveRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        departmentId={departmentId}
      />

      <LeaveApplicationForm
        open={leaveApplicationFormOpen}
        onOpenChange={setLeaveApplicationFormOpen}
        departmentId={departmentId}
        mode="create"
      />

      {selectedRequest && (
        <LeaveRequestDetailDialog
          requestId={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          isHR={isHR}
        />
      )}
    </>
  );
}
