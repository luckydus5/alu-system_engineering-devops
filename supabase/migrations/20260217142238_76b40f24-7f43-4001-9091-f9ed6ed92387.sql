
-- Create missing HQ Peat departments with unique names
INSERT INTO departments (name, code, company_id, is_hr_only, description) VALUES
  ('Peat Administration', 'ADMN_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', true, 'HQ Peat Administration'),
  ('Peat Operations', 'OPS_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', false, 'HQ Peat Operations');

-- Insert ADMN employees
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Ndamukunda Flavien', 'HP-0097', '97'),
  ('Nsabimana Abikunda I', 'HP-0207', '207'),
  ('Hakizimana Diogene', 'HP-0211', '211'),
  ('Karihanze Themistocle', 'HP-0249', '249'),
  ('Ukwishaka Jean Aime', 'HP-0251', '251'),
  ('Nzabamwita Pascal', 'HP-0272', '272'),
  ('Tuyisabe Jean Damascene', 'HP-0276', '276'),
  ('Ndandari Blaise', 'HP-0277', '277'),
  ('Ndayizeye Pascal', 'HP-0278', '278'),
  ('Ngabo Karake', 'HP-0301', '301'),
  ('Mbarushimana Vedaste', 'HP-0395', '395'),
  ('Mbarushimana Vedaste', 'HP-1000', '1000'),
  ('Bakundufite Alphonsine', 'HP-2345', '2345'),
  ('Dusabamahoro Olivier', 'HP-2370', '2370'),
  ('Manzi David', 'HP-2373', '2373')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'ADMN_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- Insert OPERATORS employees
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Nzayinambaho James', 'HP-0209', '209'),
  ('Habimana Justin', 'HP-0210', '210'),
  ('Niyonkuru Anicet', 'HP-0212', '212'),
  ('Bakomeza Gideon', 'HP-0215', '215'),
  ('Ndindiriyimana Innocent', 'HP-0218', '218'),
  ('Tuyishimire Dieudonne', 'HP-0219', '219'),
  ('Uwayezu Jean Claude', 'HP-0221', '221'),
  ('Ruganintwali Saleh', 'HP-0222', '222'),
  ('Nsengiyumva Innocent', 'HP-0226', '226'),
  ('Nsengiyumva Didier F', 'HP-0227', '227'),
  ('Ndungutse Jean Baptiste', 'HP-0232', '232'),
  ('Bucyana Richard', 'HP-0242', '242'),
  ('Mbabazi Dieudonne', 'HP-0250', '250'),
  ('Nteziyaremye Jean Pierre', 'HP-0252', '252'),
  ('Sibomana Jeremie Issa', 'HP-0269', '269'),
  ('Kagabo Clement', 'HP-0279', '279'),
  ('Ndindiriyimana Emmanuel', 'HP-0281', '281'),
  ('Rwemera Baptiste', 'HP-0282', '282'),
  ('Ishimwe Jonathan', 'HP-0284', '284'),
  ('Murigande', 'HP-0289', '289'),
  ('Tuyihanzamaso Ignace', 'HP-0290', '290'),
  ('Nsanzimana Jean Nepomuscene', 'HP-0291', '291'),
  ('Ndacyayisaba Jackson', 'HP-0293', '293'),
  ('Mukunzi Jean Bosco', 'HP-0294', '294'),
  ('Manishimwe', 'HP-0303', '303'),
  ('Ntawukuriryayo Gaspard', 'HP-0304', '304'),
  ('Manirarora Alphonse', 'HP-0305', '305'),
  ('Niyonsenga Anaclet', 'HP-0311', '311'),
  ('Twagirayesu Sosthene', 'HP-0314', '314'),
  ('Hakizimana Francois', 'HP-0315', '315'),
  ('Kayombya Claude', 'HP-0317', '317'),
  ('Rwarinda Jean de Dieu', 'HP-2352', '2352'),
  ('Ndemezo Andre', 'HP-2364', '2364'),
  ('Uwimpuhwe Beyse', 'HP-2366', '2366'),
  ('Tuyizere Faustin', 'HP-2375', '2375'),
  ('Nshimiyimana Samuel', 'HP-2376', '2376'),
  ('Turikubwimana Theoneste', 'HP-2378', '2378')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'OPS_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';
