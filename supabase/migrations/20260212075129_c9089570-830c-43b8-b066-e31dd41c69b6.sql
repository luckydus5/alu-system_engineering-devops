
-- Company policies table for centralized rule configuration
CREATE TABLE public.company_policies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  policy_category text NOT NULL, -- 'attendance', 'leave', 'overtime'
  policy_key text NOT NULL,
  policy_value text NOT NULL,
  description text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, policy_category, policy_key)
);

-- Allow null company_id for global defaults
CREATE UNIQUE INDEX idx_company_policies_global ON company_policies (policy_category, policy_key) WHERE company_id IS NULL;

-- Enable RLS
ALTER TABLE public.company_policies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view company policies"
ON public.company_policies FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage company policies"
ON public.company_policies FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage company policies"
ON public.company_policies FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_company_policies_updated_at
BEFORE UPDATE ON public.company_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default global policies
INSERT INTO company_policies (company_id, policy_category, policy_key, policy_value, description) VALUES
-- Attendance Rules
(NULL, 'attendance', 'work_start_time', '08:00', 'Standard work start time'),
(NULL, 'attendance', 'work_end_time', '17:00', 'Standard work end time'),
(NULL, 'attendance', 'late_threshold_minutes', '15', 'Minutes after start time before marked late'),
(NULL, 'attendance', 'half_day_hours', '4', 'Minimum hours for half-day credit'),
(NULL, 'attendance', 'grace_period_minutes', '5', 'Grace period before late is recorded'),
(NULL, 'attendance', 'weekend_policy', 'sat_half_sun_off', 'Weekend policy: sat_half_sun_off, sat_off_sun_off, all_working'),
(NULL, 'attendance', 'auto_absent_if_no_clock_in', 'true', 'Automatically mark absent if no clock-in by end of day'),
(NULL, 'attendance', 'require_clock_out', 'true', 'Require clock-out for attendance to be valid'),
-- Leave Rules
(NULL, 'leave', 'default_annual_days', '18', 'Default annual leave days per year'),
(NULL, 'leave', 'default_sick_days', '10', 'Default sick leave days per year'),
(NULL, 'leave', 'default_personal_days', '5', 'Default personal leave days per year'),
(NULL, 'leave', 'default_maternity_days', '90', 'Default maternity leave days'),
(NULL, 'leave', 'default_paternity_days', '10', 'Default paternity leave days'),
(NULL, 'leave', 'default_bereavement_days', '5', 'Default bereavement leave days'),
(NULL, 'leave', 'default_unpaid_days', '30', 'Maximum unpaid leave days'),
(NULL, 'leave', 'carry_over_enabled', 'false', 'Allow carry-over of unused leave to next year'),
(NULL, 'leave', 'carry_over_max_days', '5', 'Maximum days that can be carried over'),
(NULL, 'leave', 'probation_months', '3', 'Months of probation before leave eligibility'),
(NULL, 'leave', 'require_manager_approval', 'true', 'Require department manager approval'),
(NULL, 'leave', 'require_hr_approval', 'true', 'Require HR review after manager approval'),
(NULL, 'leave', 'require_gm_approval', 'true', 'Require General Manager final approval'),
(NULL, 'leave', 'saturday_counts_half', 'true', 'Saturday counts as 0.5 leave day'),
(NULL, 'leave', 'sunday_counts_zero', 'true', 'Sunday does not count as leave day'),
-- Overtime Rules
(NULL, 'overtime', 'ot_enabled', 'true', 'Enable overtime tracking'),
(NULL, 'overtime', 'weekday_ot_rate', '1.5', 'Overtime rate multiplier for weekdays'),
(NULL, 'overtime', 'saturday_ot_rate', '1.5', 'Overtime rate multiplier for Saturdays'),
(NULL, 'overtime', 'sunday_ot_rate', '2.0', 'Overtime rate multiplier for Sundays'),
(NULL, 'overtime', 'holiday_ot_rate', '2.5', 'Overtime rate multiplier for holidays'),
(NULL, 'overtime', 'max_ot_hours_per_day', '4', 'Maximum overtime hours allowed per day'),
(NULL, 'overtime', 'max_ot_hours_per_month', '40', 'Maximum overtime hours allowed per month'),
(NULL, 'overtime', 'ot_requires_approval', 'true', 'Overtime must be pre-approved by supervisor'),
(NULL, 'overtime', 'ot_threshold_minutes', '30', 'Minimum overtime minutes before it counts'),
(NULL, 'overtime', 'ot_calculation_base', 'daily_rate', 'Base for OT calculation: daily_rate, hourly_rate, monthly_salary');
