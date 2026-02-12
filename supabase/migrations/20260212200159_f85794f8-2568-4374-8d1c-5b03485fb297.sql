
-- Create leave approver roles enum
CREATE TYPE public.leave_approver_role AS ENUM ('peat_manager', 'hr_reviewer', 'gm_approver', 'om_approver');

-- Create leave_approvers table for approval chain configuration
CREATE TABLE public.leave_approvers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  approver_role leave_approver_role NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, approver_role)
);

-- Enable RLS
ALTER TABLE public.leave_approvers ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active approvers
CREATE POLICY "Authenticated users can view leave_approvers"
  ON public.leave_approvers FOR SELECT
  USING (true);

-- Super admins can manage
CREATE POLICY "Super admins can manage leave_approvers"
  ON public.leave_approvers FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_leave_approvers_updated_at
  BEFORE UPDATE ON public.leave_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
