
-- Allow leave approvers (peat_manager, hr_reviewer, gm_approver, om_approver) to view ALL leave requests
CREATE POLICY "Leave approvers can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leave_approvers la
    WHERE la.user_id = auth.uid()
    AND la.is_active = true
    AND la.approver_role IN ('peat_manager', 'hr_reviewer', 'gm_approver', 'om_approver')
  )
);

-- Allow leave approvers to update leave requests (for approval/rejection)
CREATE POLICY "Leave approvers can update leave requests"
ON public.leave_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM leave_approvers la
    WHERE la.user_id = auth.uid()
    AND la.is_active = true
    AND la.approver_role IN ('peat_manager', 'hr_reviewer', 'gm_approver', 'om_approver')
  )
);

-- Allow peat_admin (leave managers) to view all leave requests they filed
CREATE POLICY "Peat admins can view all leave requests"
ON public.leave_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leave_approvers la
    WHERE la.user_id = auth.uid()
    AND la.is_active = true
    AND la.approver_role = 'peat_admin'
  )
);

-- Allow leave approvers to view all leave balances (needed for HR checking days)
CREATE POLICY "Leave approvers can view all leave balances"
ON public.leave_balances
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leave_approvers la
    WHERE la.user_id = auth.uid()
    AND la.is_active = true
    AND la.approver_role IN ('peat_manager', 'hr_reviewer', 'gm_approver', 'om_approver')
  )
);
