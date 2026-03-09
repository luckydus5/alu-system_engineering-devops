-- Create enum for user roles in the system
CREATE TYPE public.app_role AS ENUM ('staff', 'supervisor', 'manager', 'director', 'admin');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('draft', 'pending', 'in_review', 'approved', 'rejected', 'escalated');

-- Create enum for report priority/severity
CREATE TYPE public.report_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Create enum for report types
CREATE TYPE public.report_type AS ENUM ('incident', 'financial', 'performance', 'general');

-- Create departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  department_id UUID REFERENCES public.departments(id),
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  department_id UUID REFERENCES public.departments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, department_id)
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  report_type public.report_type NOT NULL DEFAULT 'general',
  status public.report_status NOT NULL DEFAULT 'draft',
  priority public.report_priority NOT NULL DEFAULT 'medium',
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  data JSONB DEFAULT '{}',
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create report_comments table for approval workflow
CREATE TABLE public.report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  action TEXT, -- 'comment', 'approve', 'reject', 'escalate', 'request_changes'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'director' THEN 2 
      WHEN 'manager' THEN 3 
      WHEN 'supervisor' THEN 4 
      WHEN 'staff' THEN 5 
    END
  LIMIT 1
$$;

-- Function to check if user is in department
CREATE OR REPLACE FUNCTION public.user_in_department(_user_id UUID, _department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND department_id = _department_id
  )
$$;

-- RLS Policies for departments (readable by all authenticated users)
CREATE POLICY "Departments are viewable by authenticated users"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their department"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reports
CREATE POLICY "Users can view reports in their department or created by them"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR public.user_in_department(auth.uid(), department_id)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'director')
  );

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own draft reports or supervisors+ can update"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    (created_by = auth.uid() AND status = 'draft')
    OR public.has_role(auth.uid(), 'supervisor')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'director')
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for report_comments
CREATE POLICY "Users can view comments on reports they can see"
  ON public.report_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r 
      WHERE r.id = report_id 
      AND (
        r.created_by = auth.uid() 
        OR public.user_in_department(auth.uid(), r.department_id)
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'director')
      )
    )
  );

CREATE POLICY "Authenticated users can add comments"
  ON public.report_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications for users"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Assign default staff role (no department yet)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'staff');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default departments
INSERT INTO public.departments (name, code, description, icon, color) VALUES
  ('Finance', 'FIN', 'Budget tracking, expenses, revenue reports, invoices', 'DollarSign', 'blue'),
  ('Safety', 'SAF', 'Incident reports, safety audits, compliance tracking', 'Shield', 'red'),
  ('Procurement', 'PRO', 'Purchase requests, vendor management, order tracking', 'ShoppingCart', 'green'),
  ('Operations', 'OPS', 'Daily operations, maintenance schedules, outage reports', 'Settings', 'orange'),
  ('Human Resources', 'HR', 'Employee records, leave requests, performance reviews', 'Users', 'purple'),
  ('IT', 'IT', 'System issues, equipment inventory, project tracking', 'Monitor', 'cyan'),
  ('Customer Service', 'CS', 'Customer complaints, service requests, resolution tracking', 'Headphones', 'pink'),
  ('Engineering', 'ENG', 'Project progress, technical reports, infrastructure updates', 'Wrench', 'yellow');