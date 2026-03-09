-- Add missing departments for HR classification
INSERT INTO public.departments (name, code, is_hr_only, description)
VALUES 
  ('Electrical', 'ELEC_P', true, 'Electrical department'),
  ('Welders', 'WELD_P', true, 'Welders department'),
  ('C&I', 'CI_P', true, 'Control & Instrumentation department')
ON CONFLICT (code) DO NOTHING;