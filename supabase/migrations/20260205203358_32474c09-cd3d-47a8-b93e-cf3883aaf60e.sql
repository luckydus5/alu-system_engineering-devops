-- Create leave types enum
CREATE TYPE public.leave_type AS ENUM (
  'annual',
  'sick',
  'personal',
  'maternity',
  'paternity',
  'bereavement',
  'unpaid'
);

-- Create leave status enum
CREATE TYPE public.leave_status AS ENUM (
  'pending',
  'manager_approved',
  'approved',
  'rejected',
  'cancelled'
);

-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'half_day',
  'on_leave',
  'remote'
);

-- Create leave_balances table to track each employee's leave entitlements
CREATE TABLE public.leave_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leave_type public.leave_type NOT NULL,
  total_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  used_days NUMERIC(5,2) NOT NULL DEFAULT 0,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, leave_type, year)
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  leave_type public.leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,2) NOT NULL,
  reason TEXT,
  status public.leave_status NOT NULL DEFAULT 'pending',
  manager_id UUID,
  manager_action_at TIMESTAMP WITH TIME ZONE,
  manager_comment TEXT,
  hr_reviewer_id UUID,
  hr_action_at TIMESTAMP WITH TIME ZONE,
  hr_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  attendance_date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, attendance_date)
);

-- Enable RLS
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Leave balances policies
CREATE POLICY "Users can view their own leave balances"
ON public.leave_balances FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "HR and admins can view all leave balances"
ON public.leave_balances FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

CREATE POLICY "HR and admins can manage leave balances"
ON public.leave_balances FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

-- Leave requests policies
CREATE POLICY "Users can view their own leave requests"
ON public.leave_requests FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Managers can view leave requests in their department"
ON public.leave_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.department_id = leave_requests.department_id
    AND ur.role IN ('manager', 'director', 'supervisor')
  )
);

CREATE POLICY "HR and admins can view all leave requests"
ON public.leave_requests FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

CREATE POLICY "Users can create their own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their pending leave requests"
ON public.leave_requests FOR UPDATE
USING (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Managers can update leave requests in their department"
ON public.leave_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.department_id = leave_requests.department_id
    AND ur.role IN ('manager', 'director')
  )
);

CREATE POLICY "HR can update all leave requests"
ON public.leave_requests FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

-- Attendance records policies
CREATE POLICY "Users can view their own attendance"
ON public.attendance_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view attendance in their department"
ON public.attendance_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.department_id = attendance_records.department_id
    AND ur.role IN ('manager', 'director', 'supervisor')
  )
);

CREATE POLICY "HR and admins can view all attendance"
ON public.attendance_records FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

CREATE POLICY "Users can clock in/out for themselves"
ON public.attendance_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance"
ON public.attendance_records FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "HR can manage all attendance"
ON public.attendance_records FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

-- Create indexes for performance
CREATE INDEX idx_leave_requests_requester ON public.leave_requests(requester_id);
CREATE INDEX idx_leave_requests_department ON public.leave_requests(department_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX idx_attendance_user_date ON public.attendance_records(user_id, attendance_date);
CREATE INDEX idx_attendance_department ON public.attendance_records(department_id);
CREATE INDEX idx_leave_balances_user ON public.leave_balances(user_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_leave_balances_updated_at
  BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert HR department if it doesn't exist
INSERT INTO public.departments (code, name, description, icon, color)
VALUES ('HR', 'Human Resources', 'Human Resources department managing employee relations, leave, and attendance', 'Users', '#9333ea')
ON CONFLICT (code) DO NOTHING;