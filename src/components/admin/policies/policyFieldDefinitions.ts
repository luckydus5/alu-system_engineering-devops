import { 
  Clock, CalendarDays, TrendingUp, Timer, Coffee, 
  Briefcase, Baby, Heart, DollarSign, Sun, Moon,
  UserCheck, ArrowRightLeft, AlertTriangle, Repeat,
  ClipboardCheck, Sandwich
} from 'lucide-react';
import { PolicyField } from './PolicyFieldRenderer';

export const SHIFT_FIELDS: PolicyField[] = [
  { key: 'day_shift_start', label: 'Day Shift Start', type: 'time', icon: Sun, description: 'Official day shift start time' },
  { key: 'day_shift_end', label: 'Day Shift End', type: 'time', icon: Sun, description: 'Official day shift end time' },
  { key: 'night_shift_start', label: 'Night Shift Start', type: 'time', icon: Moon, description: 'Official night shift start time' },
  { key: 'night_shift_end', label: 'Night Shift End', type: 'time', icon: Moon, description: 'Official night shift end time (next day)' },
  { key: 'shift_detection_threshold', label: 'Night Shift Threshold', type: 'time', icon: Clock, description: 'Check-in at or after this = night shift' },
  { key: 'early_checkin_counts_ot', label: 'Early Check-in = OT', type: 'boolean', icon: Timer, description: 'Count early arrival as overtime' },
  { key: 'cross_midnight_detection', label: 'Cross-Midnight Detection', type: 'boolean', icon: ArrowRightLeft, description: 'Auto-detect shifts spanning midnight' },
  { key: 'multiple_checkin_policy', label: 'Multiple Check-in Policy', type: 'select', icon: Repeat, description: 'How to handle multiple check-ins/outs per day', options: [
    { value: 'first_in_last_out', label: 'First In / Last Out' },
    { value: 'last_in_last_out', label: 'Last In / Last Out' },
    { value: 'all_entries', label: 'Track All Entries' },
  ]},
];

export const ATTENDANCE_FIELDS: PolicyField[] = [
  { key: 'work_start_time', label: 'Work Start Time', type: 'time', icon: Clock, description: 'Official start of work day' },
  { key: 'work_end_time', label: 'Work End Time', type: 'time', icon: Clock, description: 'Official end of work day' },
  { key: 'late_threshold_minutes', label: 'Late Threshold', type: 'number', unit: 'minutes', icon: Timer, description: 'Minutes after start before marked late' },
  { key: 'grace_period_minutes', label: 'Grace Period', type: 'number', unit: 'minutes', icon: Coffee, description: 'Buffer before late is recorded' },
  { key: 'half_day_hours', label: 'Half Day Hours', type: 'number', unit: 'hours', description: 'Minimum hours for half-day credit' },
  { key: 'min_hours_full_day', label: 'Full Day Hours', type: 'number', unit: 'hours', icon: ClipboardCheck, description: 'Minimum hours for full day credit' },
  { key: 'weekend_policy', label: 'Weekend Policy', type: 'select', options: [
    { value: 'sat_half_sun_off', label: 'Saturday Half / Sunday Off' },
    { value: 'sat_off_sun_off', label: 'Saturday Off / Sunday Off' },
    { value: 'all_working', label: 'All Days Working' },
  ], description: 'How weekends are handled' },
  { key: 'auto_absent_if_no_clock_in', label: 'Auto-Mark Absent', type: 'boolean', description: 'Mark absent if no clock-in by end of day' },
  { key: 'absent_auto_mark_time', label: 'Auto-Absent Time', type: 'time', icon: AlertTriangle, description: 'Mark absent if no check-in by this time' },
  { key: 'require_clock_out', label: 'Require Clock Out', type: 'boolean', description: 'Clock-out required for valid attendance' },
  { key: 'allow_manual_override', label: 'Allow Manual Override', type: 'boolean', icon: UserCheck, description: 'Allow HR to manually override attendance' },
  { key: 'track_break_time', label: 'Track Breaks', type: 'boolean', icon: Sandwich, description: 'Track lunch/break deductions' },
  { key: 'break_duration_minutes', label: 'Break Duration', type: 'number', unit: 'minutes', icon: Coffee, description: 'Standard break duration' },
  { key: 'deduct_break_from_hours', label: 'Deduct Break', type: 'boolean', description: 'Auto-deduct break from total hours' },
];

