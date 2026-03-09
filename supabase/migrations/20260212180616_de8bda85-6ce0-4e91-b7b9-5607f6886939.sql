
CREATE OR REPLACE FUNCTION public.initialize_default_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  completed_months integer := EXTRACT(month FROM CURRENT_DATE) - 1;
  accrual_rate numeric;
  annual_cap numeric;
  accrued_annual numeric;
  leave_defaults jsonb;
  default_rec jsonb;

  -- Helper to read a policy value with fallback
  v_sick numeric;
  v_personal numeric;
  v_maternity numeric;
  v_paternity numeric;
  v_bereavement numeric;
  v_unpaid numeric;
  tmp text;
BEGIN
  -- Read accrual rate and annual cap from company_policies
  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'monthly_accrual_days' LIMIT 1;
  accrual_rate := COALESCE(tmp::numeric, 1.5);

  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_annual_days' LIMIT 1;
  annual_cap := COALESCE(tmp::numeric, 18);

  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_sick_days' LIMIT 1;
  v_sick := COALESCE(tmp::numeric, 10);

  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_personal_days' LIMIT 1;
  v_personal := COALESCE(tmp::numeric, 5);

  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_maternity_days' LIMIT 1;
  v_maternity := COALESCE(tmp::numeric, 90);

  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_paternity_days' LIMIT 1;
  v_paternity := COALESCE(tmp::numeric, 10);

  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_bereavement_days' LIMIT 1;
  v_bereavement := COALESCE(tmp::numeric, 5);

  SELECT policy_value INTO tmp FROM company_policies
    WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_unpaid_days' LIMIT 1;
  v_unpaid := COALESCE(tmp::numeric, 30);

  accrued_annual := LEAST(completed_months * accrual_rate, annual_cap);

  leave_defaults := jsonb_build_array(
    jsonb_build_object('type', 'annual', 'days', accrued_annual),
    jsonb_build_object('type', 'sick', 'days', v_sick),
    jsonb_build_object('type', 'personal', 'days', v_personal),
    jsonb_build_object('type', 'maternity', 'days', v_maternity),
    jsonb_build_object('type', 'paternity', 'days', v_paternity),
    jsonb_build_object('type', 'bereavement', 'days', v_bereavement),
    jsonb_build_object('type', 'unpaid', 'days', v_unpaid)
  );

  FOR default_rec IN SELECT * FROM jsonb_array_elements(leave_defaults)
  LOOP
    -- Update existing balances to match policy
    UPDATE leave_balances
    SET total_days = (default_rec->>'days')::numeric,
        updated_at = now()
    WHERE leave_type = (default_rec->>'type')::leave_type
      AND year = current_yr
      AND total_days != (default_rec->>'days')::numeric;

    -- Insert for any profiles that don't have a balance yet
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
