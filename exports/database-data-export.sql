-- ============================================
-- HQ Power - Database Data Export
-- Generated: 2024-12-25
-- ============================================
-- IMPORTANT: Run the schema export FIRST, then run this file
-- 
-- NOTE ON USER DATA:
-- The profiles and user_roles tables reference auth.users.
-- In your new Supabase project, users need to sign up first before
-- their profile data can be inserted. You may need to:
-- 1. Have users sign up in the new system
-- 2. Then manually update their profiles with the data below
-- ============================================

-- ============================================
-- 1. DEPARTMENTS (Run first - no dependencies)
-- ============================================

INSERT INTO public.departments (id, name, code, description, icon, color, created_at, updated_at) VALUES
  ('5d743138-776b-411a-8642-a3230079a008', 'Finance', 'FIN', 'Budget tracking, expenses, revenue reports, invoices', 'DollarSign', 'blue', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('783e09eb-e78f-4c53-b8f8-6543410cc863', 'Safety', 'SAF', 'Incident reports, safety audits, compliance tracking', 'Shield', 'red', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('0b622402-d27b-4cf8-8024-4fff48640280', 'Procurement', 'PRO', 'Purchase requests, vendor management, order tracking', 'ShoppingCart', 'green', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('e04d1160-56f2-48d3-b1e8-d746e64b4380', 'Operations', 'OPS', 'Daily operations, maintenance schedules, outage reports', 'Settings', 'orange', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('945a887c-18a3-4b3c-9d76-e6818dbb2995', 'Human Resources', 'HR', 'Employee records, leave requests, performance reviews', 'Users', 'purple', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('f6606620-a3f4-4e73-8f5b-e9bab7046201', 'IT', 'IT', 'System issues, equipment inventory, project tracking', 'Monitor', 'cyan', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('492cf479-efb3-4e62-94be-1865845a061a', 'Customer Service', 'CS', 'Customer complaints, service requests, resolution tracking', 'Headphones', 'pink', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('025476da-bf3d-4ee3-b72d-d8f41b068ba2', 'Engineering', 'ENG', 'Project progress, technical reports, infrastructure updates', 'Wrench', 'yellow', '2025-12-07 08:27:52.885113+00', '2025-12-07 08:27:52.885113+00'),
  ('015b8136-a7b0-4276-972d-b577cfadb899', 'Peat Maintenance', 'PEAT', 'Fleet maintenance management for mechanical equipment and tractors', 'Wrench', '#1e3a5f', '2025-12-25 18:12:03.699736+00', '2025-12-25 18:12:03.699736+00');

-- ============================================
-- 2. PROFILES (Requires users in auth.users first)
-- ============================================
-- NOTE: These users must exist in auth.users before inserting profiles.
-- Either create users with the same IDs or update the IDs after user signup.

-- User 1: Iradukunda Erik (olivisd22@gmail.com)
-- User ID: 7090f7b8-d928-47f3-9463-cd9c8ce236b4
-- Role: supervisor

-- User 2: Olivier Dusabamahoro (olivierdusa5@gmail.com)  
-- User ID: 7d81664f-87f3-4d1d-9e64-acb9edfcfa21
-- Role: admin, Department: IT

-- After users sign up, run these to update their profiles:
/*
UPDATE public.profiles SET
  full_name = 'Iradukunda Erik',
  department_id = NULL
WHERE email = 'olivisd22@gmail.com';

UPDATE public.profiles SET
  full_name = 'Olivier Dusabamahoro',
  department_id = 'f6606620-a3f4-4e73-8f5b-e9bab7046201'
WHERE email = 'olivierdusa5@gmail.com';
*/

-- ============================================
-- 3. USER ROLES (Requires users in auth.users first)
-- ============================================
-- Run these after users have signed up:
/*
-- Make olivisd22@gmail.com a supervisor
INSERT INTO public.user_roles (user_id, role, department_id)
SELECT id, 'supervisor', NULL FROM public.profiles WHERE email = 'olivisd22@gmail.com';

-- Make olivierdusa5@gmail.com an admin in IT department
INSERT INTO public.user_roles (user_id, role, department_id)
SELECT id, 'admin', 'f6606620-a3f4-4e73-8f5b-e9bab7046201' FROM public.profiles WHERE email = 'olivierdusa5@gmail.com';
*/

-- ============================================
-- 4. FLEETS
-- ============================================

INSERT INTO public.fleets (id, fleet_number, machine_type, status, operator_id, department_id, created_at, updated_at) VALUES
  ('be78a743-064a-4135-8eb8-f5881a7be9dd', 'VTOO2', 'New Holland', 'operational', NULL, '015b8136-a7b0-4276-972d-b577cfadb899', '2025-12-25 18:38:08.773499+00', '2025-12-25 18:38:08.773499+00');

-- ============================================
-- 5. MAINTENANCE RECORDS
-- ============================================

INSERT INTO public.maintenance_records (id, fleet_id, operator_id, service_type, service_description, maintenance_date, delivery_time_hours, machine_hours, condition_after_service, current_status, checked_by, next_service_due, remarks, department_id, created_at, updated_at) VALUES
  ('595b5878-55b3-40fa-89c7-065aea11df57', 'be78a743-064a-4135-8eb8-f5881a7be9dd', NULL, 'preventive', 'We replaced Tyre', '2025-12-25', 54, 675, 'good', 'Repaired', NULL, '2026-01-08', NULL, '015b8136-a7b0-4276-972d-b577cfadb899', '2025-12-25 18:39:25.178035+00', '2025-12-25 18:39:25.178035+00');

-- ============================================
-- 6. USER DEPARTMENT ACCESS
-- ============================================
-- NOTE: These reference user IDs that need to exist first.
-- Run after users have signed up and you've mapped their new IDs.

/*
-- Grant department access (update user_ids after users sign up)
INSERT INTO public.user_department_access (department_id, granted_by, user_id) VALUES
  ('e04d1160-56f2-48d3-b1e8-d746e64b4380', '<admin_user_id>', '<target_user_id>'),  -- Operations access
  ('025476da-bf3d-4ee3-b72d-d8f41b068ba2', '<admin_user_id>', '<target_user_id>'),  -- Engineering access
  ('0b622402-d27b-4cf8-8024-4fff48640280', '<admin_user_id>', '<target_user_id>'),  -- Procurement access
  ('783e09eb-e78f-4c53-b8f8-6543410cc863', '<admin_user_id>', '<target_user_id>');  -- Safety access
*/

-- ============================================
-- MIGRATION CHECKLIST
-- ============================================
-- 1. Run complete-database-schema.sql first
-- 2. Run the DEPARTMENTS insert above
-- 3. Have your users sign up in the new system
-- 4. Run the profile UPDATE statements (uncomment and adjust)
-- 5. Run the user_roles INSERT statements (uncomment and adjust)
-- 6. Run the FLEETS insert
-- 7. Run the MAINTENANCE RECORDS insert
-- 8. Run user_department_access INSERTs (adjust user IDs)
-- ============================================
