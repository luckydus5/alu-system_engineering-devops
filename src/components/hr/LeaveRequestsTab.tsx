import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Calendar, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS, LeaveStatus } from '@/hooks/useLeaveRequests';
import { CreateLeaveRequestDialog } from './CreateLeaveRequestDialog';
import { LeaveRequestDetailDialog } from './LeaveRequestDetailDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaveRequestsTabProps {
  departmentId: string;
  isHR?: boolean;
}

const STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  manager_approved: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  approved: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-red-500/20 text-red-600 border-red-500/30',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

export function LeaveRequestsTab({ departmentId, isHR = false }: LeaveRequestsTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  
  const { leaveRequests, isLoading, updateRequestStatus } = useLeaveRequests(departmentId, isHR);

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = 
      request.requester?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requester?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      LEAVE_TYPE_LABELS[request.leave_type].toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleQuickApprove = async (id: string, isManagerApproval: boolean) => {
    const newStatus: LeaveStatus = isManagerApproval ? 'manager_approved' : 'approved';
    await updateRequestStatus.mutateAsync({ id, status: newStatus, isManager: isManagerApproval });
  };

  const handleQuickReject = async (id: string) => {
    await updateRequestStatus.mutateAsync({ id, status: 'rejected' });
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold">Leave Requests</CardTitle>
          {!isHR && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or leave type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="manager_approved">Manager Approved</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requests List */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leave requests found</p>
                </div>
              ) : (
                filteredRequests.map(request => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedRequest(request.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {request.requester?.full_name || request.requester?.email || 'Unknown'}
                          </span>
                          <Badge variant="outline" className={STATUS_COLORS[request.status]}>
                            {LEAVE_STATUS_LABELS[request.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {LEAVE_TYPE_LABELS[request.leave_type]} • {request.total_days} day(s)
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                        </p>
                      </div>

                      {/* Quick Actions for pending requests */}
                      {isHR && (request.status === 'pending' || request.status === 'manager_approved') && (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-primary hover:text-primary/80 hover:bg-primary/10"
                            onClick={() => handleQuickApprove(request.id, request.status === 'pending')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {request.status === 'pending' ? 'Manager Approve' : 'HR Approve'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            onClick={() => handleQuickReject(request.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <CreateLeaveRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        departmentId={departmentId}
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
