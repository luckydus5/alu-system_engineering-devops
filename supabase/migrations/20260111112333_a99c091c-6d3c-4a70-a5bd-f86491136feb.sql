-- Fix overly permissive RLS policies for system_events and system_reports
-- Only service role (edge functions) should be able to insert

-- Drop the permissive insert policies
DROP POLICY IF EXISTS "System can insert events" ON public.system_events;
DROP POLICY IF EXISTS "System can insert reports" ON public.system_reports;

-- Create more restrictive policies that still allow service role operations
-- These tables will be populated by edge functions using service role key
-- No direct insert from client is allowed

-- For system_events: allow super_admin to insert (for manual events)
CREATE POLICY "Super admins can insert system events"
  ON public.system_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- For system_reports: allow super_admin to insert (for manual reports)
CREATE POLICY "Super admins can insert system reports"
  ON public.system_reports FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));