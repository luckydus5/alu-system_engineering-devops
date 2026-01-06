-- Grant olivierdusa5@gmail.com access to all departments
INSERT INTO user_department_access (user_id, department_id, granted_by)
VALUES 
  ('fe8bf810-0173-4e0a-acbd-8bf63ebf190a', '11111111-1111-1111-1111-111111111111', 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a'),
  ('fe8bf810-0173-4e0a-acbd-8bf63ebf190a', '22222222-2222-2222-2222-222222222222', 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a'),
  ('fe8bf810-0173-4e0a-acbd-8bf63ebf190a', '33333333-3333-3333-3333-333333333333', 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a'),
  ('fe8bf810-0173-4e0a-acbd-8bf63ebf190a', '44444444-4444-4444-4444-444444444444', 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a'),
  ('fe8bf810-0173-4e0a-acbd-8bf63ebf190a', '55555555-5555-5555-5555-555555555555', 'fe8bf810-0173-4e0a-acbd-8bf63ebf190a')
ON CONFLICT DO NOTHING;