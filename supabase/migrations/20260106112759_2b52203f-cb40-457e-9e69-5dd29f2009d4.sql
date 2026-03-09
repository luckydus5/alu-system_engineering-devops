-- ============================================
-- HQ Power - Complete Database Schema Setup
-- ============================================

-- 1. ENUMS (use DO block to handle if they exist)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('staff', 'supervisor', 'manager', 'director', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fleet_status AS ENUM ('operational', 'under_maintenance', 'out_of_service');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fleet_condition AS ENUM ('operational', 'good_condition', 'grounded', 'under_repair', 'waiting_parts', 'decommissioned');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('draft', 'pending', 'in_review', 'approved', 'rejected', 'escalated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_type AS ENUM ('incident', 'financial', 'performance', 'general');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.report_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.service_type AS ENUM ('preventive', 'corrective', 'breakdown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.condition_type AS ENUM ('good', 'fair', 'poor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. TABLES (create if not exists)

-- Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'staff',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, department_id)
);

-- User department access
CREATE TABLE IF NOT EXISTS public.user_department_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, department_id)
);

-- Fleets table
CREATE TABLE IF NOT EXISTS public.fleets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_number VARCHAR NOT NULL,
  machine_type VARCHAR NOT NULL,
  status public.fleet_status NOT NULL DEFAULT 'operational',
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  delivery_date DATE,
  machine_hours INTEGER DEFAULT 0,
  current_status TEXT,
  condition TEXT DEFAULT 'operational',
  remarks TEXT,
  checked_by_name TEXT,
  last_inspection_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (department_id, fleet_number)
);

