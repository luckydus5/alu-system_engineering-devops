-- Previous migration failed with: ERROR: 42710: constraint "fleets_operator_id_fkey" for relation "fleets" already exists
-- Re-apply safely (idempotent) while still fixing fleets RLS.

-- Fix RLS for fleets so admins/directors can create/update without explicit department membership
DROP POLICY IF EXISTS "Supervisors+ can create fleets" ON public.fleets;
CREATE POLICY "Supervisors+ can create fleets"
ON public.fleets
FOR INSERT
WITH CHECK (
  (
    user_in_department(auth.uid(), department_id)
    AND (
      has_role(auth.uid(), 'supervisor'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'director'::app_role)
);

DROP POLICY IF EXISTS "Supervisors+ can update fleets" ON public.fleets;
CREATE POLICY "Supervisors+ can update fleets"
ON public.fleets
FOR UPDATE
USING (
  (
    user_in_department(auth.uid(), department_id)
    AND (
      has_role(auth.uid(), 'supervisor'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'director'::app_role)
)
WITH CHECK (
  (
    user_in_department(auth.uid(), department_id)
    AND (
      has_role(auth.uid(), 'supervisor'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'director'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'director'::app_role)
);

-- Constraints / FKs (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fleets_department_fleet_number_key') THEN
    ALTER TABLE public.fleets
      ADD CONSTRAINT fleets_department_fleet_number_key UNIQUE (department_id, fleet_number);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fleets_operator_id_fkey') THEN
    ALTER TABLE public.fleets
      ADD CONSTRAINT fleets_operator_id_fkey
      FOREIGN KEY (operator_id) REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_records_operator_id_fkey') THEN
    ALTER TABLE public.maintenance_records
      ADD CONSTRAINT maintenance_records_operator_id_fkey
      FOREIGN KEY (operator_id) REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_records_checked_by_fkey') THEN
    ALTER TABLE public.maintenance_records
      ADD CONSTRAINT maintenance_records_checked_by_fkey
      FOREIGN KEY (checked_by) REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_fleets_department_status
  ON public.fleets (department_id, status);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_department_date
  ON public.maintenance_records (department_id, maintenance_date DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_records_fleet_date
  ON public.maintenance_records (fleet_id, maintenance_date DESC);

-- Keep updated_at accurate
DROP TRIGGER IF EXISTS update_fleets_updated_at ON public.fleets;
CREATE TRIGGER update_fleets_updated_at
BEFORE UPDATE ON public.fleets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_records_updated_at ON public.maintenance_records;
CREATE TRIGGER update_maintenance_records_updated_at
BEFORE UPDATE ON public.maintenance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
