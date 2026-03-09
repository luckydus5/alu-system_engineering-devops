-- Create table to store per-employee leave entitlement overrides
CREATE TABLE IF NOT EXISTS public.employee_leave_entitlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  annual_days numeric NOT NULL DEFAULT 18,
  monthly_accrual numeric GENERATED ALWAYS AS (annual_days / 12.0) STORED,
  sick_days numeric NOT NULL DEFAULT 10,
  personal_days numeric NOT NULL DEFAULT 5,
  maternity_days numeric NOT NULL DEFAULT 90,
  paternity_days numeric NOT NULL DEFAULT 10,
  bereavement_days numeric NOT NULL DEFAULT 5,
  unpaid_days numeric NOT NULL DEFAULT 30,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.employee_leave_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can manage employee entitlements"
  ON public.employee_leave_entitlements FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id
      WHERE ur.user_id = auth.uid() AND d.code = 'HR'
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM user_roles ur JOIN departments d ON ur.department_id = d.id
      WHERE ur.user_id = auth.uid() AND d.code = 'HR'
    )
  );

CREATE POLICY "Users can view their own entitlement"
  ON public.employee_leave_entitlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_employee_leave_entitlements_updated_at
  BEFORE UPDATE ON public.employee_leave_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update accrue_monthly_annual_leave to respect per-employee entitlements
CREATE OR REPLACE FUNCTION public.accrue_monthly_annual_leave()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  default_accrual numeric := 1.5;
  default_annual_cap numeric := 18;
  policy_accrual text;
  policy_cap text;
  global_accrual_rate numeric;
  global_annual_cap numeric;
  bal_rec RECORD;
  emp_accrual numeric;
  emp_cap numeric;
BEGIN
  SELECT policy_value INTO policy_accrual
  FROM company_policies
  WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'monthly_accrual_days' LIMIT 1;

  SELECT policy_value INTO policy_cap
  FROM company_policies
  WHERE company_id IS NULL AND policy_category = 'leave' AND policy_key = 'default_annual_days' LIMIT 1;

  global_accrual_rate := COALESCE(policy_accrual::numeric, default_accrual);
  global_annual_cap := COALESCE(policy_cap::numeric, default_annual_cap);

  -- Loop through all annual leave balances for current year
  FOR bal_rec IN
    SELECT lb.id, lb.user_id, lb.total_days, lb.used_days
    FROM leave_balances lb
    WHERE lb.leave_type = 'annual' AND lb.year = current_yr
  LOOP
    -- Check if employee has a custom entitlement
    SELECT annual_days, monthly_accrual INTO emp_cap, emp_accrual
    FROM employee_leave_entitlements
    WHERE user_id = bal_rec.user_id;

    -- Fall back to global values if no custom setting
    emp_accrual := COALESCE(emp_accrual, global_accrual_rate);
    emp_cap := COALESCE(emp_cap, global_annual_cap);

    -- Accrue only if below cap
    IF bal_rec.total_days < emp_cap THEN
      UPDATE leave_balances
      SET total_days = LEAST(total_days + emp_accrual, emp_cap),
          updated_at = now()
      WHERE id = bal_rec.id;
    END IF;
  END LOOP;
END;
$$;

-- Update initialize_default_leave_balances to respect per-employee entitlements
CREATE OR REPLACE FUNCTION public.initialize_default_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  completed_months integer := EXTRACT(month FROM CURRENT_DATE) - 1;
  accrual_rate numeric;
  annual_cap numeric;
  accrued_annual numeric;
  leave_defaults jsonb;
  default_rec jsonb;
  v_sick numeric;
  v_personal numeric;
  v_maternity numeric;
  v_paternity numeric;
  v_bereavement numeric;
  v_unpaid numeric;
  tmp text;
  profile_rec RECORD;
  emp_entitlement RECORD;
  emp_annual_cap numeric;
  emp_accrual_rate numeric;
  emp_accrued numeric;
BEGIN
  -- Read global defaults from company_policies
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

  -- Process each profile with per-employee entitlement overrides
  FOR profile_rec IN SELECT id FROM profiles
  LOOP
    -- Check for custom entitlement
    SELECT * INTO emp_entitlement FROM employee_leave_entitlements WHERE user_id = profile_rec.id;

    emp_annual_cap   := COALESCE(emp_entitlement.annual_days, annual_cap);
    emp_accrual_rate := COALESCE(emp_entitlement.monthly_accrual, accrual_rate);
    emp_accrued      := LEAST(completed_months * emp_accrual_rate, emp_annual_cap);

    -- Annual leave — use per-employee cap and accrual
    IF NOT EXISTS (
      SELECT 1 FROM leave_balances WHERE user_id = profile_rec.id AND leave_type = 'annual' AND year = current_yr
    ) THEN
      INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, year)
      VALUES (profile_rec.id, 'annual', emp_accrued, 0, current_yr);
    ELSE
      -- Only update cap if out of sync with entitlement (don't reduce below used)
      UPDATE leave_balances
      SET total_days = GREATEST(used_days, LEAST(total_days, emp_annual_cap)),
          updated_at = now()
      WHERE user_id = profile_rec.id AND leave_type = 'annual' AND year = current_yr
        AND total_days > emp_annual_cap;
    END IF;

    -- Other leave types: insert if missing, update to match entitlement if changed
    DECLARE
      leave_type_val leave_type;
      days_val numeric;
    BEGIN
      FOR leave_type_val, days_val IN
        VALUES
          ('sick'::leave_type,        COALESCE(emp_entitlement.sick_days, v_sick)),
          ('personal'::leave_type,    COALESCE(emp_entitlement.personal_days, v_personal)),
          ('maternity'::leave_type,   COALESCE(emp_entitlement.maternity_days, v_maternity)),
          ('paternity'::leave_type,   COALESCE(emp_entitlement.paternity_days, v_paternity)),
          ('bereavement'::leave_type, COALESCE(emp_entitlement.bereavement_days, v_bereavement)),
          ('unpaid'::leave_type,      COALESCE(emp_entitlement.unpaid_days, v_unpaid))
      LOOP
        IF NOT EXISTS (
          SELECT 1 FROM leave_balances WHERE user_id = profile_rec.id AND leave_type = leave_type_val AND year = current_yr
        ) THEN
          INSERT INTO leave_balances (user_id, leave_type, total_days, used_days, year)
          VALUES (profile_rec.id, leave_type_val, days_val, 0, current_yr);
        END IF;
      END LOOP;
    END;
  END LOOP;
END;
$$;