
-- Step 1: Create HQ Peat departments (if not exist)
-- HQ Peat company_id: 1e1a6299-9342-44b4-9912-cf702b1c85bf

INSERT INTO departments (name, code, company_id, is_hr_only, description) VALUES
  ('Administration', 'ADMN', '1e1a6299-9342-44b4-9912-cf702b1c85bf', true, 'HQ Peat Administration'),
  ('Maintenance', 'MAINT_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', false, 'HQ Peat Maintenance'),
  ('Operations', 'OPS_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', false, 'HQ Peat Operations'),
  ('Cleaners', 'CLEAN_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', true, 'HQ Peat Cleaners'),
  ('Pump Assistants', 'PUMP_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', true, 'HQ Peat Pump Assistants'),
  ('Laboratory', 'LAB_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', true, 'HQ Peat Laboratory'),
  ('CD & SE', 'CDSE_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', true, 'HQ Peat Community Development & Social Enterprise'),
  ('YUMN Guards', 'GUARD_P', '1e1a6299-9342-44b4-9912-cf702b1c85bf', true, 'HQ Peat Security Guards')
ON CONFLICT DO NOTHING;

-- Step 2: Delete existing HQ Peat employees
DELETE FROM employees WHERE company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- Step 3: Insert all employees with department references
-- Using subqueries to resolve department_id by code+company

-- ADMN department
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
CROSS JOIN departments d WHERE d.code = 'ADMN' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- MAINTENANCE department
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Sindikubwabo', 'HP-0186', '186'),
  ('Ndacyayisenga J Pierre', 'HP-0223', '223'),
  ('Iyakaremye Augustin', 'HP-0224', '224'),
  ('Rukundo Moise', 'HP-0225', '225'),
  ('Rubayiza Jean de Dieu', 'HP-0228', '228'),
  ('Manirareba Manasseh', 'HP-0231', '231'),
  ('Gatete Jimmy', 'HP-0239', '239'),
  ('Nzeyimana Jean Claude', 'HP-0245', '245'),
  ('Kagabo Noel', 'HP-0247', '247'),
  ('Mushimiyimana Eric', 'HP-0306', '306'),
  ('Nkangura Damascene', 'HP-0307', '307'),
  ('Mamitiana R', 'HP-0309', '309'),
  ('Macumi JMV', 'HP-0358', '358'),
  ('Mikael Larsson', 'HP-2356', '2356')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'MAINT_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- OPERATORS department
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

-- CLEANERS department
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Nyiramana Aline', 'HP-0053', '53'),
  ('Christine Munkurize', 'HP-0287', '287'),
  ('Musoni Eurade', 'HP-0319', '319'),
  ('Hakorimana Gaspard', 'HP-0321', '321'),
  ('Uwubahimana Illuminee', 'HP-2374', '2374'),
  ('Mukankaka Ernestine', 'HP-2379', '2379')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'CLEAN_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- Pump Assistants
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Muhirwa', 'HP-0084', '84'),
  ('Sebatesi Augustin', 'HP-0285', '285'),
  ('Zirimwabagabo Alphonse', 'HP-0286', '286')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'PUMP_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- LAB department
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Jovanice Kasheeka', 'HP-2330', '2330'),
  ('Theophile Tuyishimire', 'HP-2337', '2337'),
  ('Vumilia Umutoni', 'HP-2338', '2338'),
  ('Pascal Ntakirutimana', 'HP-2340', '2340'),
  ('Yvette Kanzayire', 'HP-2369', '2369')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'LAB_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- CD&SE department
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Nkuranga Emmanuel', 'HP-0267', '267'),
  ('Superiano Gatera', 'HP-2333', '2333'),
  ('Dina Mukabyiringiro', 'HP-2336', '2336'),
  ('Mukarwego Mediatrice', 'HP-2380', '2380')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'CDSE_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';

-- YUMN GUARDS department
INSERT INTO employees (full_name, employee_number, fingerprint_number, company_id, department_id, employment_status, employment_type)
SELECT v.full_name, v.employee_number, v.fingerprint_number, '1e1a6299-9342-44b4-9912-cf702b1c85bf'::uuid, d.id, 'active', 'full_time'
FROM (VALUES
  ('Ndagijimana Simon', 'HP-1036', '1036'),
  ('Rusanganwa Celestin', 'HP-1037', '1037'),
  ('Baganineza Reverien', 'HP-1038', '1038'),
  ('Mugenzi Vincent', 'HP-1039', '1039'),
  ('Bigirimana Vincent', 'HP-1040', '1040'),
  ('Nkusi Alexis', 'HP-1042', '1042'),
  ('Muzaribara J Bosco', 'HP-1289', '1289'),
  ('Misago Francois', 'HP-1290', '1290'),
  ('Mutabazi Vincent', 'HP-1291', '1291'),
  ('Nyandwi Jean', 'HP-1292', '1292'),
  ('Nshimiyimana Joseph', 'HP-1293', '1293')
) AS v(full_name, employee_number, fingerprint_number)
CROSS JOIN departments d WHERE d.code = 'GUARD_P' AND d.company_id = '1e1a6299-9342-44b4-9912-cf702b1c85bf';
