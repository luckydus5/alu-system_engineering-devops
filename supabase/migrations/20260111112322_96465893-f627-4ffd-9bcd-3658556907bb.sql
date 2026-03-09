-- Create system_events table for tracking errors, suspicious activity, and performance issues
CREATE TABLE public.system_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'error', 'warning', 'suspicious', 'performance', 'auth_failure', 'info'
  severity TEXT NOT NULL DEFAULT 'info', -- 'critical', 'high', 'medium', 'low', 'info'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_sessions table for tracking active/inactive users in real-time
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_started TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  ip_address TEXT,
  user_agent TEXT,
  current_page TEXT
);

-- Create system_reports table for 10-minute auto-reports
CREATE TABLE public.system_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL DEFAULT 'periodic', -- 'periodic', 'alert', 'manual'
  summary JSONB NOT NULL DEFAULT '{}',
  issues_detected INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_events - only super_admin can view
CREATE POLICY "Super admins can view system events"
  ON public.system_events FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert events"
  ON public.system_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Super admins can update system events"
  ON public.system_events FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS policies for user_sessions
CREATE POLICY "Super admins can view all sessions"
  ON public.user_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can manage their own sessions"
  ON public.user_sessions FOR ALL
  USING (auth.uid() = user_id);

-- RLS policies for system_reports - only super_admin
CREATE POLICY "Super admins can view system reports"
  ON public.system_reports FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert reports"
  ON public.system_reports FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_system_events_created_at ON public.system_events(created_at DESC);
CREATE INDEX idx_system_events_type ON public.system_events(event_type);
CREATE INDEX idx_system_events_severity ON public.system_events(severity);
CREATE INDEX idx_system_events_resolved ON public.system_events(resolved);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_is_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_last_activity ON public.user_sessions(last_activity DESC);
CREATE INDEX idx_system_reports_created_at ON public.system_reports(created_at DESC);

-- Enable realtime for user_sessions
ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;

-- Function to cleanup old inactive sessions (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_inactive_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE last_activity < NOW() - INTERVAL '5 minutes'
  AND is_active = true;
  
  DELETE FROM public.user_sessions
  WHERE last_activity < NOW() - INTERVAL '24 hours';
END;
$$;