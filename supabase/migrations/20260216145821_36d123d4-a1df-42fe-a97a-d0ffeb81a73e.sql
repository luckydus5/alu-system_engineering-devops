-- Add missing HR classification departments under HQ Power
INSERT INTO departments (name, code, company_id, description) VALUES 
('Finance', 'FIN', '51f11cc8-cf98-44e8-b545-032c1b34b1c0', 'Finance Department'),
('Construction', 'CONST', '51f11cc8-cf98-44e8-b545-032c1b34b1c0', 'Construction Department'),
('Procurement', 'PROC', '51f11cc8-cf98-44e8-b545-032c1b34b1c0', 'Procurement Department'),
('Safety', 'SAFETY', '51f11cc8-cf98-44e8-b545-032c1b34b1c0', 'Safety Department'),
('Administration', 'ADM', '51f11cc8-cf98-44e8-b545-032c1b34b1c0', 'Administration Department');

-- Also link existing IT, HR departments to HQ Power if not already
UPDATE departments SET company_id = '51f11cc8-cf98-44e8-b545-032c1b34b1c0' WHERE company_id IS NULL;