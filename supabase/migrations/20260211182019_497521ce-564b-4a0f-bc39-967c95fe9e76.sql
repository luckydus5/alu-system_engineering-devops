
-- Function to deduct leave balances daily for active approved leaves
CREATE OR REPLACE FUNCTION public.deduct_active_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- For each approved leave where today falls within the leave period,
  -- update the used_days on the corresponding leave_balance entry
  UPDATE leave_balances lb
  SET used_days = used_days + 1,
      updated_at = now()
  FROM leave_requests lr
  WHERE lb.user_id = lr.requester_id
    AND lb.leave_type = lr.leave_type
    AND lb.year = EXTRACT(year FROM CURRENT_DATE)
    AND lr.status = 'approved'
    AND lr.start_date <= CURRENT_DATE
    AND lr.end_date >= CURRENT_DATE
    AND lb.used_days < lb.total_days;
END;
$$;

-- Function to initialize default leave balances for employees who don't have them
CREATE OR REPLACE FUNCTION public.initialize_default_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  leave_defaults jsonb := '[
    {"type": "annual", "days": 21},
    {"type": "sick", "days": 10},
    {"type": "personal", "days": 5},
    {"type": "maternity", "days": 90},
    {"type": "paternity", "days": 10},
    {"type": "bereavement", "days": 5},
    {"type": "unpaid", "days": 30}
  ]'::jsonb;
  default_rec jsonb;
BEGIN
  FOR default_rec IN SELECT * FROM jsonb_array_elements(leave_defaults)
  LOOP
    INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, year)
    SELECT p.id, (default_rec->>'type')::leave_type, (default_rec->>'days')::numeric, 0, current_yr
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM leave_balances lb
      WHERE lb.user_id = p.id
        AND lb.leave_type = (default_rec->>'type')::leave_type
        AND lb.year = current_yr
    );
  END LOOP;
END;
$$;
