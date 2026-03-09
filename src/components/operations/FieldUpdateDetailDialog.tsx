import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MapPin,
  Clock,
  MessageCircle,
  Send,
  Activity,
  Loader2,
  CheckCircle,
  Pause,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { FieldUpdate, useFieldUpdateComments } from '@/hooks/useFieldUpdates';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PhotoGallery } from './PhotoGallery';

interface FieldUpdateDetailDialogProps {
  update: FieldUpdate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
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
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-600' },
};

export function FieldUpdateDetailDialog({
  update,
  open,
  onOpenChange,
  canManage,
  onStatusChange,
}: FieldUpdateDetailDialogProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const { comments, loading: commentsLoading, addComment } = useFieldUpdateComments(
    open ? update.id : undefined
  );

  const status = statusConfig[update.status];
  const priority = priorityConfig[update.priority];
  const StatusIcon = status.icon;

  const handleSendComment = async () => {
    if (!newComment.trim()) return;

    setSendingComment(true);
    const success = await addComment(newComment.trim());
    if (success) {
      setNewComment('');
    }
    setSendingComment(false);
  };

  const handlePhotoClick = (index: number) => {
    setGalleryIndex(index);
    setShowGallery(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-[85vh]">
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-xl font-bold mb-2">
                    {update.title}
                  </DialogTitle>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className={cn('text-xs', status.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                    {update.priority !== 'normal' && (
                      <Badge className={cn('text-xs', priority.color)}>{priority.label}</Badge>
                    )}
                    {update.location && (
                      <Badge variant="secondary" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {update.location}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Author & Time */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={update.creator?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {update.creator?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{update.creator?.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(update.created_at), 'PPP p')}
                      <span className="text-xs">
                        ({formatDistanceToNow(new Date(update.created_at), { addSuffix: true })})
                      </span>
                    </p>
                  </div>
                </div>

                {/* Description */}
                {update.description && (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-foreground whitespace-pre-wrap">{update.description}</p>
                  </div>
                )}

                {/* Photos */}
                {update.photos.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Photos ({update.photos.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {update.photos.map((photo, index) => (
                        <div
                          key={index}
                          className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all"
                          onClick={() => handlePhotoClick(index)}
                        >
                          <img
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {update.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {update.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Quick Status Change for Managers */}
                {canManage && (
                  <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium mr-2">Quick Status:</span>
                    {(['active', 'in_progress', 'completed', 'on_hold', 'issue'] as const).map(
                      (s) => {
                        const cfg = statusConfig[s];
                        const Icon = cfg.icon;
                        return (
                          <Button
                            key={s}
                            size="sm"
                            variant={update.status === s ? 'default' : 'outline'}
                            onClick={() => onStatusChange(update.id, s)}
                            className="h-8"
                          >
                            <Icon className="h-3.5 w-3.5 mr-1" />
                            {cfg.label}
                          </Button>
                        );
                      }
                    )}
                  </div>
                )}

                <Separator />

                {/* Comments Section */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Comments ({comments.length})
                  </h4>

                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={comment.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {comment.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {comment.user?.full_name || 'Unknown'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(comment.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  disabled={sendingComment}
                />
                <Button
                  onClick={handleSendComment}
                  disabled={!newComment.trim() || sendingComment}
                >
                  {sendingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Gallery */}
      <PhotoGallery
        photos={update.photos}
        open={showGallery}
        onOpenChange={setShowGallery}
        initialIndex={galleryIndex}
      />
    </>
  );
}