export const LEAVE_FIELDS: PolicyField[] = [
  { key: 'default_annual_days', label: 'Annual Leave', type: 'number', unit: 'days', icon: CalendarDays, description: 'Default annual leave per year' },
  { key: 'default_sick_days', label: 'Sick Leave', type: 'number', unit: 'days', icon: Heart, description: 'Default sick days per year' },
  { key: 'default_personal_days', label: 'Personal Leave', type: 'number', unit: 'days', icon: Briefcase, description: 'Default personal days per year' },
  { key: 'default_maternity_days', label: 'Maternity Leave', type: 'number', unit: 'days', icon: Baby, description: 'Maternity leave days' },
  { key: 'default_paternity_days', label: 'Paternity Leave', type: 'number', unit: 'days', icon: Baby, description: 'Paternity leave days' },
  { key: 'default_bereavement_days', label: 'Bereavement Leave', type: 'number', unit: 'days', description: 'Bereavement leave days' },
  { key: 'default_unpaid_days', label: 'Max Unpaid Leave', type: 'number', unit: 'days', description: 'Maximum unpaid leave days' },
  { key: 'carry_over_enabled', label: 'Allow Carry-Over', type: 'boolean', description: 'Allow unused leave to carry over' },
  { key: 'carry_over_max_days', label: 'Max Carry-Over Days', type: 'number', unit: 'days', description: 'Maximum days carried over' },
  { key: 'probation_months', label: 'Probation Period', type: 'number', unit: 'months', description: 'Months before leave eligibility' },
  { key: 'require_manager_approval', label: 'Manager Approval', type: 'boolean', description: 'Require department manager approval' },
  { key: 'require_hr_approval', label: 'HR Review', type: 'boolean', description: 'Require HR review step' },
  { key: 'require_gm_approval', label: 'GM Approval', type: 'boolean', description: 'Require General Manager approval' },
  { key: 'saturday_counts_half', label: 'Saturday = 0.5 Day', type: 'boolean', description: 'Saturday counts as half leave day' },
  { key: 'sunday_counts_zero', label: 'Sunday = 0 Days', type: 'boolean', description: 'Sunday not counted as leave day' },
];

export const OVERTIME_FIELDS: PolicyField[] = [
  { key: 'ot_enabled', label: 'Overtime Tracking', type: 'boolean', icon: TrendingUp, description: 'Enable overtime tracking system' },
  { key: 'day_shift_ot_start', label: 'Day OT Starts After', type: 'time', icon: Sun, description: 'Day shift OT only counted after this time' },
  { key: 'day_shift_ot_min_minutes', label: 'Day OT Minimum', type: 'number', unit: 'minutes', icon: Timer, description: 'Below this = no OT for day shift' },
  { key: 'day_shift_ot_max_hours', label: 'Day OT Maximum', type: 'number', unit: 'hours', icon: Sun, description: 'Maximum OT hours per day shift' },
  { key: 'night_shift_ot_start', label: 'Night OT Starts After', type: 'time', icon: Moon, description: 'Night shift OT only counted after this time' },
  { key: 'night_shift_ot_min_minutes', label: 'Night OT Minimum', type: 'number', unit: 'minutes', icon: Timer, description: 'Below this = no OT for night shift' },
  { key: 'night_shift_ot_max_hours', label: 'Night OT Maximum', type: 'number', unit: 'hours', icon: Moon, description: 'Maximum OT hours per night shift' },
  { key: 'weekday_ot_rate', label: 'Weekday OT Rate', type: 'number', unit: '×', icon: DollarSign, description: 'Overtime multiplier for weekdays' },
  { key: 'saturday_ot_rate', label: 'Saturday OT Rate', type: 'number', unit: '×', description: 'Overtime multiplier for Saturdays' },
  { key: 'sunday_ot_rate', label: 'Sunday OT Rate', type: 'number', unit: '×', description: 'Overtime multiplier for Sundays' },
  { key: 'holiday_ot_rate', label: 'Holiday OT Rate', type: 'number', unit: '×', description: 'Overtime multiplier for holidays' },
  { key: 'max_ot_hours_per_day', label: 'Max OT/Day', type: 'number', unit: 'hours', description: 'Maximum OT hours per day' },
  { key: 'max_ot_hours_per_month', label: 'Max OT/Month', type: 'number', unit: 'hours', description: 'Maximum OT hours per month' },
  { key: 'ot_requires_approval', label: 'Require Approval', type: 'boolean', description: 'OT must be pre-approved' },
  { key: 'ot_approval_required', label: 'OT Approval Required', type: 'boolean', description: 'Whether OT requires pre-approval' },
  { key: 'ot_rounding_increment', label: 'OT Rounding', type: 'number', unit: 'minutes', description: 'Round OT to nearest X minutes' },
  { key: 'ot_threshold_minutes', label: 'OT Threshold', type: 'number', unit: 'minutes', description: 'Minimum minutes before OT counts' },
  { key: 'ot_calculation_base', label: 'Calculation Base', type: 'select', options: [
    { value: 'daily_rate', label: 'Daily Rate' },
    { value: 'hourly_rate', label: 'Hourly Rate' },
    { value: 'monthly_salary', label: 'Monthly Salary' },
  ], description: 'Base for OT calculation' },
];
