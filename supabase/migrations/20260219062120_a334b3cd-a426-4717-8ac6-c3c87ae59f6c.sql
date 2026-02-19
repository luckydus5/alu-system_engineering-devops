
-- Add Mechanical department (HR-only classification, like Warehouse)
INSERT INTO public.departments (name, code, description, is_hr_only)
VALUES ('Mechanical', 'MECH', 'Mechanical department', true)
ON CONFLICT (code) DO NOTHING;

-- Add Mechanical and Electrical Engineer positions
INSERT INTO public.positions (name, description, level, is_active)
VALUES 
  ('Mechanical', 'Mechanical department role', 3, true),
  ('Electrical Engineer', 'Electrical engineering role', 3, true)
ON CONFLICT DO NOTHING;
