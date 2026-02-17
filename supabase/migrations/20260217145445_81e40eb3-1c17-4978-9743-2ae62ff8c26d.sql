
-- Fix remaining 2 HQ Service employees without fingerprint numbers
UPDATE employees SET employee_number = 'HS-0007'
WHERE id = '9f5a7291-2ee9-4971-aad6-168cee15ba7f';

UPDATE employees SET employee_number = 'HS-0009'
WHERE id = '13446873-6214-43df-b6f3-7b233db0153f';
