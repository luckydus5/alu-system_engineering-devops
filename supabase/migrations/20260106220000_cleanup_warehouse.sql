-- Remove duplicate WAREHOUSE department, keep only WH
DELETE FROM public.departments WHERE code = 'WAREHOUSE';
