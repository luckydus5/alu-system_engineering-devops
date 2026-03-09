import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string | null;
  category: 'hardware' | 'software' | 'network' | 'access' | 'equipment_request' | 'maintenance' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'cancelled';
  requesting_department_id: string;
  requested_by: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  requester_name?: string;
  requester_email?: string;
  department_name?: string;
  department_code?: string;
  assignee_name?: string;
}

export interface CreateTicketData {
  title: string;
  description?: string;
  category: SupportTicket['category'];
  priority: SupportTicket['priority'];
  requesting_department_id: string;
}

interface UseSupportTicketsOptions {
  departmentId?: string;
  isITDepartment?: boolean;
  showAllTickets?: boolean;
}

export function useSupportTickets(options: UseSupportTicketsOptions = {}) {
  const { departmentId, isITDepartment = false, showAllTickets = false } = options;
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const generateTicketNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${year}${month}${day}-${random}`;
  };

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          departments:requesting_department_id(name, code)
        `)
        .order('created_at', { ascending: false });

      // If filtering by department and not IT/admin showing all
      if (departmentId && !showAllTickets) {
        query = query.eq('requesting_department_id', departmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch requester profiles
      const requesterIds = [...new Set((data || []).map(t => t.requested_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichedTickets: SupportTicket[] = (data || []).map(ticket => ({
        ...ticket,
        category: ticket.category as SupportTicket['category'],
        priority: ticket.priority as SupportTicket['priority'],
        status: ticket.status as SupportTicket['status'],
        requester_name: profileMap.get(ticket.requested_by)?.full_name || 'Unknown',
        requester_email: profileMap.get(ticket.requested_by)?.email || '',
        department_name: (ticket.departments as any)?.name || 'Unknown',
        department_code: (ticket.departments as any)?.code || '',
      }));

      setTickets(enrichedTickets);
    } catch (error: any) {
      console.error('Error fetching tickets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load support tickets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, departmentId, showAllTickets, toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = useCallback(async (data: CreateTicketData) => {
    if (!user) return null;

    try {
      const ticketData = {
        ...data,
        ticket_number: generateTicketNumber(),
        requested_by: user.id,
        status: 'open' as const,
      };

      const { data: newTicket, error } = await supabase
        .from('support_tickets')
        .insert(ticketData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Ticket Created',
        description: `Your support ticket ${newTicket.ticket_number} has been submitted`,
      });

      await fetchTickets();
      return newTicket;
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create ticket',
        variant: 'destructive',
      });
      return null;
    }
  }, [user, fetchTickets, toast]);

  const updateTicket = useCallback(async (id: string, updates: Partial<SupportTicket>) => {
    try {
      const updateData: any = { ...updates };
      
      // If resolving, set resolved_at and resolved_by
      if (updates.status === 'resolved' || updates.status === 'closed') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Ticket Updated',
        description: 'The ticket has been updated successfully',
      });

      await fetchTickets();
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ticket',
        variant: 'destructive',
      });
    }
  }, [user, fetchTickets, toast]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
    critical: tickets.filter(t => t.priority === 'critical' && t.status !== 'closed' && t.status !== 'resolved').length,
    high: tickets.filter(t => t.priority === 'high' && t.status !== 'closed' && t.status !== 'resolved').length,
  }), [tickets]);

  return {
    tickets,
    loading,
    stats,
    createTicket,
    updateTicket,
    refetch: fetchTickets,
  };
}