-- Fleet issues table
CREATE TABLE IF NOT EXISTS public.fleet_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  issue_description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fleet audit log table (THIS WAS MISSING)
CREATE TABLE IF NOT EXISTS public.fleet_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance records table
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id UUID NOT NULL REFERENCES public.fleets(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_type public.service_type NOT NULL DEFAULT 'preventive',
  service_description TEXT NOT NULL,
  maintenance_date DATE NOT NULL,
  delivery_time_hours INTEGER,
  machine_hours INTEGER,
  condition_after_service public.condition_type DEFAULT 'good',
  current_status VARCHAR,
  checked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  next_service_due DATE,
  remarks TEXT,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  report_type public.report_type NOT NULL DEFAULT 'general',
  status public.report_status NOT NULL DEFAULT 'draft',
  priority public.report_priority NOT NULL DEFAULT 'medium',
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  data JSONB DEFAULT '{}'::jsonb,
  attachments TEXT[],
  submitted_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Report comments table
CREATE TABLE IF NOT EXISTS public.report_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  action TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_fleets_department_id ON public.fleets(department_id);
CREATE INDEX IF NOT EXISTS idx_fleets_status ON public.fleets(status);
CREATE INDEX IF NOT EXISTS idx_fleets_operator_id ON public.fleets(operator_id);
CREATE INDEX IF NOT EXISTS idx_fleet_issues_fleet_id ON public.fleet_issues(fleet_id);
CREATE INDEX IF NOT EXISTS idx_fleet_issues_is_resolved ON public.fleet_issues(is_resolved);
CREATE INDEX IF NOT EXISTS idx_fleet_audit_log_fleet_id ON public.fleet_audit_log(fleet_id);
CREATE INDEX IF NOT EXISTS idx_fleet_audit_log_user_id ON public.fleet_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_fleet_id ON public.maintenance_records(fleet_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_department_id ON public.maintenance_records(department_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_maintenance_date ON public.maintenance_records(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_next_service_due ON public.maintenance_records(next_service_due);
CREATE INDEX IF NOT EXISTS idx_reports_department_id ON public.reports(department_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON public.reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON public.reports(report_type);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'director' THEN 2 WHEN 'manager' THEN 3 WHEN 'supervisor' THEN 4 WHEN 'staff' THEN 5 END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_in_department(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND department_id = _department_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_department_access WHERE user_id = _user_id AND department_id = _department_id
  )
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

-- 5. TRIGGERS (drop if exists then create)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_departments_updated_at ON public.departments;
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fleets_updated_at ON public.fleets;
CREATE TRIGGER update_fleets_updated_at
  BEFORE UPDATE ON public.fleets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fleet_issues_updated_at ON public.fleet_issues;
CREATE TRIGGER update_fleet_issues_updated_at
  BEFORE UPDATE ON public.fleet_issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_records_updated_at ON public.maintenance_records;
CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reports_updated_at ON public.reports;
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_department_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES (drop existing and recreate)

-- DEPARTMENTS POLICIES
DROP POLICY IF EXISTS "Departments are viewable by authenticated users" ON public.departments;
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can modify departments" ON public.departments;
CREATE POLICY "Only admins can modify departments"
  ON public.departments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (id = auth.uid());

-- USER ROLES POLICIES
DROP POLICY IF EXISTS "Users can view roles in their department" ON public.user_roles;
CREATE POLICY "Users can view roles in their department"
  ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- USER DEPARTMENT ACCESS POLICIES
DROP POLICY IF EXISTS "Users can view department access" ON public.user_department_access;
CREATE POLICY "Users can view department access"
  ON public.user_department_access FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage department access" ON public.user_department_access;
CREATE POLICY "Only admins can manage department access"
  ON public.user_department_access FOR ALL USING (has_role(auth.uid(), 'admin'));

-- FLEETS POLICIES
DROP POLICY IF EXISTS "Users in department can view fleets" ON public.fleets;
CREATE POLICY "Users in department can view fleets"
  ON public.fleets FOR SELECT
  USING (user_in_department(auth.uid(), department_id) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

DROP POLICY IF EXISTS "Supervisors+ can create fleets" ON public.fleets;
CREATE POLICY "Supervisors+ can create fleets"
  ON public.fleets FOR INSERT
  WITH CHECK (
    (user_in_department(auth.uid(), department_id) AND (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'admin')))
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director')
  );

DROP POLICY IF EXISTS "Supervisors+ can update fleets" ON public.fleets;
CREATE POLICY "Supervisors+ can update fleets"
  ON public.fleets FOR UPDATE
  USING (
    (user_in_department(auth.uid(), department_id) AND (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'admin')))
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director')
  );

-- FLEET ISSUES POLICIES
DROP POLICY IF EXISTS "Users in department can view fleet issues" ON public.fleet_issues;
CREATE POLICY "Users in department can view fleet issues"
  ON public.fleet_issues FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_issues.fleet_id AND (user_in_department(auth.uid(), f.department_id) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'))));

DROP POLICY IF EXISTS "Supervisors+ can create fleet issues" ON public.fleet_issues;
CREATE POLICY "Supervisors+ can create fleet issues"
  ON public.fleet_issues FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_issues.fleet_id AND ((user_in_department(auth.uid(), f.department_id) AND (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'admin'))) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'))));

DROP POLICY IF EXISTS "Supervisors+ can update fleet issues" ON public.fleet_issues;
CREATE POLICY "Supervisors+ can update fleet issues"
  ON public.fleet_issues FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_issues.fleet_id AND ((user_in_department(auth.uid(), f.department_id) AND (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'admin'))) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'))));

DROP POLICY IF EXISTS "Supervisors+ can delete fleet issues" ON public.fleet_issues;
CREATE POLICY "Supervisors+ can delete fleet issues"
  ON public.fleet_issues FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_issues.fleet_id AND ((user_in_department(auth.uid(), f.department_id) AND (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'admin'))) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'))));

-- FLEET AUDIT LOG POLICIES
DROP POLICY IF EXISTS "Users in department can view audit logs" ON public.fleet_audit_log;
CREATE POLICY "Users in department can view audit logs"
  ON public.fleet_audit_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_audit_log.fleet_id AND (user_in_department(auth.uid(), f.department_id) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'))));

DROP POLICY IF EXISTS "Users in department can create audit logs" ON public.fleet_audit_log;
CREATE POLICY "Users in department can create audit logs"
  ON public.fleet_audit_log FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.fleets f WHERE f.id = fleet_audit_log.fleet_id AND (user_in_department(auth.uid(), f.department_id) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'))));

-- MAINTENANCE RECORDS POLICIES
DROP POLICY IF EXISTS "Users in department can view maintenance records" ON public.maintenance_records;
CREATE POLICY "Users in department can view maintenance records"
  ON public.maintenance_records FOR SELECT
  USING (user_in_department(auth.uid(), department_id) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

DROP POLICY IF EXISTS "Staff+ can create maintenance records" ON public.maintenance_records;
CREATE POLICY "Staff+ can create maintenance records"
  ON public.maintenance_records FOR INSERT
  WITH CHECK (user_in_department(auth.uid(), department_id) OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Supervisors+ can update maintenance records" ON public.maintenance_records;
CREATE POLICY "Supervisors+ can update maintenance records"
  ON public.maintenance_records FOR UPDATE
  USING (user_in_department(auth.uid(), department_id) AND (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'admin')));

-- REPORTS POLICIES
DROP POLICY IF EXISTS "Users can view reports in their department or created by them" ON public.reports;
CREATE POLICY "Users can view reports in their department or created by them"
  ON public.reports FOR SELECT
  USING ((created_by = auth.uid()) OR user_in_department(auth.uid(), department_id) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'));

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own draft reports or supervisors+ can update" ON public.reports;
CREATE POLICY "Users can update their own draft reports or supervisors+ can update"
  ON public.reports FOR UPDATE
  USING (((created_by = auth.uid()) AND (status = 'draft')) OR has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'director') OR has_role(auth.uid(), 'admin'));

-- REPORT COMMENTS POLICIES
DROP POLICY IF EXISTS "Users can view comments on reports they can see" ON public.report_comments;
CREATE POLICY "Users can view comments on reports they can see"
  ON public.report_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM reports r WHERE r.id = report_comments.report_id AND (r.created_by = auth.uid() OR user_in_department(auth.uid(), r.department_id) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'director'))));

DROP POLICY IF EXISTS "Authenticated users can add comments" ON public.report_comments;
CREATE POLICY "Authenticated users can add comments"
  ON public.report_comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS POLICIES
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;
CREATE POLICY "System can create notifications for users"
  ON public.notifications FOR INSERT WITH CHECK (true);

-- 8. SAMPLE DEPARTMENTS
INSERT INTO public.departments (id, name, code, description, icon, color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Human Resources', 'HR', 'Human Resources Department', 'Users', '#3B82F6'),
  ('22222222-2222-2222-2222-222222222222', 'Information Technology', 'IT', 'IT Department', 'Monitor', '#10B981'),
  ('33333333-3333-3333-3333-333333333333', 'Finance', 'FIN', 'Finance Department', 'DollarSign', '#F59E0B'),
  ('44444444-4444-4444-4444-444444444444', 'Operations', 'OPS', 'Operations Department', 'Settings', '#EF4444'),
  ('55555555-5555-5555-5555-555555555555', 'Fleet Management', 'FLEET', 'Fleet Management Department', 'Truck', '#8B5CF6')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color;