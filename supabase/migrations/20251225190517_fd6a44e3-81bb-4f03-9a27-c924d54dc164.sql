-- ============================================
-- Update fleets table to match Excel structure
-- ============================================

-- Add new columns to fleets table
ALTER TABLE public.fleets 
ADD COLUMN IF NOT EXISTS delivery_date DATE,
ADD COLUMN IF NOT EXISTS machine_hours INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_status TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'operational',
ADD COLUMN IF NOT EXISTS remarks TEXT,
ADD COLUMN IF NOT EXISTS checked_by_name TEXT,
ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

-- Create enum for fleet condition
DO $$ BEGIN
  CREATE TYPE public.fleet_condition AS ENUM ('operational', 'good_condition', 'grounded', 'under_repair', 'waiting_parts', 'decommissioned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create fleet_issues table for tracking multiple issues per fleet
CREATE TABLE IF NOT EXISTS public.fleet_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fleet_issues
CREATE INDEX IF NOT EXISTS idx_fleet_issues_fleet_id ON public.fleet_issues(fleet_id);

-- Enable RLS on fleet_issues
ALTER TABLE public.fleet_issues ENABLE ROW LEVEL SECURITY;

-- RLS policies for fleet_issues
CREATE POLICY "Users in department can view fleet issues"
  ON public.fleet_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fleets f
      WHERE f.id = fleet_issues.fleet_id
      AND (
        user_in_department(auth.uid(), f.department_id)
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'director')
      )
    )
  );

CREATE POLICY "Supervisors+ can create fleet issues"
  ON public.fleet_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.fleets f
      WHERE f.id = fleet_issues.fleet_id
      AND (
        (user_in_department(auth.uid(), f.department_id) AND (
          has_role(auth.uid(), 'supervisor') OR
          has_role(auth.uid(), 'manager') OR
          has_role(auth.uid(), 'director') OR
          has_role(auth.uid(), 'admin')
        ))
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'director')
      )
    )
  );

CREATE POLICY "Supervisors+ can update fleet issues"
  ON public.fleet_issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.fleets f
      WHERE f.id = fleet_issues.fleet_id
      AND (
        (user_in_department(auth.uid(), f.department_id) AND (
          has_role(auth.uid(), 'supervisor') OR
          has_role(auth.uid(), 'manager') OR
          has_role(auth.uid(), 'director') OR
          has_role(auth.uid(), 'admin')
        ))
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'director')
      )
    )
  );

CREATE POLICY "Supervisors+ can delete fleet issues"
  ON public.fleet_issues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.fleets f
      WHERE f.id = fleet_issues.fleet_id
      AND (
        (user_in_department(auth.uid(), f.department_id) AND (
          has_role(auth.uid(), 'supervisor') OR
          has_role(auth.uid(), 'manager') OR
          has_role(auth.uid(), 'director') OR
          has_role(auth.uid(), 'admin')
        ))
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'director')
      )
    )
  );

-- Trigger for updated_at on fleet_issues
CREATE TRIGGER update_fleet_issues_updated_at
  BEFORE UPDATE ON public.fleet_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();