-- Add 'peat_admin' to the leave_approver_role enum
ALTER TYPE public.leave_approver_role ADD VALUE IF NOT EXISTS 'peat_admin';