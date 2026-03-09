-- Create audit trail table for fleet changes
CREATE TABLE public.fleet_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fleet_id uuid REFERENCES public.fleets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fleet_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit log
CREATE POLICY "Users in department can view audit logs"
ON public.fleet_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM fleets f
    WHERE f.id = fleet_audit_log.fleet_id
    AND (user_in_department(auth.uid(), f.department_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role))
  )
);

CREATE POLICY "Users in department can create audit logs"
ON public.fleet_audit_log
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM fleets f
    WHERE f.id = fleet_audit_log.fleet_id
    AND (user_in_department(auth.uid(), f.department_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'director'::app_role))
  )
);

-- Add resolved_by column to fleet_issues for audit trail
ALTER TABLE public.fleet_issues ADD COLUMN resolved_by uuid;