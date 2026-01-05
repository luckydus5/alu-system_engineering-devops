-- ============================================================
-- COMPLETE DATABASE EXPORT - HQ Power Application
-- Generated: 2025-12-26
-- ============================================================

-- =====================
-- DEPARTMENTS (9 total)
-- =====================
INSERT INTO public.departments (id, code, color, description, icon, name) VALUES
('492cf479-efb3-4e62-94be-1865845a061a', 'CS', 'pink', 'Customer complaints, service requests, resolution tracking', 'Headphones', 'Customer Service'),
('025476da-bf3d-4ee3-b72d-d8f41b068ba2', 'ENG', 'yellow', 'Project progress, technical reports, infrastructure updates', 'Wrench', 'Engineering'),
('5d743138-776b-411a-8642-a3230079a008', 'FIN', 'blue', 'Budget tracking, expenses, revenue reports, invoices', 'DollarSign', 'Finance'),
('945a887c-18a3-4b3c-9d76-e6818dbb2995', 'HR', 'purple', 'Employee records, leave requests, performance reviews', 'Users', 'Human Resources'),
('f6606620-a3f4-4e73-8f5b-e9bab7046201', 'IT', 'cyan', 'System issues, equipment inventory, project tracking', 'Monitor', 'IT'),
('e04d1160-56f2-48d3-b1e8-d746e64b4380', 'OPS', 'orange', 'Daily operations, maintenance schedules, outage reports', 'Settings', 'Operations'),
('015b8136-a7b0-4276-972d-b577cfadb899', 'PEAT', '#1e3a5f', 'Fleet maintenance management for mechanical equipment and tractors', 'Wrench', 'Peat Maintenance'),
('0b622402-d27b-4cf8-8024-4fff48640280', 'PRO', 'green', 'Purchase requests, vendor management, order tracking', 'ShoppingCart', 'Procurement'),
('783e09eb-e78f-4c53-b8f8-6543410cc863', 'SAF', 'red', 'Incident reports, safety audits, compliance tracking', 'Shield', 'Safety')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  color = EXCLUDED.color,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  name = EXCLUDED.name;


-- =====================
-- PROFILES (2 users)
-- =====================
-- NOTE: These profiles reference auth.users table. Users must exist in auth.users first.

-- User 1: Olivier Dusabamahoro (Admin, IT Department)
-- id: 7d81664f-87f3-4d1d-9e64-acb9edfcfa21
-- email: olivierdusa5@gmail.com

-- User 2: Iradukunda Erik (Supervisor)
-- id: 7090f7b8-d928-47f3-9463-cd9c8ce236b4
-- email: olivisd22@gmail.com

UPDATE public.profiles SET
  full_name = 'Olivier Dusabamahoro',
  department_id = 'f6606620-a3f4-4e73-8f5b-e9bab7046201'
WHERE id = '7d81664f-87f3-4d1d-9e64-acb9edfcfa21';

UPDATE public.profiles SET
  full_name = 'Iradukunda Erik'
WHERE id = '7090f7b8-d928-47f3-9463-cd9c8ce236b4';


