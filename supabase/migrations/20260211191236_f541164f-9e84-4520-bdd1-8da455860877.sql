
-- Insert parent company
INSERT INTO companies (name, code, description, is_active)
VALUES ('HQ Power', 'HQP', 'Parent company - HQ Power Group', true);

-- Insert subsidiaries
INSERT INTO companies (name, code, parent_id, description, is_active)
VALUES 
  ('HQ Peat', 'HQPEAT', (SELECT id FROM companies WHERE code = 'HQP'), 'Peat operations subsidiary', true),
  ('HQ Service', 'HQSVC', (SELECT id FROM companies WHERE code = 'HQP'), 'Service subsidiary', true),
  ('Farmers', 'FARM', (SELECT id FROM companies WHERE code = 'HQP'), 'Farming operations subsidiary', true);
