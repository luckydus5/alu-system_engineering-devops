import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Users, Loader2, Send, CalendarDays, CheckSquare, Megaphone, FileEdit, Trophy, PartyPopper } from 'lucide-react';
import { ActivityType, CreateActivityData, OfficeActivity } from '@/hooks/useOfficeActivities';
import { cn } from '@/lib/utils';

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateActivityData) => Promise<void>;
  editActivity?: OfficeActivity | null;
  isSubmitting?: boolean;
}

const activityTypes: { value: ActivityType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'meeting', label: 'Meeting', icon: <Users className="h-4 w-4" />, color: 'bg-blue-500' },
  { value: 'task', label: 'Task', icon: <CheckSquare className="h-4 w-4" />, color: 'bg-emerald-500' },
  { value: 'announcement', label: 'Announcement', icon: <Megaphone className="h-4 w-4" />, color: 'bg-amber-500' },
  { value: 'update', label: 'Update', icon: <FileEdit className="h-4 w-4" />, color: 'bg-purple-500' },
  { value: 'milestone', label: 'Milestone', icon: <Trophy className="h-4 w-4" />, color: 'bg-rose-500' },
  { value: 'event', label: 'Event', icon: <PartyPopper className="h-4 w-4" />, color: 'bg-cyan-500' },
];

export function AddActivityDialog({
  open,
  onOpenChange,
  onSubmit,
  editActivity,
  isSubmitting,
}: AddActivityDialogProps) {
  const [title, setTitle] = useState(editActivity?.title || '');
  const [description, setDescription] = useState(editActivity?.description || '');
  const [activityType, setActivityType] = useState<ActivityType>(editActivity?.activity_type || 'update');
  const [status, setStatus] = useState<OfficeActivity['status']>(editActivity?.status || 'scheduled');
  const [priority, setPriority] = useState<OfficeActivity['priority']>(editActivity?.priority || 'normal');
  const [scheduledDate, setScheduledDate] = useState(
    editActivity?.scheduled_at ? editActivity.scheduled_at.split('T')[0] : ''
  );
  const [scheduledTime, setScheduledTime] = useState(
    editActivity?.scheduled_at ? editActivity.scheduled_at.split('T')[1]?.slice(0, 5) : ''
  );

  const isEdit = !!editActivity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let scheduled_at: string | undefined;
    if (scheduledDate) {
      scheduled_at = scheduledTime
        ? `${scheduledDate}T${scheduledTime}:00`
        : `${scheduledDate}T09:00:00`;
    }

    const data: CreateActivityData = {
      department_id: '', // Will be set by parent
      title,
      description: description || undefined,
      activity_type: activityType,
      status,
      priority,
      scheduled_at,
    };

    await onSubmit(data);
    handleClose();
  };

  const handleClose = () => {
    if (!isEdit) {
      setTitle('');
      setDescription('');
      setActivityType('update');
      setStatus('scheduled');
      setPriority('normal');
      setScheduledDate('');
      setScheduledTime('');
    }
    onOpenChange(false);
  };

  const selectedType = activityTypes.find((t) => t.value === activityType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {selectedType && (
              <div className={cn('p-2 rounded-lg text-white', selectedType.color)}>
                {selectedType.icon}
              </div>
            )}
            {isEdit ? 'Edit Activity' : 'Create Activity'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Activity Type Selection */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {activityTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setActivityType(type.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                    activityType === type.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-transparent bg-muted/50 hover:bg-muted'
                  )}
                >
                  <div className={cn('p-2 rounded-lg text-white', type.color)}>
                    {type.icon}
                  </div>
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                activityType === 'meeting'
                  ? 'Team standup meeting...'
                  : activityType === 'task'
                  ? 'Complete quarterly report...'
                  : 'What\'s happening?'
              }
              required
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Time
              </Label>
              <Input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as OfficeActivity['status'])}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                  <SelectItem value="in_progress">🔄 In Progress</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                  <SelectItem value="cancelled">❌ Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as OfficeActivity['priority'])}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="normal">🔵 Normal</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {isEdit ? 'Save' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
