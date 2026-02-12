
-- Add 'gm_pending' to the leave_status enum
ALTER TYPE public.leave_status ADD VALUE IF NOT EXISTS 'gm_pending';

-- Add General Manager review columns to leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS gm_reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS gm_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS gm_comment text;

-- Update RLS: GMs (directors/managers with specific role) can view and update leave requests forwarded to them
-- Directors can already see via existing policy, so we just need to ensure gm_pending requests are visible

-- Add policy for leave_managers to insert leave requests on behalf of others
CREATE POLICY "Leave managers can create leave requests for others"
ON public.leave_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leave_managers lm
    WHERE lm.user_id = auth.uid()
    AND lm.can_file_for_others = true
  )
);
