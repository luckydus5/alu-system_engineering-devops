-- Create table for additional department access (cross-department collaboration)
CREATE TABLE public.user_department_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL,
  granted_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, department_id)
);

-- Enable RLS
ALTER TABLE public.user_department_access ENABLE ROW LEVEL SECURITY;

-- Only admins can manage department access
CREATE POLICY "Only admins can manage department access"
ON public.user_department_access
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view department access
CREATE POLICY "Users can view department access"
ON public.user_department_access
FOR SELECT
USING (true);

-- Update user_in_department function to include additional access
CREATE OR REPLACE FUNCTION public.user_in_department(_user_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND department_id = _department_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_department_access
    WHERE user_id = _user_id
      AND department_id = _department_id
  )
$$;