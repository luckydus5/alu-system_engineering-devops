-- Add unique constraint on user_id for user_sessions to enable upsert
ALTER TABLE public.user_sessions ADD CONSTRAINT user_sessions_user_id_key UNIQUE (user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON public.user_sessions(user_id, is_active);