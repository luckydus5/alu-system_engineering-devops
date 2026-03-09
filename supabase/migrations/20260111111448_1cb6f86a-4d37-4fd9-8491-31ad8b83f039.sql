-- Fix overly permissive notification INSERT policies
-- Replace with proper service role check

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can create notifications for users" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a better policy that allows authenticated users to create notifications for others
-- (This is typically done by the system/triggers, so we restrict to service role or self)
CREATE POLICY "Users can create notifications for themselves"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Fix audit_logs policy - remove admin access to audit logs (only super_admin should see them)
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

-- Update RLS policies to scope admins to their department for certain operations
-- First, create a helper function to get the admin's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Update profiles policy for admins to only see users in their department
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can view profiles in their department"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'director'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND department_id = get_user_department(auth.uid()))
  OR id = auth.uid()
);

CREATE POLICY "Admins can update profiles in their department"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND department_id = get_user_department(auth.uid()))
  OR id = auth.uid()
);

-- Update user_roles policies to scope admins to their department
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can view roles in their department"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'director'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND department_id = get_user_department(auth.uid()))
  OR user_id = auth.uid()
);

CREATE POLICY "Admins can update roles in their department"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND department_id = get_user_department(auth.uid()))
);

CREATE POLICY "Admins can insert roles in their department"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND department_id = get_user_department(auth.uid()))
);

CREATE POLICY "Admins can delete roles in their department"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND department_id = get_user_department(auth.uid()))
);

-- Update user_department_access policies - only super_admin can manage department access
DROP POLICY IF EXISTS "Admins can view all department access" ON public.user_department_access;
DROP POLICY IF EXISTS "Admins can insert department access" ON public.user_department_access;
DROP POLICY IF EXISTS "Admins can delete department access" ON public.user_department_access;
DROP POLICY IF EXISTS "Only admins can manage department access" ON public.user_department_access;

CREATE POLICY "Super admins can manage all department access"
ON public.user_department_access
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));