
-- Create departments for the three companies
INSERT INTO departments (id, name, code, description, company_id, icon, color) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'HQ Power', 'HQPWR', 'HQ Power department', '51f11cc8-cf98-44e8-b545-032c1b34b1c0', 'Zap', '#f59e0b'),
  ('aaaa2222-2222-2222-2222-222222222222', 'HQ Service', 'HQSVC', 'HQ Service department', '07d543a6-9403-4156-931c-b77933ded242', 'Wrench', '#3b82f6'),
  ('aaaa3333-3333-3333-3333-333333333333', 'HQ Peat', 'HQPEAT', 'HQ Peat department', '1e1a6299-9342-44b4-9912-cf702b1c85bf', 'Leaf', '#22c55e')
ON CONFLICT DO NOTHING;

-- Update HQ Power employees (company_id = 51f11cc8...)
UPDATE employees SET department_id = 'aaaa1111-1111-1111-1111-111111111111'
WHERE company_id = '51f11cc8-cf98-44e8-b545-032c1b34b1c0';

-- Update HQ Service employees (company_id = 07d543a6...)
UPDATE employees SET department_id = 'aaaa2222-2222-2222-2222-222222222222'
WHERE company_id = '07d543a6-9403-4156-931c-b77933ded242';

-- Update HQ Peat employees (company_id = 1e1a6299...)
UPDATE employees SET department_id = 'aaaa3333-3333-3333-3333-333333333333'
WHERE company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';
