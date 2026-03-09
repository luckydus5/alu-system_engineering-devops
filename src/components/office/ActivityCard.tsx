import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  MoreVertical,
  Pin,
  Trash2,
  Edit,
  Users,
  CheckSquare,
  Megaphone,
  FileEdit,
  Trophy,
  PartyPopper,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from 'lucide-react';
import { OfficeActivity, ActivityType } from '@/hooks/useOfficeActivities';
import { formatDistanceToNow, format, isToday, isTomorrow, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface ActivityCardProps {
  activity: OfficeActivity;
  canManage: boolean;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (activity: OfficeActivity) => void;
  onStatusChange: (id: string, status: OfficeActivity['status']) => void;
  variant?: 'default' | 'compact';
}

const typeConfig: Record<
  ActivityType,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  meeting: {
    label: 'Meeting',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    icon: <Users className="h-4 w-4" />,
  },
  task: {
    label: 'Task',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    icon: <CheckSquare className="h-4 w-4" />,
  },
  announcement: {
    label: 'Announcement',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    icon: <Megaphone className="h-4 w-4" />,
  },
  update: {
    label: 'Update',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    icon: <FileEdit className="h-4 w-4" />,
  },
  milestone: {
    label: 'Milestone',
    color: 'text-rose-600',
    bgColor: 'bg-rose-500/10',
    icon: <Trophy className="h-4 w-4" />,
  },
  event: {
    label: 'Event',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-500/10',
    icon: <PartyPopper className="h-4 w-4" />,
  },
};

const statusConfig: Record<
  OfficeActivity['status'],
  { label: string; icon: React.ReactNode; color: string }
> = {
  scheduled: { label: 'Scheduled', icon: <Circle className="h-3.5 w-3.5" />, color: 'text-blue-500' },
  in_progress: { label: 'In Progress', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: 'text-amber-500' },
  completed: { label: 'Completed', icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-emerald-500' },
  cancelled: { label: 'Cancelled', icon: <XCircle className="h-3.5 w-3.5" />, color: 'text-gray-400' },
};

const priorityColors: Record<OfficeActivity['priority'], string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-red-100 text-red-600',
};

export function ActivityCard({
  activity,
  canManage,
  onTogglePin,
  onDelete,
  onEdit,
  onStatusChange,
  variant = 'default',
}: ActivityCardProps) {
  const type = typeConfig[activity.activity_type];
  const status = statusConfig[activity.status];

  const getScheduleLabel = () => {
    if (!activity.scheduled_at) return null;
    const date = new Date(activity.scheduled_at);
    
    if (isToday(date)) {
      return { label: `Today at ${format(date, 'h:mm a')}`, urgent: true };
    }
    if (isTomorrow(date)) {
      return { label: `Tomorrow at ${format(date, 'h:mm a')}`, urgent: false };
    }
    if (isPast(date) && activity.status !== 'completed') {
      return { label: `Overdue - ${format(date, 'MMM d')}`, urgent: true };
    }
    return { label: format(date, 'MMM d, h:mm a'), urgent: false };
  };

  const scheduleInfo = getScheduleLabel();

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all cursor-pointer group',
          activity.is_pinned && 'ring-1 ring-primary/30 bg-primary/5'
        )}
        onClick={() => onEdit(activity)}
      >
        <div className={cn('p-2 rounded-lg', type.bgColor, type.color)}>
          {type.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {activity.title}
          </p>
          {scheduleInfo && (
            <p className={cn('text-xs', scheduleInfo.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
              {scheduleInfo.label}
            </p>
          )}
        </div>
        <div className={cn('flex items-center gap-1', status.color)}>
          {status.icon}
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'shadow-sm hover:shadow-md transition-all duration-200 group overflow-hidden',
        activity.is_pinned && 'ring-2 ring-primary/30 bg-primary/5',
        activity.status === 'cancelled' && 'opacity-60'
      )}
    >
      {/* Color bar at top */}
      <div className={cn('h-1', type.bgColor.replace('/10', ''))} />
      
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Type Icon */}
          <div className={cn('p-2.5 rounded-xl flex-shrink-0', type.bgColor, type.color)}>
            {type.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{activity.title}</h3>
                  {activity.is_pinned && (
                    <Pin className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={cn('text-xs gap-1', status.color)}>
                    {status.icon}
                    {status.label}
                  </Badge>
                  {activity.priority !== 'normal' && (
                    <Badge className={cn('text-xs', priorityColors[activity.priority])}>
                      {activity.priority === 'high' ? '🔴 High' : '🟢 Low'}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {type.label}
                  </Badge>
                </div>
              </div>

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(activity)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTogglePin(activity.id, activity.is_pinned)}>
                      <Pin className="h-4 w-4 mr-2" />
                      {activity.is_pinned ? 'Unpin' : 'Pin'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onStatusChange(activity.id, 'completed')}
                      disabled={activity.status === 'completed'}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(activity.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Description */}
            {activity.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {activity.description}
              </p>
            )}

            {/* Schedule */}
            {scheduleInfo && (
              <div className={cn(
                'flex items-center gap-1.5 text-sm',
                scheduleInfo.urgent ? 'text-red-500 font-medium' : 'text-muted-foreground'
              )}>
                <Calendar className="h-3.5 w-3.5" />
                {scheduleInfo.label}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={activity.creator?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {activity.creator?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {activity.creator?.full_name || 'Unknown'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
