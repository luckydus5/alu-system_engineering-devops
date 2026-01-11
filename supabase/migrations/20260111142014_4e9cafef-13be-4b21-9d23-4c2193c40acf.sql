-- Create support tickets table for cross-department IT requests
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number VARCHAR NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR NOT NULL DEFAULT 'general',
  priority VARCHAR NOT NULL DEFAULT 'medium',
  status VARCHAR NOT NULL DEFAULT 'open',
  requesting_department_id UUID NOT NULL REFERENCES public.departments(id),
  requested_by UUID NOT NULL,
  assigned_to UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT category_check CHECK (category IN ('hardware', 'software', 'network', 'access', 'equipment_request', 'maintenance', 'other')),
  CONSTRAINT priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT status_check CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create unique index for ticket numbers
CREATE UNIQUE INDEX idx_support_tickets_number ON public.support_tickets(ticket_number);

-- Indexes for faster queries
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_requested_by ON public.support_tickets(requested_by);
CREATE INDEX idx_support_tickets_department ON public.support_tickets(requesting_department_id);

-- RLS Policies

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (requested_by = auth.uid());

-- Users in requesting department can view tickets
CREATE POLICY "Users in department can view tickets" 
ON public.support_tickets 
FOR SELECT 
USING (user_in_department(auth.uid(), requesting_department_id));

-- IT department can view all tickets (IT department code is 'IT')
CREATE POLICY "IT department can view all tickets" 
ON public.support_tickets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'IT'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'director'::app_role)
);

-- Users can create tickets in their department
CREATE POLICY "Users can create tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (requested_by = auth.uid());

-- IT department or admins can update tickets
CREATE POLICY "IT and admins can update tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'IT'
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Super admins can do anything
CREATE POLICY "Super admins can do all on support_tickets" 
ON public.support_tickets 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create stock_transaction_details table to track item handovers
ALTER TABLE public.stock_transactions 
ADD COLUMN IF NOT EXISTS handed_to_user_id UUID,
ADD COLUMN IF NOT EXISTS handed_to_department_id UUID REFERENCES public.departments(id),
ADD COLUMN IF NOT EXISTS requested_by_user_id UUID,
ADD COLUMN IF NOT EXISTS support_ticket_id UUID REFERENCES public.support_tickets(id);