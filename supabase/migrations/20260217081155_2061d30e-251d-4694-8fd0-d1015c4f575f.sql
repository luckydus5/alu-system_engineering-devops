-- Update employee number generation to also auto-set fingerprint_number
-- The fingerprint_number should be the numeric part of the employee_number (e.g. EMP-0032 → 32)
-- This ensures it matches the "No." column in attendance fingerprint uploads

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

  -- Auto-set fingerprint_number from the numeric part of employee_number if not already set
  IF NEW.fingerprint_number IS NULL OR NEW.fingerprint_number = '' THEN
    NEW.fingerprint_number := CAST(CAST(SUBSTRING(NEW.employee_number FROM 'EMP-0*(\d+)') AS integer) AS text);
  END IF;
  
  RETURN NEW;
END;
$$;