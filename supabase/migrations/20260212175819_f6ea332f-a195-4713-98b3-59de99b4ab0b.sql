
CREATE OR REPLACE FUNCTION public.initialize_default_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  completed_months integer := EXTRACT(month FROM CURRENT_DATE) - 1;
  policy_accrual text;
  policy_cap text;
  accrual_rate numeric;
  annual_cap numeric;
  accrued_annual numeric;
  leave_defaults jsonb;
  default_rec jsonb;
BEGIN
  -- Read accrual rate and cap from company_policies
  SELECT policy_value INTO policy_accrual
  FROM company_policies
  WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'monthly_accrual_days'
  LIMIT 1;

  SELECT policy_value INTO policy_cap
  FROM company_policies
  WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_annual_days'
  LIMIT 1;

  accrual_rate := COALESCE(policy_accrual::numeric, 1.5);
  annual_cap := COALESCE(policy_cap::numeric, 18);
  accrued_annual := LEAST(completed_months * accrual_rate, annual_cap);

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
