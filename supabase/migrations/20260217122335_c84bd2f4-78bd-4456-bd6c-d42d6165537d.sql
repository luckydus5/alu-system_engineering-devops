
-- Drop the global unique constraint on fingerprint_number since different companies 
-- can have the same biometric device IDs (e.g., HQ Power #29 and HQ Peat #29 are different people)
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_fingerprint_number_unique;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_fingerprint_number_key;

-- Add a unique constraint per company instead
CREATE UNIQUE INDEX employees_fingerprint_company_unique 
ON employees (fingerprint_number, company_id) 
WHERE fingerprint_number IS NOT NULL AND company_id IS NOT NULL;
