
-- Fix all existing EMP- prefixed employee numbers for HQ Power employees
-- Use the fingerprint_number to build correct HQ-XXXX format
UPDATE employees
SET employee_number = 'HQ-' || LPAD(fingerprint_number, 4, '0')
WHERE employee_number LIKE 'EMP-%'
  AND company_id = '51f11cc8-cf98-44e8-b545-032c1b34b1c0'
  AND fingerprint_number IS NOT NULL
  AND fingerprint_number != '';

-- For any remaining EMP- without fingerprint, use sequential numbering
UPDATE employees
SET employee_number = 'HQ-' || LPAD(
  SUBSTRING(employee_number FROM 'EMP-(\d+)')::text, 4, '0'
)
WHERE employee_number LIKE 'EMP-%'
  AND company_id = '51f11cc8-cf98-44e8-b545-032c1b34b1c0';

-- Fix any other companies that might have EMP- prefix
UPDATE employees
SET employee_number = 'HP-' || LPAD(fingerprint_number, 4, '0')
WHERE employee_number LIKE 'EMP-%'
  AND company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf'
  AND fingerprint_number IS NOT NULL;

UPDATE employees
SET employee_number = 'HS-' || LPAD(fingerprint_number, 4, '0')
WHERE employee_number LIKE 'EMP-%'
  AND company_id = '07d543a6-9403-4156-931c-b77933ded242'
  AND fingerprint_number IS NOT NULL;

UPDATE employees
SET employee_number = 'FM-' || LPAD(fingerprint_number, 4, '0')
WHERE employee_number LIKE 'EMP-%'
  AND company_id = 'eacdba4c-68cd-4a4f-acfb-517680c580d7'
  AND fingerprint_number IS NOT NULL;
