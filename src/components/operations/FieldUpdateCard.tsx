import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  MapPin,
  Clock,
  MoreVertical,
  Pin,
  Trash2,
  Edit,
  MessageCircle,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Activity,
  Pause,
} from 'lucide-react';
import { FieldUpdate } from '@/hooks/useFieldUpdates';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PhotoGallery } from './PhotoGallery';
import { FieldUpdateDetailDialog } from './FieldUpdateDetailDialog';

interface FieldUpdateCardProps {
  update: FieldUpdate;
  canManage: boolean;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (update: FieldUpdate) => void;
  onStatusChange: (id: string, status: FieldUpdate['status']) => void;
}

const statusConfig: Record<
  FieldUpdate['status'],
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  active: { label: 'Active', color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30', icon: Activity },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/20 text-blue-600 border-blue-500/30', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-gray-500/20 text-gray-600 border-gray-500/30', icon: CheckCircle },
  on_hold: { label: 'On Hold', color: 'bg-amber-500/20 text-amber-600 border-amber-500/30', icon: Pause },
  issue: { label: 'Issue', color: 'bg-red-500/20 text-red-600 border-red-500/30', icon: AlertTriangle },
};

const priorityConfig: Record<FieldUpdate['priority'], { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600 animate-pulse' },
};

export function FieldUpdateCard({
  update,
  canManage,
  onTogglePin,
  onDelete,
  onEdit,
  onStatusChange,
}: FieldUpdateCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const status = statusConfig[update.status];
  const priority = priorityConfig[update.priority];
  const StatusIcon = status.icon;

  const handlePhotoClick = (index: number) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  return (
    <>
      <Card
        className={cn(
          'shadow-corporate hover:shadow-lg transition-all duration-200 cursor-pointer group',
          update.is_pinned && 'ring-2 ring-primary/30 bg-primary/5',
          update.status === 'issue' && 'border-red-500/30',
          update.priority === 'urgent' && 'border-l-4 border-l-red-500'
        )}
        onClick={() => setShowDetail(true)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {update.is_pinned && (
                <Pin className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {update.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <Badge variant="outline" className={cn('text-xs', status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              {update.priority !== 'normal' && (
                <Badge className={cn('text-xs', priority.color)}>{priority.label}</Badge>
              )}

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(update)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTogglePin(update.id, update.is_pinned)}>
                      <Pin className="h-4 w-4 mr-2" />
                      {update.is_pinned ? 'Unpin' : 'Pin to Top'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onStatusChange(update.id, 'active')}
                      disabled={update.status === 'active'}
                    >
                      <Activity className="h-4 w-4 mr-2" />
                      Mark Active
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onStatusChange(update.id, 'in_progress')}
                      disabled={update.status === 'in_progress'}
                    >
                      <Loader2 className="h-4 w-4 mr-2" />
                      Mark In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onStatusChange(update.id, 'completed')}
                      disabled={update.status === 'completed'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Completed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onStatusChange(update.id, 'issue')}
                      disabled={update.status === 'issue'}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Mark as Issue
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(update.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Description */}
          {update.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">
              {update.description}
            </p>
          )}

          {/* Photos Preview */}
          {update.photos.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto pb-2"
              onClick={(e) => e.stopPropagation()}
            >
              {update.photos.slice(0, 4).map((photo, index) => (
                <div
                  key={index}
                  className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                  onClick={() => handlePhotoClick(index)}
                >
                  <img
                    src={photo}
                    alt={`Update photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && update.photos.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-semibold">+{update.photos.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Location & Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {update.location && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" />
                {update.location}
              </Badge>
            )}
            {update.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={update.creator?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {update.creator?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {update.creator?.full_name || 'Unknown'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-muted-foreground">
              {update.photos.length > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <ImageIcon className="h-3.5 w-3.5" />
                  <span>{update.photos.length}</span>
                </div>
              )}
              {(update.comments_count || 0) > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span>{update.comments_count}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery Modal */}
      <PhotoGallery
        photos={update.photos}
        open={showGallery}
        onOpenChange={setShowGallery}
        initialIndex={galleryIndex}
      />

      {/* Detail Dialog */}
      <FieldUpdateDetailDialog
        update={update}
        open={showDetail}
        onOpenChange={setShowDetail}
        canManage={canManage}
        onStatusChange={onStatusChange}
      />
    </>
  );
}
