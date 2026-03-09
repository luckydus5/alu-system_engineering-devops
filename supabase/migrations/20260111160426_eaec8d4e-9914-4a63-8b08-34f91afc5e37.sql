-- Create table for admin-initiated password reset tokens
CREATE TABLE public.admin_password_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  initiated_by UUID NOT NULL,
  initiated_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  used_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.admin_password_resets ENABLE ROW LEVEL SECURITY;

-- Super admins can create reset tokens
CREATE POLICY "Super admins can create password reset tokens"
ON public.admin_password_resets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admins can view reset tokens
CREATE POLICY "Super admins can view password reset tokens"
ON public.admin_password_resets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Allow public read access for checking if email has pending reset (used at login)
CREATE POLICY "Anyone can check pending reset by email"
ON public.admin_password_resets
FOR SELECT
USING (
  is_used = false AND expires_at > now()
);

-- Create function to check if an email has a pending admin reset
CREATE OR REPLACE FUNCTION public.check_pending_password_reset(email_to_check TEXT)
RETURNS TABLE (has_pending_reset BOOLEAN, reset_token UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as has_pending_reset,
    apr.token as reset_token
  FROM admin_password_resets apr
  WHERE LOWER(apr.user_email) = LOWER(email_to_check)
    AND apr.is_used = false
    AND apr.expires_at > now()
  ORDER BY apr.created_at DESC
  LIMIT 1;
  
  -- If no rows returned, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID;
  END IF;
END;
$$;

-- Create index for faster lookups
CREATE INDEX idx_admin_password_resets_email ON public.admin_password_resets(user_email);
CREATE INDEX idx_admin_password_resets_token ON public.admin_password_resets(token);
CREATE INDEX idx_admin_password_resets_user_id ON public.admin_password_resets(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.admin_password_resets IS 'Stores password reset tokens initiated by super admins for users who have completely forgotten their passwords';
