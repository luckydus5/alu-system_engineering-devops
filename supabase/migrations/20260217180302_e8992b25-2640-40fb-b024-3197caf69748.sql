
ALTER TABLE public.company_leave_workflows
ADD COLUMN hr_auto_approve boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.company_leave_workflows.hr_auto_approve IS 'When true, HR step is auto-approved and request forwards directly to Dept Manager';
