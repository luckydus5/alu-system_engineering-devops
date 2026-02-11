
-- Create employees table for HR-managed employee records (separate from system users)
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number text NOT NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  department_id uuid REFERENCES public.departments(id),
  position_id uuid REFERENCES public.positions(id),
  date_of_birth date,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  employment_status text NOT NULL DEFAULT 'active',
  employment_type text NOT NULL DEFAULT 'full_time',
  gender text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  avatar_url text,
  notes text,
  linked_user_id uuid, -- optional link to auth user profile
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX idx_employees_department ON public.employees(department_id);
CREATE INDEX idx_employees_status ON public.employees(employment_status);
CREATE UNIQUE INDEX idx_employees_number ON public.employees(employee_number);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- HR, admins, super_admins can do everything
CREATE POLICY "HR and admins can manage employees"
ON public.employees FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

-- Managers/directors can view employees in their department
CREATE POLICY "Managers can view department employees"
ON public.employees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.department_id = employees.department_id
    AND ur.role IN ('manager'::app_role, 'director'::app_role, 'supervisor'::app_role)
  )
);

-- All authenticated users can view basic employee info
CREATE POLICY "Authenticated users can view employees"
ON public.employees FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate employee number
CREATE OR REPLACE FUNCTION public.generate_employee_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 'EMP-(\d+)') AS integer)), 0) + 1
  INTO next_num
  FROM public.employees
  WHERE employee_number ~ '^EMP-\d+$';
  
  IF NEW.employee_number IS NULL OR NEW.employee_number = '' THEN
    NEW.employee_number := 'EMP-' || LPAD(next_num::text, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_employee_number
BEFORE INSERT ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.generate_employee_number();
