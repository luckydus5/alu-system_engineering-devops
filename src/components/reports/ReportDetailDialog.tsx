import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { 
  FileText, Download, CheckCircle, XCircle, RotateCcw, 
  MessageSquare, Clock, User, AlertTriangle, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useReportActions } from '@/hooks/useReportActions';
import { toast } from 'sonner';
import type { Tables, Database } from '@/integrations/supabase/types';

type ReportStatus = Database['public']['Enums']['report_status'];

type Report = Tables<'reports'> & {
  departments?: {
    name: string;
    code: string;
    color: string | null;
  } | null;
};

interface Comment {
  id: string;
  content: string;
  action: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
}

interface ReportDetailDialogProps {
  report: Report | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const statusConfig: Record<ReportStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  submitted: { label: 'Pending Review', className: 'bg-warning/10 text-warning border-warning/20' },
  in_review: { label: 'Manager Review', className: 'bg-info/10 text-info border-info/20' },
  resolved: { label: 'Resolved', className: 'bg-success/10 text-success border-success/20' },
  closed: { label: 'Closed', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const priorityConfig = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-info/10 text-info' },
  high: { label: 'High', className: 'bg-warning/10 text-warning' },
  critical: { label: 'Critical', className: 'bg-destructive/10 text-destructive' },
};

const typeLabels: Record<string, string> = {
  incident: 'Incident Report',
  general: 'General Report',
  maintenance: 'Maintenance Report',
  safety: 'Safety Report',
  compliance: 'Compliance Report',
};

export function ReportDetailDialog({ report, open, onOpenChange, onUpdate }: ReportDetailDialogProps) {
  const { hasMinRole } = useUserRole();
  const { 
    supervisorApprove, supervisorReject, requestChanges,
    managerApprove, managerReject, managerEscalate,
    getComments, addComment
  } = useReportActions();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (report && open) {
      loadComments();
    }
  }, [report, open]);

  const loadComments = async () => {
    if (!report) return;
    setLoadingComments(true);
    const data = await getComments(report.id);
    setComments(data);
    setLoadingComments(false);
  };

  const handleAction = async (action: string, actionFn: (id: string, comment: string) => Promise<boolean>) => {
    if (!report) return;
    
    if (!newComment.trim() && action !== 'approve') {
      toast.error('Please provide a comment');
      return;
    }

    setActionLoading(action);
    const success = await actionFn(report.id, newComment);
    setActionLoading(null);

    if (success) {
      setNewComment('');
      onUpdate();
      onOpenChange(false);
    }
  };

  const handleAddComment = async () => {
    if (!report || !newComment.trim()) return;
    
    setActionLoading('comment');
    const success = await addComment(report.id, newComment);
    if (success) {
      setNewComment('');
      await loadComments();
      toast.success('Comment added');
    }
    setActionLoading(null);
  };

  const handleDownload = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('report-attachments')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['xls', 'xlsx'].includes(ext || '')) return '📊';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    return '📎';
  };

  const canSupervisorAct = hasMinRole('supervisor') && report?.status === 'submitted';
  const canManagerAct = hasMinRole('manager') && report?.status === 'in_review';
  const canComment = hasMinRole('staff') && report?.status !== 'resolved' && report?.status !== 'closed';

  if (!report) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{report.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {typeLabels[report.report_type] || report.report_type}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={cn('text-sm', statusConfig[report.status]?.className)}
            >
              {statusConfig[report.status]?.label}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Report Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Created {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}</span>
              </div>
              {report.departments && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{report.departments.name}</Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className={priorityConfig[report.priority]?.className}>
                  {priorityConfig[report.priority]?.label} Priority
                </Badge>
              </div>
              {report.submitted_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Send className="h-4 w-4" />
                  <span>Submitted {format(new Date(report.submitted_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {report.description || 'No description provided'}
              </p>
            </div>

            {/* Attachments */}
            {report.attachments && report.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Attachments ({report.attachments.length})
                  </h4>
                  <div className="space-y-2">
                    {report.attachments.map((path, index) => {
                      const fileName = path.split('/').pop() || 'File';
                      return (
                        <Card key={index} className="hover:bg-accent/50 transition-colors">
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{getFileIcon(path)}</span>
                              <span className="text-sm font-medium truncate max-w-[300px]">
                                {fileName}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDownload(path)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Comments/History */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Activity & Comments
              </h4>
              
              {loadingComments ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <Card key={comment.id} className={cn(
                      comment.action && 'border-l-4',
                      comment.action === 'resolved' && 'border-l-success',
                      comment.action === 'closed' && 'border-l-destructive',
                      comment.action === 'in_review' && 'border-l-info',
                      comment.action === 'draft' && 'border-l-warning',
                      comment.action === 'submitted' && 'border-l-warning',
                    )}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {comment.profiles?.full_name || comment.profiles?.email || 'Unknown'}
                            </span>
                            {comment.action && (
                              <Badge variant="outline" className="text-xs">
                                {comment.action === 'in_review' ? 'Forwarded to Manager' : 
                                 comment.action === 'draft' ? 'Requested Changes' :
                                 comment.action === 'resolved' ? 'Resolved' :
                                 comment.action === 'closed' ? 'Closed' :
                                 comment.action.charAt(0).toUpperCase() + comment.action.slice(1)}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Action Section */}
            {(canSupervisorAct || canManagerAct || canComment) && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">
                    {canSupervisorAct || canManagerAct ? 'Review Actions' : 'Add Comment'}
                  </h4>
                  
                  <Textarea
                    placeholder={canSupervisorAct || canManagerAct 
                      ? "Add a comment for your decision..." 
                      : "Add a comment..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-4"
                    rows={3}
                  />

                  <div className="flex flex-wrap gap-2">
                    {/* Supervisor Actions */}
                    {canSupervisorAct && (
                      <>
                        <Button 
                          onClick={() => handleAction('approve', supervisorApprove)}
                          disabled={!!actionLoading}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {actionLoading === 'approve' ? 'Processing...' : 'Approve & Forward'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleAction('changes', requestChanges)}
                          disabled={!!actionLoading || !newComment.trim()}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Request Changes
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleAction('reject', supervisorReject)}
                          disabled={!!actionLoading || !newComment.trim()}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Manager Actions */}
                    {canManagerAct && (
                      <>
                        <Button 
                          onClick={() => handleAction('approve', managerApprove)}
                          disabled={!!actionLoading}
                          className="bg-success hover:bg-success/90"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {actionLoading === 'approve' ? 'Processing...' : 'Final Approve'}
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => handleAction('escalate', managerEscalate)}
                          disabled={!!actionLoading || !newComment.trim()}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Send Back
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleAction('reject', managerReject)}
                          disabled={!!actionLoading || !newComment.trim()}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Comment Only */}
                    {!canSupervisorAct && !canManagerAct && canComment && (
                      <Button 
                        onClick={handleAddComment}
                        disabled={!!actionLoading || !newComment.trim()}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {actionLoading === 'comment' ? 'Adding...' : 'Add Comment'}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
