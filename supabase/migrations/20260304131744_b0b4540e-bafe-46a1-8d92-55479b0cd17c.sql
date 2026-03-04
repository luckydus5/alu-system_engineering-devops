
UPDATE attendance_records
SET 
  clock_out = clock_out + INTERVAL '1 day',
  shift_type = 'night',
  status = CASE 
    WHEN EXTRACT(DOW FROM attendance_date) = 6 THEN 'half_day'::attendance_status
    ELSE 'present'::attendance_status
  END,
  total_hours = ROUND(EXTRACT(EPOCH FROM (clock_out + INTERVAL '1 day' - clock_in)) / 3600.0, 2),
  regular_hours = LEAST(
    ROUND(EXTRACT(EPOCH FROM (clock_out + INTERVAL '1 day' - clock_in)) / 3600.0, 2),
    9
  ),
  overtime_hours = CASE
    WHEN ROUND(EXTRACT(EPOCH FROM (clock_out + INTERVAL '1 day' - clock_in)) / 3600.0, 2) - 9 >= 0.5
    THEN LEAST(
      ROUND(EXTRACT(EPOCH FROM (clock_out + INTERVAL '1 day' - clock_in)) / 3600.0, 2) - 9,
      3
    )
    ELSE 0
  END,
  updated_at = now()
WHERE clock_in IS NOT NULL 
  AND clock_out IS NOT NULL 
  AND clock_out < clock_in
  AND EXTRACT(HOUR FROM clock_in) >= 12;
