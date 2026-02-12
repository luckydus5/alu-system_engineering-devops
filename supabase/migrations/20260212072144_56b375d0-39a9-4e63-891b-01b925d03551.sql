
-- 1. Update the default annual leave from 21 to 18 days
CREATE OR REPLACE FUNCTION public.initialize_default_leave_balances()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_yr integer := EXTRACT(year FROM CURRENT_DATE);
  leave_defaults jsonb := '[
    {"type": "annual", "days": 18},
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
$function$;

-- 2. Create a table for leave management permissions (who can file leave for others)
CREATE TABLE IF NOT EXISTS public.leave_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  granted_by uuid NOT NULL,
  can_file_for_others boolean NOT NULL DEFAULT true,
  can_edit_balances boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.leave_managers ENABLE ROW LEVEL SECURITY;

-- Super admins can manage leave managers
CREATE POLICY "Super admins can manage leave_managers"
  ON public.leave_managers
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Authenticated users can view leave managers (to check own permissions)
CREATE POLICY "Authenticated users can view leave_managers"
  ON public.leave_managers
  FOR SELECT
  USING (true);

-- Also update existing annual balances from 21 to 18 for anyone who hasn't used any
UPDATE leave_balances
SET total_days = 18
WHERE leave_type = 'annual'
  AND year = EXTRACT(year FROM CURRENT_DATE)
  AND used_days = 0
  AND total_days = 21;
