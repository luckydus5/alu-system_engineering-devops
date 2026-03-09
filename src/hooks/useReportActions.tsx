import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Using correct status values: draft, pending, in_review, approved, rejected, escalated
type ReportStatus = Database['public']['Enums']['report_status'];

export function useReportActions() {
  const { user } = useAuth();

  const addComment = async (reportId: string, content: string, action?: string) => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      const { error } = await supabase
        .from('report_comments')
        .insert({
          report_id: reportId,
          user_id: user.id,
          content,
          action,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      return false;
    }
  };

  const updateReportStatus = async (reportId: string, status: ReportStatus, comment?: string) => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    try {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'approved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId);

      if (error) throw error;

      // Add comment with action
      if (comment) {
        await addComment(reportId, comment, status);
      }

      const statusMessages: Record<ReportStatus, string> = {
        draft: 'sent back for changes',
        pending: 'submitted for review',
        in_review: 'forwarded for manager review',
        approved: 'approved',
        rejected: 'rejected',
        escalated: 'escalated',
      };

      toast.success(`Report ${statusMessages[status] || 'updated'} successfully`);
      return true;
    } catch (error) {
      console.error('Error updating report status:', error);
      toast.error('Failed to update report');
      return false;
    }
  };

  // Supervisor approves -> moves to in_review for manager
  const supervisorApprove = async (reportId: string, comment: string) => {
    return updateReportStatus(reportId, 'in_review', comment || 'Approved by supervisor, forwarded to manager for final review');
  };

  // Supervisor rejects -> rejected
  const supervisorReject = async (reportId: string, comment: string) => {
    return updateReportStatus(reportId, 'rejected', comment);
  };

  // Supervisor requests changes -> back to draft
  const requestChanges = async (reportId: string, comment: string) => {
    return updateReportStatus(reportId, 'draft', comment);
  };

  // Manager gives final approval -> approved
  const managerApprove = async (reportId: string, comment: string) => {
    return updateReportStatus(reportId, 'approved', comment || 'Final approval granted');
  };

  // Manager rejects -> rejected
  const managerReject = async (reportId: string, comment: string) => {
    return updateReportStatus(reportId, 'rejected', comment);
  };

  // Manager sends back to supervisor -> escalated (or pending)
  const managerEscalate = async (reportId: string, comment: string) => {
    return updateReportStatus(reportId, 'pending', comment || 'Sent back for supervisor review');
  };

  // Get comments for a report
  const getComments = async (reportId: string) => {
    try {
      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('report_comments')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Then get profiles for each unique user
      const userIds = [...new Set((commentsData || []).map(c => c.user_id))];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      // Combine comments with profiles
      return (commentsData || []).map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  };

  return {
    addComment,
    updateReportStatus,
    supervisorApprove,
    supervisorReject,
    requestChanges,
    managerApprove,
    managerReject,
    managerEscalate,
    getComments,
  };
}
