
-- Add hr_approved to leave_status enum
ALTER TYPE public.leave_status ADD VALUE IF NOT EXISTS 'hr_approved' AFTER 'pending';

-- Create company_leave_workflows table
CREATE TABLE public.company_leave_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  hr_review_enabled boolean NOT NULL DEFAULT true,
  manager_review_enabled boolean NOT NULL DEFAULT true,
  final_approver_role text NOT NULL DEFAULT 'either' CHECK (final_approver_role IN ('gm', 'om', 'either')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_leave_workflows ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view workflows"
  ON public.company_leave_workflows FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage workflows"
  ON public.company_leave_workflows FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage workflows"
  ON public.company_leave_workflows FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_company_leave_workflows_updated_at
  BEFORE UPDATE ON public.company_leave_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
