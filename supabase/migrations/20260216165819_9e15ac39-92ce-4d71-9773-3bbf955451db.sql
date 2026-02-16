
-- Add is_hr_only flag to departments to separate HR classification departments from operational departments
ALTER TABLE public.departments ADD COLUMN is_hr_only boolean NOT NULL DEFAULT false;

-- Mark the HR-only classification departments
UPDATE public.departments SET is_hr_only = true WHERE code IN ('FIN', 'CONST', 'PROC', 'SAFETY', 'ADM');
