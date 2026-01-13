import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { clearInventoryCache } from '@/hooks/useInventory';

export interface ItemRequestApprover {
  id: string;
  full_name: string;
  position: string | null;
  signature_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RequestedItem {
  item_id: string;
  item_name: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
}

export interface ItemRequest {
  id: string;
  department_id: string;
  inventory_item_id: string | null;
  requester_id: string;
  requester_name: string;
  requester_department_id: string | null;
  requester_department_text: string | null;
  item_description: string;
  quantity_requested: number;
  previous_quantity: number;
  new_quantity: number;
  usage_purpose: string | null;
  approved_by_id: string | null;
  approval_proof_url: string | null;
  approval_date: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
  requested_items: RequestedItem[] | null;
  // Joined fields
  approver_name?: string;
  requester_department_name?: string;
}

export function useItemRequests(departmentId: string | undefined) {
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    if (!departmentId) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await (supabase as any)
        .from('item_requests')
        .select(`
          *,
          item_request_approvers (full_name, position),
          departments!item_requests_requester_department_id_fkey (name)
        `)
        .eq('department_id', departmentId)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('item_requests table not found, skipping...');
          setRequests([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      const formattedRequests: ItemRequest[] = (data || []).map((r: any) => ({
        ...r,
        approver_name: r.item_request_approvers?.full_name || null,
        requester_department_name: r.departments?.name || r.requester_department_text || null,
      }));

      setRequests(formattedRequests);
    } catch (error: any) {
      console.error('Error fetching item requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = async (data: {
    department_id: string;
    inventory_item_id?: string | null;
    requester_name: string;
    requester_department_id?: string | null;
    requester_department_text?: string | null;
    item_description: string;
    quantity_requested: number;
    previous_quantity: number;
    new_quantity: number;
    usage_purpose?: string;
    approved_by_id: string;
    approval_proof_url: string;
    notes?: string;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await (supabase as any)
        .from('item_requests')
        .insert({
          ...data,
          requester_id: userData.user.id,
          status: 'completed',
          approval_date: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Item request recorded successfully',
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      console.error('Error creating item request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create item request',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteRequest = async (requestId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('item_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Item request deleted successfully',
      });

      await fetchRequests();
      return true;
    } catch (error: any) {
      console.error('Error deleting item request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item request',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    requests,
    loading,
    createRequest,
    deleteRequest,
    refetch: fetchRequests,
  };
}

// Lightweight hook for creating item requests without fetching all requests
export function useCreateItemRequest() {
  const { toast } = useToast();

  const createRequest = async (data: {
    department_id: string;
    inventory_item_id?: string | null;
    requester_name: string;
    requester_department_id?: string | null;
    item_description: string;
    quantity_requested: number;
    previous_quantity: number;
    new_quantity: number;
    usage_purpose?: string;
    approved_by_id: string;
    approval_proof_url: string;
    notes?: string;
    requested_items?: Array<{
      id: string;
      item_number: string;
      item_name: string;
      quantity: number;
      previous_quantity: number;
      new_quantity: number;
    }>;
  }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Extract requested_items for separate handling
      const { requested_items, ...requestData } = data;

      // Insert the item request record
      const { error: requestError } = await (supabase as any)
        .from('item_requests')
        .insert({
          ...requestData,
          requested_items: requested_items || null,
          requester_id: userData.user.id,
          status: 'completed',
          approval_date: new Date().toISOString(),
        });

      if (requestError) throw requestError;

      // For multi-item requests, reduce each item's inventory
      if (requested_items && requested_items.length > 0) {
        for (const item of requested_items) {
          await (supabase as any)
            .rpc('reduce_item_quantity', {
              p_item_id: item.id,
              p_new_quantity: item.new_quantity
            });
        }
      }
      
      // Clear the inventory cache so the UI refreshes with new quantity
      clearInventoryCache();

      toast({
        title: 'Success',
        description: `Item request recorded (${requested_items?.length || 1} items)`,
      });

      return true;
    } catch (error: any) {
      console.error('Error creating item request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create item request',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { createRequest };
}

export function useItemRequestApprovers(enabled: boolean = true) {
  const [approvers, setApprovers] = useState<ItemRequestApprover[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchApprovers = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const { data, error } = await (supabase as any)
        .from('item_request_approvers')
        .select('*')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('item_request_approvers table not found, skipping...');
          setApprovers([]);
          setLoading(false);
          return;
        }
        throw error;
      }

      setApprovers(data || []);
    } catch (error: any) {
      console.error('Error fetching approvers:', error);
      setApprovers([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchApprovers();
  }, [fetchApprovers]);

  const createApprover = async (data: { full_name: string; position?: string }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await (supabase as any)
        .from('item_request_approvers')
        .insert({
          ...data,
          created_by: userData.user?.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Approver added successfully',
      });

      await fetchApprovers();
      return true;
    } catch (error: any) {
      console.error('Error creating approver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add approver',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteApprover = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('item_request_approvers')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Approver removed successfully',
      });

      await fetchApprovers();
      return true;
    } catch (error: any) {
      console.error('Error deleting approver:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove approver',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    approvers,
    loading,
    createApprover,
    deleteApprover,
    refetch: fetchApprovers,
  };
}
