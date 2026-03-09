
-- Monthly accrual function: adds 1.5 days (or policy-configured amount) to annual leave balance
-- Called at end of each month by cron. Caps at annual allowance (default 18).
CREATE OR REPLACE FUNCTION public.accrue_monthly_annual_leave()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  default_accrual numeric := 1.5;
  default_annual_cap numeric := 18;
  policy_accrual text;
  policy_cap text;
  accrual_rate numeric;
  annual_cap numeric;
BEGIN
  -- Read accrual rate from company_policies (global default)
  SELECT policy_value INTO policy_accrual
  FROM company_policies
  WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'monthly_accrual_days'
  LIMIT 1;

  SELECT policy_value INTO policy_cap
  FROM company_policies
  WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_annual_days'
  LIMIT 1;

  accrual_rate := COALESCE(policy_accrual::numeric, default_accrual);
  annual_cap := COALESCE(policy_cap::numeric, default_annual_cap);

  -- Add accrual to all annual leave balances for the current year, capped at annual allowance
  UPDATE leave_balances
  SET total_days = LEAST(total_days + accrual_rate, annual_cap),
      updated_at = now()
  WHERE leave_type = 'annual'
    AND year = current_yr
    AND total_days < annual_cap;
END;
$function$;

-- Reset all annual leave total_days to accrued amount based on completed months
-- Feb = 1 completed month = 1.5 days
DO $$
DECLARE
  completed_months integer := EXTRACT(month FROM CURRENT_DATE) - 1;
  default_accrual numeric := 1.5;
  accrued numeric;
BEGIN
  -- Cap: don't exceed 18
  accrued := LEAST(completed_months * default_accrual, 18);
  
  UPDATE leave_balances
  SET total_days = GREATEST(accrued, used_days) -- never go below used_days
  WHERE leave_type = 'annual'
    AND year = EXTRACT(year FROM CURRENT_DATE);
END $$;

-- Update initialize function to set annual leave based on accrual (not full 18)
CREATE OR REPLACE FUNCTION public.initialize_default_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  completed_months integer := EXTRACT(month FROM CURRENT_DATE) - 1;
  accrued_annual numeric := LEAST(completed_months * 1.5, 18);
  leave_defaults jsonb;
  default_rec jsonb;
BEGIN
  leave_defaults := jsonb_build_array(
    jsonb_build_object('type', 'annual', 'days', accrued_annual),
    jsonb_build_object('type', 'sick', 'days', 10),
    jsonb_build_object('type', 'personal', 'days', 5),
    jsonb_build_object('type', 'maternity', 'days', 90),
    jsonb_build_object('type', 'paternity', 'days', 10),
    jsonb_build_object('type', 'bereavement', 'days', 5),
    jsonb_build_object('type', 'unpaid', 'days', 30)
  );

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
$function$;
