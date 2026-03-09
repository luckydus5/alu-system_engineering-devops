-- Backfill fingerprint_number for existing employees that don't have one set
UPDATE public.employees
SET fingerprint_number = CAST(CAST(SUBSTRING(employee_number FROM 'EMP-0*(\d+)') AS integer) AS text)
WHERE (fingerprint_number IS NULL OR fingerprint_number = '')
  AND employee_number ~ '^EMP-\d+$';