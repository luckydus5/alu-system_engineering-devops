
-- Fix 1: Remove the overly permissive inventory UPDATE policy
DROP POLICY IF EXISTS "Allow inventory update for item requests" ON public.inventory_items;

-- Fix 2: Drop and recreate check_pending_password_reset without exposing the token
DROP FUNCTION IF EXISTS public.check_pending_password_reset(text);

CREATE OR REPLACE FUNCTION public.check_pending_password_reset(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  found_reset BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM admin_password_resets apr
    WHERE LOWER(apr.user_email) = LOWER(email_to_check)
      AND apr.is_used = false
      AND apr.expires_at > now()
  ) INTO found_reset;

  RETURN found_reset;
END;
$$;
