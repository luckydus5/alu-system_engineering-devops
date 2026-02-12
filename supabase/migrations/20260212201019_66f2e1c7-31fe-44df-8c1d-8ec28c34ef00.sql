-- Ensure only one active approver per role (optionally per company)
CREATE UNIQUE INDEX unique_active_approver_per_role 
ON public.leave_approvers (approver_role, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'))
WHERE is_active = true;