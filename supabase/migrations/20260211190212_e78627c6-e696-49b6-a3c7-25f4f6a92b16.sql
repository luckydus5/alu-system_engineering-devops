
-- Create companies table with parent-child hierarchy
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS: All authenticated users can view companies
CREATE POLICY "Authenticated users can view companies"
ON public.companies FOR SELECT
USING (true);

-- RLS: Only super_admin/admin can manage companies
CREATE POLICY "Admins can manage companies"
ON public.companies FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add company_id to departments
ALTER TABLE public.departments ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add company_id to employees
ALTER TABLE public.employees ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add delegation fields to leave_requests
-- submitted_by_id: who actually submitted (HR/supervisor filing on behalf)
-- employee_id: the employee this leave is for (links to employees table, for non-system-users)
ALTER TABLE public.leave_requests ADD COLUMN submitted_by_id UUID;
ALTER TABLE public.leave_requests ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.leave_requests ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Update trigger
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
