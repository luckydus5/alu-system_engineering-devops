-- Remove auto-generation of fingerprint_number from employee number trigger
-- Fingerprint numbers should be manually set to match real device numbers
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
  
  -- No longer auto-set fingerprint_number - it should be manually entered to match the real device
  RETURN NEW;
END;
$$;