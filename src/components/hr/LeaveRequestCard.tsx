import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Calendar, Clock, Check, X, ChevronRight, 
  Plane, Thermometer, User, Heart, Baby, Umbrella, Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { LeaveRequest, LeaveType, LeaveStatus, LEAVE_TYPE_LABELS, LEAVE_STATUS_LABELS } from '@/hooks/useLeaveRequests';
import { cn } from '@/lib/utils';

interface LeaveRequestCardProps {
  request: LeaveRequest;
  onView: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
  compact?: boolean;
}

const STATUS_STYLES: Record<LeaveStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  manager_approved: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  gm_pending: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', border: 'border-indigo-500/30' },
  approved: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  rejected: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  cancelled: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' },
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

export function LeaveRequestCard({ 
  request, 
  onView, 
  onApprove, 
  onReject, 
  showActions = true,
  compact = false 
}: LeaveRequestCardProps) {
  const LeaveIcon = LEAVE_ICONS[request.leave_type];
  const statusStyle = STATUS_STYLES[request.status];

  const getInitials = (name: string | null | undefined, email: string | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '??';
  };

  const canTakeAction = showActions && (request.status === 'pending' || request.status === 'manager_approved');

  if (compact) {
    return (
      <div
        onClick={onView}
        className={cn(
          "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
          statusStyle.bg, statusStyle.border
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", LEAVE_COLORS[request.leave_type])}>
              <LeaveIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate text-sm">
                {request.requester?.full_name || request.requester?.email || 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground">
                {LEAVE_TYPE_LABELS[request.leave_type]} • {request.total_days}d
              </p>
            </div>
          </div>
          <Badge className={cn("shrink-0 text-xs", statusStyle.bg, statusStyle.text, 'border-0')}>
            {LEAVE_STATUS_LABELS[request.status]}
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-card hover:shadow-lg transition-all group",
        "relative overflow-hidden"
      )}
    >
      {/* Status indicator stripe */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", statusStyle.bg.replace('/10', ''))} />
      
      <div className="flex items-start gap-4 pl-2">
        {/* Avatar */}
        <Avatar className="h-12 w-12 shrink-0 border-2 border-background shadow-sm">
          <AvatarFallback className={cn("font-semibold", LEAVE_COLORS[request.leave_type])}>
            {getInitials(request.requester?.full_name, request.requester?.email)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">
                {request.requester?.full_name || request.requester?.email || 'Unknown User'}
              </p>
              <p className="text-sm text-muted-foreground">
                {request.requester?.email}
              </p>
            </div>
            <Badge className={cn("shrink-0", statusStyle.bg, statusStyle.text, 'border-0')}>
              {LEAVE_STATUS_LABELS[request.status]}
            </Badge>
          </div>

          {/* Leave Info */}
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium", LEAVE_COLORS[request.leave_type])}>
              <LeaveIcon className="h-4 w-4" />
              {LEAVE_TYPE_LABELS[request.leave_type]}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {request.total_days} day{request.total_days > 1 ? 's' : ''}
            </div>
          </div>

          {/* Reason Preview */}
          {request.reason && (
            <p className="text-sm text-muted-foreground line-clamp-1 italic">
              "{request.reason}"
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Submitted {format(new Date(request.created_at), 'MMM d, yyyy')}
            </p>
            
            <div className="flex items-center gap-2">
              {canTakeAction && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject?.();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove?.();
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {request.status === 'pending' ? 'Approve' : 'Final Approve'}
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={onView}
              >
                Details
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
