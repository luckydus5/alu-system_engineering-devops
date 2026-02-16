
-- Add fingerprint_number column to employees table
ALTER TABLE public.employees ADD COLUMN fingerprint_number text NULL;

-- Create index for fast lookups during attendance import
CREATE INDEX idx_employees_fingerprint_number ON public.employees (fingerprint_number) WHERE fingerprint_number IS NOT NULL;

-- Add unique constraint (each fingerprint number should be unique)
ALTER TABLE public.employees ADD CONSTRAINT employees_fingerprint_number_unique UNIQUE (fingerprint_number);
