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
];

export const POSITION_LABELS: Record<string, string> = {
  peat_manager: 'Peat Manager',
  hr_reviewer: 'HR Officer',
  gm_approver: 'General Manager',
  om_approver: 'Operations Manager',
};
