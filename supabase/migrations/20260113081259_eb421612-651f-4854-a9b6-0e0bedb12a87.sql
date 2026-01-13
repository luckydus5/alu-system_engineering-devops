-- Create table for approved signatories (managed by super admin only)
CREATE TABLE IF NOT EXISTS public.item_request_approvers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  position TEXT,
  signature_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for item requests with approval workflow
CREATE TABLE IF NOT EXISTS public.item_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  
  -- Requester info
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  requester_name TEXT NOT NULL,
  requester_department_id UUID REFERENCES public.departments(id),
  
  -- Item details
  item_description TEXT NOT NULL,
  quantity_requested INTEGER NOT NULL DEFAULT 1,
  previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity INTEGER NOT NULL DEFAULT 0,
  usage_purpose TEXT,
  
  -- Approval info
  approved_by_id UUID REFERENCES public.item_request_approvers(id),
  approval_proof_url TEXT,
  approval_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_request_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for item_request_approvers (only super admin can manage)
CREATE POLICY "Super admins can manage approvers"
ON public.item_request_approvers FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated users can view active approvers"
ON public.item_request_approvers FOR SELECT
USING (is_active = true);

-- RLS Policies for item_requests
CREATE POLICY "Super admins can do all on item_requests"
ON public.item_requests FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users in department can view item requests"
ON public.item_requests FOR SELECT
USING (
  user_in_department(auth.uid(), department_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'director'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Supervisors+ can create item requests"
ON public.item_requests FOR INSERT
WITH CHECK (
  (user_in_department(auth.uid(), department_id) AND 
   (has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'director'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role))) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'director'::app_role)
);

CREATE POLICY "Supervisors+ can update item requests"
ON public.item_requests FOR UPDATE
USING (
  (user_in_department(auth.uid(), department_id) AND 
   (has_role(auth.uid(), 'supervisor'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'director'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role))) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'director'::app_role)
);

-- Create storage bucket for approval proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('approval-proofs', 'approval-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for approval proofs
CREATE POLICY "Anyone can view approval proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'approval-proofs');

CREATE POLICY "Authenticated users can upload approval proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'approval-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own approval proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'approval-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Super admins can delete approval proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'approval-proofs' AND has_role(auth.uid(), 'super_admin'::app_role));

-- Create updated_at trigger for item_requests
CREATE TRIGGER update_item_requests_updated_at
BEFORE UPDATE ON public.item_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for item_request_approvers
CREATE TRIGGER update_item_request_approvers_updated_at
BEFORE UPDATE ON public.item_request_approvers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();