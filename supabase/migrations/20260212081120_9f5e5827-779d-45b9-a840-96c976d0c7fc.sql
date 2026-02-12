
-- Add timesheet processing columns to attendance_records
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS shift_type text DEFAULT 'day',
  ADD COLUMN IF NOT EXISTS total_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS regular_hours numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_hours numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.attendance_records.shift_type IS 'day or night shift auto-detected from check-in time';
COMMENT ON COLUMN public.attendance_records.total_hours IS 'Total work hours calculated from clock_in to clock_out';
COMMENT ON COLUMN public.attendance_records.regular_hours IS 'Regular (non-OT) hours within shift';
COMMENT ON COLUMN public.attendance_records.overtime_hours IS 'Overtime hours calculated per policy rules';
