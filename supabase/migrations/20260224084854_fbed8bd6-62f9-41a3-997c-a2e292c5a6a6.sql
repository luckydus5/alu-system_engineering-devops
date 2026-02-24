-- Speed up attendance date-range queries
CREATE INDEX IF NOT EXISTS idx_attendance_records_date_dept 
ON public.attendance_records (attendance_date DESC, department_id);

CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date 
ON public.attendance_records (user_id, attendance_date DESC);
