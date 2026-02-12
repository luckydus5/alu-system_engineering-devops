-- Add monthly accrual and cap policies
INSERT INTO public.company_policies (company_id, policy_category, policy_key, policy_value, description)
VALUES
  (NULL, 'leave', 'monthly_accrual_days', '1.5', 'Days accrued per month per employee'),
  (NULL, 'leave', 'accrual_cap_to_annual', 'true', 'Accrued days never exceed annual allowance unless HR overrides')
ON CONFLICT DO NOTHING;