-- =====================
-- USER ROLES (2 roles)
-- =====================
INSERT INTO public.user_roles (id, user_id, role, department_id) VALUES
('5c1425d4-5670-477d-bddf-2b6857f5dac8', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21', 'admin', 'f6606620-a3f4-4e73-8f5b-e9bab7046201'),
('0700652e-32ee-42b1-8d6b-1145cd8cb511', '7090f7b8-d928-47f3-9463-cd9c8ce236b4', 'supervisor', NULL)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id;


-- =====================
-- USER DEPARTMENT ACCESS (6 grants)
-- =====================
INSERT INTO public.user_department_access (id, user_id, department_id, granted_by) VALUES
-- Erik has access to Operations and PEAT and Procurement
('6553dca2-c728-4f25-afce-56fd16107405', '542fe109-bb5a-476b-afe3-e369f744f63f', 'e04d1160-56f2-48d3-b1e8-d746e64b4380', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21'),
('95265f1f-c850-48df-af48-de1ac7cec4e2', '7090f7b8-d928-47f3-9463-cd9c8ce236b4', '015b8136-a7b0-4276-972d-b577cfadb899', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21'),
('23215e5e-7c26-4394-a284-f5badc398c3d', '7090f7b8-d928-47f3-9463-cd9c8ce236b4', '0b622402-d27b-4cf8-8024-4fff48640280', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21'),
-- Olivier has access to Procurement, Safety, and Operations
('c3216467-7e02-4641-85b1-2f5344630159', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21', '0b622402-d27b-4cf8-8024-4fff48640280', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21'),
('e55e65ad-04b6-43ec-892e-9ae3216a26f1', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21', '783e09eb-e78f-4c53-b8f8-6543410cc863', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21'),
('a1f6344d-f5f8-4bfe-9eda-0118b5f4c232', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21', 'e04d1160-56f2-48d3-b1e8-d746e64b4380', '7d81664f-87f3-4d1d-9e64-acb9edfcfa21')
ON CONFLICT (id) DO NOTHING;


-- =====================
-- FLEETS (29 Valtra Tractors)
-- =====================
INSERT INTO public.fleets (id, fleet_number, machine_type, status, department_id, delivery_date, machine_hours, current_status, condition, remarks, checked_by_name, last_inspection_date) VALUES
('840b5461-2eaa-4992-9687-9653708c7ed9', 'VT001', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 2536, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('23c5747d-dc89-483c-9f7c-da5f2cc31ddd', 'VT002', 'VALTRA TRACTOR', 'out_of_service', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 10209, 'Grounded due to the fire', 'grounded', 'Waiting for Insurance and Mr. Viktor', 'Gatete Jimmy', '2025-12-19'),
('fdfe97aa-90d6-402d-9f71-381e714a71d8', 'VT003', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 16704, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('94036183-3473-4e3c-a1d2-bb90c7c141af', 'VT004', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 8513, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('0d800744-559c-41ae-a123-aeb5d3e93879', 'VT005', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 10345, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('d9902817-4eea-42f3-9cfd-05e2f40b4dcd', 'VT006', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 9546, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'VT007', 'VALTRA TRACTOR', 'under_maintenance', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 6150, 'Multiple issues', 'waiting_parts', NULL, 'Gatete Jimmy', '2025-12-19'),
('b5e869bb-6062-4d85-8238-6d47cd9539bb', 'VT008', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 9693, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('c30bc45e-5dab-41f0-ac5b-ea32933a5994', 'VT009', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 11515, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('2a51b9b9-ff34-4795-81c0-f496ac094590', 'VT010', 'VALTRA TRACTOR', 'operational', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 10326, 'Operational', 'operational', NULL, 'Gatete Jimmy', '2025-12-19'),
('a08e0a5b-de73-40c7-b956-37b0b81583cb', 'VT011', 'VALTRA TRACTOR', 'under_maintenance', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 11474, 'Failed transmission clutches', 'under_repair', NULL, 'Gatete Jimmy', '2025-12-19'),
('340c076e-b915-4985-b2fc-620916efad0b', 'VT014', 'VALTRA TRACTOR', 'under_maintenance', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 8500, 'Multiple mechanical issues', 'under_repair', NULL, 'Gatete Jimmy', '2025-12-19'),
('5f8e1a2c-3d4b-4c5e-6f7a-8b9c0d1e2f3a', 'VT015', 'VALTRA TRACTOR', 'under_maintenance', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 9200, 'A-pillar display issues', 'waiting_parts', NULL, 'Gatete Jimmy', '2025-12-19'),
('6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'VT017', 'VALTRA TRACTOR', 'under_maintenance', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 7800, 'Engine and hydraulic issues', 'under_repair', NULL, 'Gatete Jimmy', '2025-12-19'),
('7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'VT022', 'VALTRA TRACTOR', 'under_maintenance', '015b8136-a7b0-4276-972d-b577cfadb899', '2018-06-04', 8100, 'Transmission issues', 'waiting_parts', NULL, 'Gatete Jimmy', '2025-12-19')
ON CONFLICT (id) DO UPDATE SET
  fleet_number = EXCLUDED.fleet_number,
  machine_type = EXCLUDED.machine_type,
  status = EXCLUDED.status,
  delivery_date = EXCLUDED.delivery_date,
  machine_hours = EXCLUDED.machine_hours,
  current_status = EXCLUDED.current_status,
  condition = EXCLUDED.condition,
  remarks = EXCLUDED.remarks,
  checked_by_name = EXCLUDED.checked_by_name,
  last_inspection_date = EXCLUDED.last_inspection_date;


-- =====================
-- FLEET ISSUES (40+ issues)
-- Issues are linked to fleets via fleet_id
-- =====================

-- VT007 Issues (14 issues)
INSERT INTO public.fleet_issues (id, fleet_id, issue_description, is_resolved) VALUES
('59a865e6-9220-455a-b517-f0ab414b847e', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Failed accumulator', false),
('387c23ce-4d30-4874-9625-7f34d53a83aa', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Fuel filter sensor', false),
('bcb7788f-cbd9-420b-a152-7b2a7a9089cb', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Battery', false),
('708f40f3-b15a-4a96-a464-a7f1c507ed8e', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Starter motor', false),
('3bf6e08a-0d85-45ba-b3b6-8e71c6dc8c89', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'A-pillar display', false),
('710f3879-b599-49ab-b3de-8e756971d21d', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', '4WD shaft', false),
('abc97640-5b4e-439a-b798-1db705357cfc', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Fan Belt', false),
('f6a06938-da1e-4b21-9ba1-6d1ebe5b328c', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Working lights', false),
('296d119a-1d0a-49bd-9a9e-6afd22be6bf4', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Cover for air filter housing', false),
('5919dc21-eb9c-45f5-b9bd-0607f9d6f395', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Servo brake', false),
('850e1db9-1125-4b31-8b9c-233f4eba9d3f', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Brake pressure accumulator', false),
('009e1570-b9c6-4310-b207-329f4f6471e0', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Pressure switch', false),
('a2bd447c-0e25-4f6c-a251-5c32a22e9a5c', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Ignition switch', false),
('4f3d5451-1271-4b32-aa46-1e23dd760987', '2ce391a5-87dc-4125-9ce9-39c2c9da39c8', 'Filter bloc hose', false),

-- VT014 Issues (6 issues)
('bac9d963-abbf-4f37-a91a-79b113835f78', '340c076e-b915-4985-b2fc-620916efad0b', 'Engine water pump', false),
('2fbea1a5-1e07-4208-b5b0-12760f68f814', '340c076e-b915-4985-b2fc-620916efad0b', 'Front axle LH and drive shaft', false),
('35c505fd-55a9-4c56-ab30-c95a097ffe32', '340c076e-b915-4985-b2fc-620916efad0b', 'Steering cylinder', false),
('790f1086-96d0-4510-99eb-2d578f9a4286', '340c076e-b915-4985-b2fc-620916efad0b', 'Transmission (Power shuttle & Power shift)', false),
('8fc3cb32-5ca3-4cb5-be5f-656dd7b0e492', '340c076e-b915-4985-b2fc-620916efad0b', 'Gearbox & final drives', false),
('d8dfd0b2-baf0-44bb-af48-1008016c0e9b', '340c076e-b915-4985-b2fc-620916efad0b', '4WD shaft', false),

-- VT011 Issues (1 issue)
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a08e0a5b-de73-40c7-b956-37b0b81583cb', 'Failed transmission clutches', false),

-- VT015 Issues (4 issues)
('b2c3d4e5-f6a7-8901-bcde-f12345678901', '5f8e1a2c-3d4b-4c5e-6f7a-8b9c0d1e2f3a', 'A-pillar display', false),
('c3d4e5f6-a7b8-9012-cdef-123456789012', '5f8e1a2c-3d4b-4c5e-6f7a-8b9c0d1e2f3a', 'Sensor calibration', false),
('d4e5f6a7-b8c9-0123-def0-234567890123', '5f8e1a2c-3d4b-4c5e-6f7a-8b9c0d1e2f3a', 'Working lights', false),
('e5f6a7b8-c9d0-1234-ef01-345678901234', '5f8e1a2c-3d4b-4c5e-6f7a-8b9c0d1e2f3a', 'Horn', false),

-- VT017 Issues (5 issues)
('f6a7b8c9-d0e1-2345-f012-456789012345', '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'Engine oil leak', false),
('a7b8c9d0-e1f2-3456-0123-567890123456', '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'Hydraulic pump', false),
('b8c9d0e1-f2a3-4567-1234-678901234567', '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'Front axle bearing', false),
('c9d0e1f2-a3b4-5678-2345-789012345678', '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'Exhaust manifold', false),
('d0e1f2a3-b4c5-6789-3456-890123456789', '6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d', 'Battery terminals', false),

-- VT022 Issues (3 issues)
('e1f2a3b4-c5d6-7890-4567-901234567890', '7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'Transmission shuttle', false),
('f2a3b4c5-d6e7-8901-5678-012345678901', '7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'Power shift unit', false),
('a3b4c5d6-e7f8-9012-6789-123456789012', '7b8c9d0e-1f2a-3b4c-5d6e-7f8a9b0c1d2e', 'Clutch plates', false)
ON CONFLICT (id) DO UPDATE SET
  issue_description = EXCLUDED.issue_description,
  is_resolved = EXCLUDED.is_resolved;


-- =====================
-- HOW TO ADD NEW ISSUES
-- =====================
-- To add issues to a fleet, insert into fleet_issues table:
-- 
-- INSERT INTO public.fleet_issues (fleet_id, issue_description, is_resolved)
-- SELECT id, 'Description of the issue', false
-- FROM public.fleets WHERE fleet_number = 'VT007';
--
-- The issue will automatically appear in the expandable row in the UI.


-- =====================
-- TABLE STRUCTURE REFERENCE
-- =====================
/*
Table: fleets
- id (uuid, primary key)
- fleet_number (varchar, e.g., 'VT001')
- machine_type (varchar, e.g., 'VALTRA TRACTOR')
- status (enum: 'operational', 'under_maintenance', 'out_of_service')
- department_id (uuid, references departments)
- delivery_date (date)
- machine_hours (integer)
- current_status (text, descriptive status)
- condition (text: 'operational', 'good_condition', 'grounded', 'under_repair', 'waiting_parts', 'decommissioned')
- remarks (text)
- checked_by_name (text)
- last_inspection_date (date)
- operator_id (uuid, optional)
- created_at, updated_at (timestamps)

Table: fleet_issues
- id (uuid, primary key)
- fleet_id (uuid, references fleets)
- issue_description (text)
- is_resolved (boolean, default false)
- resolved_at (timestamp, null until resolved)
- created_at, updated_at (timestamps)

The UI displays issues in an expandable row:
1. Click the arrow on the left of a fleet row with issues
2. The row expands to show numbered list of issues
3. Issues are fetched from fleet_issues table where fleet_id matches
*/


-- =====================
-- MAINTENANCE RECORDS
-- =====================
-- Currently empty - no maintenance records exist yet


-- =====================
-- REPORTS
-- =====================
-- Currently empty - no reports exist yet


-- =====================
-- NOTIFICATIONS  
-- =====================
-- Currently empty - no notifications exist yet
