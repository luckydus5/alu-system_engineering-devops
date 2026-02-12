
-- Seed additional timesheet business rules into company_policies
-- Shift Configuration
INSERT INTO company_policies (company_id, policy_category, policy_key, policy_value, description) VALUES
  (NULL, 'shift', 'day_shift_start', '08:00', 'Day shift official start time'),
  (NULL, 'shift', 'day_shift_end', '17:00', 'Day shift official end time'),
  (NULL, 'shift', 'night_shift_start', '18:00', 'Night shift official start time'),
  (NULL, 'shift', 'night_shift_end', '03:00', 'Night shift official end time (next day)'),
  (NULL, 'shift', 'shift_detection_threshold', '18:00', 'Check-in at or after this time = night shift'),
  (NULL, 'shift', 'early_checkin_counts_ot', 'false', 'Whether early check-in earns overtime'),
  (NULL, 'shift', 'cross_midnight_detection', 'true', 'Auto-detect shifts spanning midnight'),
  (NULL, 'shift', 'multiple_checkin_policy', 'first_in_last_out', 'How to handle multiple check-ins per day')
ON CONFLICT DO NOTHING;

-- Overtime detailed rules
INSERT INTO company_policies (company_id, policy_category, policy_key, policy_value, description) VALUES
  (NULL, 'overtime', 'day_shift_ot_start', '17:00', 'Day shift OT only counted after this time'),
  (NULL, 'overtime', 'day_shift_ot_min_minutes', '30', 'Minimum minutes for day shift OT to count'),
  (NULL, 'overtime', 'day_shift_ot_max_hours', '1.5', 'Maximum OT hours per day shift'),
  (NULL, 'overtime', 'night_shift_ot_start', '03:00', 'Night shift OT only counted after this time'),
  (NULL, 'overtime', 'night_shift_ot_min_minutes', '30', 'Minimum minutes for night shift OT to count'),
  (NULL, 'overtime', 'night_shift_ot_max_hours', '3', 'Maximum OT hours per night shift'),
  (NULL, 'overtime', 'ot_rounding_increment', '15', 'Round OT to nearest X minutes'),
  (NULL, 'overtime', 'ot_approval_required', 'true', 'Whether OT requires pre-approval')
ON CONFLICT DO NOTHING;

-- Attendance processing rules
INSERT INTO company_policies (company_id, policy_category, policy_key, policy_value, description) VALUES
  (NULL, 'attendance', 'min_hours_full_day', '8', 'Minimum hours for full day credit'),
  (NULL, 'attendance', 'absent_auto_mark_time', '12:00', 'Mark absent if no check-in by this time'),
  (NULL, 'attendance', 'allow_manual_override', 'true', 'Allow HR to manually override attendance'),
  (NULL, 'attendance', 'track_break_time', 'false', 'Track lunch/break deductions'),
  (NULL, 'attendance', 'break_duration_minutes', '60', 'Standard break duration in minutes'),
  (NULL, 'attendance', 'deduct_break_from_hours', 'true', 'Auto-deduct break from total hours')
ON CONFLICT DO NOTHING;
