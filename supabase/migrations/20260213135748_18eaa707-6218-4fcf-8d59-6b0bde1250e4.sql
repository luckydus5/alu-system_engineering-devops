-- Unlink employees from these departments
UPDATE employees SET department_id = NULL 
WHERE department_id IN (
  'aaaa1111-1111-1111-1111-111111111111', 
  'aaaa2222-2222-2222-2222-222222222222', 
  'aaaa3333-3333-3333-3333-333333333333'
);

-- Delete the 3 departments
DELETE FROM departments WHERE id IN (
  'aaaa1111-1111-1111-1111-111111111111', 
  'aaaa2222-2222-2222-2222-222222222222', 
  'aaaa3333-3333-3333-3333-333333333333'
);