
-- Table to store weekend duty assignments
CREATE TABLE public.weekend_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  is_off_duty boolean NOT NULL DEFAULT false,
  assigned_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, week_start_date)
);

ALTER TABLE public.weekend_schedules ENABLE ROW LEVEL SECURITY;

-- HR and admins can manage
CREATE POLICY "HR and admins can manage weekend_schedules"
ON public.weekend_schedules FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  EXISTS (
    SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

-- Authenticated users can view
CREATE POLICY "Authenticated users can view weekend_schedules"
ON public.weekend_schedules FOR SELECT
USING (true);

-- Managers can view
CREATE POLICY "Managers can view weekend_schedules"
ON public.weekend_schedules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('manager', 'director', 'supervisor')
  )
);
