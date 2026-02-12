import { LeaveApproverRole } from '@/hooks/useLeaveApprovers';

export interface SystemPosition {
  value: LeaveApproverRole;
  label: string;
  description: string;
}

export const SYSTEM_POSITIONS: SystemPosition[] = [
  { value: 'peat_manager', label: 'Peat Manager', description: 'Controls and approves leave requests before HR' },
  { value: 'hr_reviewer', label: 'HR Officer', description: 'Reviews leave requests after manager approval' },
  { value: 'gm_approver', label: 'General Manager', description: 'Final leave approval authority' },
  { value: 'om_approver', label: 'Operations Manager', description: 'Final leave approval authority' },
  { value: 'it_manager', label: 'IT Manager', description: 'Manages IT department and support operations' },
  { value: 'it_officer', label: 'IT Officer', description: 'Handles IT support and equipment management' },
];

export const POSITION_LABELS: Record<string, string> = {
  peat_manager: 'Peat Manager',
  hr_reviewer: 'HR Officer',
  gm_approver: 'General Manager',
  om_approver: 'Operations Manager',
  it_manager: 'IT Manager',
  it_officer: 'IT Officer',
};

export const POSITION_COLORS: Record<string, string> = {
  peat_manager: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  hr_reviewer: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  gm_approver: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  om_approver: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  it_manager: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  it_officer: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
};
