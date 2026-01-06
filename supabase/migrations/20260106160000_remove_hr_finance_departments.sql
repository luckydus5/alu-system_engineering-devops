-- Remove HR and Finance departments
-- First remove any user_department_access entries for these departments
DELETE FROM public.user_department_access 
WHERE department_id IN (
  SELECT id FROM public.departments WHERE code IN ('HR', 'FIN')
);

-- Remove any reports linked to these departments
DELETE FROM public.reports 
WHERE department_id IN (
  SELECT id FROM public.departments WHERE code IN ('HR', 'FIN')
);

-- Remove any notifications linked to these departments
DELETE FROM public.notifications 
WHERE department_id IN (
  SELECT id FROM public.departments WHERE code IN ('HR', 'FIN')
);

-- Finally remove the departments themselves
DELETE FROM public.departments WHERE code IN ('HR', 'FIN');
