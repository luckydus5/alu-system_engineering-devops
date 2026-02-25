
-- Create storage bucket for attendance file archives
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attendance-files', 'attendance-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only HR/admins can upload attendance files
CREATE POLICY "HR and admins can upload attendance files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attendance-files' AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id WHERE ur.user_id = auth.uid() AND d.code = 'HR')
  )
);

-- RLS: HR/admins can view attendance files
CREATE POLICY "HR and admins can view attendance files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attendance-files' AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id WHERE ur.user_id = auth.uid() AND d.code = 'HR')
  )
);

-- Create table to track uploaded attendance files with metadata
CREATE TABLE public.attendance_file_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  records_imported INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  records_unmatched INTEGER NOT NULL DEFAULT 0,
  company_names TEXT,
  date_range_from DATE,
  date_range_to DATE,
  import_summary JSONB,
  notes TEXT
);

ALTER TABLE public.attendance_file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can view attendance file uploads"
ON public.attendance_file_uploads FOR SELECT
USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  OR EXISTS (SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id WHERE ur.user_id = auth.uid() AND d.code = 'HR')
);

CREATE POLICY "HR and admins can insert attendance file uploads"
ON public.attendance_file_uploads FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  OR EXISTS (SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id WHERE ur.user_id = auth.uid() AND d.code = 'HR')
);
