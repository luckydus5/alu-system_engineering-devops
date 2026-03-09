
-- Replace the employee number generator to be company-aware
CREATE OR REPLACE FUNCTION public.generate_employee_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  company_prefix TEXT;
  next_num INTEGER;
  fp_num TEXT;
BEGIN
  -- Determine prefix based on company
  IF NEW.company_id IS NOT NULL THEN
    SELECT 
      CASE 
        WHEN name = 'HQ Peat' THEN 'HP'
        WHEN name = 'HQ Power' THEN 'HQ'
        WHEN name = 'HQ Service' THEN 'HS'
        WHEN name = 'Farmers' THEN 'FM'
        ELSE UPPER(LEFT(code, 2))
      END INTO company_prefix
    FROM companies WHERE id = NEW.company_id;
  END IF;
  
  company_prefix := COALESCE(company_prefix, 'EMP');

  -- If fingerprint_number is set, use it for employee_number
  fp_num := NEW.fingerprint_number;
  IF fp_num IS NOT NULL AND fp_num != '' THEN
    NEW.employee_number := company_prefix || '-' || LPAD(fp_num, 4, '0');
  ELSIF NEW.employee_number IS NULL OR NEW.employee_number = '' THEN
    -- Auto-generate next number for this company
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(employee_number FROM company_prefix || '-(\d+)') AS integer)
    ), 0) + 1
    INTO next_num
    FROM employees
    WHERE employee_number ~ ('^' || company_prefix || '-\d+$')
      AND (company_id = NEW.company_id OR (NEW.company_id IS NULL AND company_id IS NULL));
    
    NEW.employee_number := company_prefix || '-' || LPAD(next_num::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$function$;

-- Also update employee_number on UPDATE if fingerprint or company changes
CREATE OR REPLACE FUNCTION public.update_employee_number_on_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  company_prefix TEXT;
  fp_num TEXT;
BEGIN
  -- Only act if fingerprint_number or company_id changed
  IF (OLD.fingerprint_number IS DISTINCT FROM NEW.fingerprint_number) 
     OR (OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
    
    IF NEW.company_id IS NOT NULL THEN
      SELECT 
        CASE 
          WHEN name = 'HQ Peat' THEN 'HP'
          WHEN name = 'HQ Power' THEN 'HQ'
          WHEN name = 'HQ Service' THEN 'HS'
          WHEN name = 'Farmers' THEN 'FM'
          ELSE UPPER(LEFT(code, 2))
        END INTO company_prefix
      FROM companies WHERE id = NEW.company_id;
    END IF;
    
    company_prefix := COALESCE(company_prefix, 'EMP');
    fp_num := NEW.fingerprint_number;
    
    IF fp_num IS NOT NULL AND fp_num != '' THEN
      NEW.employee_number := company_prefix || '-' || LPAD(fp_num, 4, '0');
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop existing trigger if any, then create both triggers
DROP TRIGGER IF EXISTS set_employee_number ON employees;
DROP TRIGGER IF EXISTS update_employee_number_trigger ON employees;

CREATE TRIGGER set_employee_number
  BEFORE INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_number();

CREATE TRIGGER update_employee_number_trigger
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_number_on_change();
