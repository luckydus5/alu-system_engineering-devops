
CREATE TABLE public.attendance_raw_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_upload_id uuid REFERENCES public.attendance_file_uploads(id) ON DELETE CASCADE,
  source_file text NOT NULL,
  row_number integer,
  department_text text,
  employee_name text NOT NULL,
  fingerprint_number text,
  scan_datetime timestamptz NOT NULL,
  scan_status text,
  scan_date date NOT NULL,
  matched_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  matched_employee_name text,
  match_score integer,
  match_method text,
  is_matched boolean NOT NULL DEFAULT false,
  was_imported boolean NOT NULL DEFAULT false,
  attendance_record_id uuid REFERENCES public.attendance_records(id) ON DELETE SET NULL,
  skip_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_raw_scans_file ON attendance_raw_scans(file_upload_id);
CREATE INDEX idx_raw_scans_employee ON attendance_raw_scans(matched_employee_id);
CREATE INDEX idx_raw_scans_date ON attendance_raw_scans(scan_date);
CREATE INDEX idx_raw_scans_unmatched ON attendance_raw_scans(is_matched) WHERE is_matched = false;

ALTER TABLE public.attendance_raw_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can view raw scans"
ON public.attendance_raw_scans FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);

CREATE POLICY "HR and admins can manage raw scans"
ON public.attendance_raw_scans FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id
    WHERE ur.user_id = auth.uid() AND d.code = 'HR'
  )
);
