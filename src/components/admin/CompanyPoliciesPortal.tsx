import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, CalendarDays, TrendingUp, Save, Loader2, 
  RefreshCw, Building2, Globe, Shield, AlertCircle,
  Timer, Coffee, Briefcase, Baby, Heart, DollarSign
} from 'lucide-react';
import { useCompanyPolicies, CompanyPolicy } from '@/hooks/useCompanyPolicies';
import { useCompanies } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Policy field definitions for rendering
interface PolicyField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'time' | 'boolean' | 'select';
  icon?: React.ElementType;
  unit?: string;
  options?: { value: string; label: string }[];
  description?: string;
}

const ATTENDANCE_FIELDS: PolicyField[] = [
  { key: 'work_start_time', label: 'Work Start Time', type: 'time', icon: Clock, description: 'Official start of work day' },
  { key: 'work_end_time', label: 'Work End Time', type: 'time', icon: Clock, description: 'Official end of work day' },
  { key: 'late_threshold_minutes', label: 'Late Threshold', type: 'number', unit: 'minutes', icon: Timer, description: 'Minutes after start before marked late' },
  { key: 'grace_period_minutes', label: 'Grace Period', type: 'number', unit: 'minutes', icon: Coffee, description: 'Buffer before late is recorded' },
  { key: 'half_day_hours', label: 'Half Day Hours', type: 'number', unit: 'hours', description: 'Minimum hours for half-day credit' },
  { key: 'weekend_policy', label: 'Weekend Policy', type: 'select', options: [
    { value: 'sat_half_sun_off', label: 'Saturday Half / Sunday Off' },
    { value: 'sat_off_sun_off', label: 'Saturday Off / Sunday Off' },
    { value: 'all_working', label: 'All Days Working' },
  ], description: 'How weekends are handled' },
  { key: 'auto_absent_if_no_clock_in', label: 'Auto-Mark Absent', type: 'boolean', description: 'Mark absent if no clock-in by end of day' },
  { key: 'require_clock_out', label: 'Require Clock Out', type: 'boolean', description: 'Clock-out required for valid attendance' },
];

const LEAVE_FIELDS: PolicyField[] = [
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

const OVERTIME_FIELDS: PolicyField[] = [
  { key: 'ot_enabled', label: 'Overtime Tracking', type: 'boolean', icon: TrendingUp, description: 'Enable overtime tracking system' },
  { key: 'weekday_ot_rate', label: 'Weekday OT Rate', type: 'number', unit: '×', icon: DollarSign, description: 'Overtime multiplier for weekdays' },
  { key: 'saturday_ot_rate', label: 'Saturday OT Rate', type: 'number', unit: '×', description: 'Overtime multiplier for Saturdays' },
  { key: 'sunday_ot_rate', label: 'Sunday OT Rate', type: 'number', unit: '×', description: 'Overtime multiplier for Sundays' },
  { key: 'holiday_ot_rate', label: 'Holiday OT Rate', type: 'number', unit: '×', description: 'Overtime multiplier for holidays' },
  { key: 'max_ot_hours_per_day', label: 'Max OT/Day', type: 'number', unit: 'hours', description: 'Maximum OT hours per day' },
  { key: 'max_ot_hours_per_month', label: 'Max OT/Month', type: 'number', unit: 'hours', description: 'Maximum OT hours per month' },
  { key: 'ot_requires_approval', label: 'Require Approval', type: 'boolean', description: 'OT must be pre-approved' },
  { key: 'ot_threshold_minutes', label: 'OT Threshold', type: 'number', unit: 'minutes', description: 'Minimum minutes before OT counts' },
  { key: 'ot_calculation_base', label: 'Calculation Base', type: 'select', options: [
    { value: 'daily_rate', label: 'Daily Rate' },
    { value: 'hourly_rate', label: 'Hourly Rate' },
    { value: 'monthly_salary', label: 'Monthly Salary' },
  ], description: 'Base for OT calculation' },
];

function PolicyFieldRenderer({ 
  field, 
  value, 
  onChange 
}: { 
  field: PolicyField; 
  value: string; 
  onChange: (val: string) => void;
}) {
  const Icon = field.icon;

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/40 transition-colors group">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
        {!Icon && <div className="w-9" />}
        <div className="min-w-0">
          <Label className="text-sm font-medium">{field.label}</Label>
          {field.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{field.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {field.type === 'boolean' ? (
          <Switch 
            checked={value === 'true'} 
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')} 
          />
        ) : field.type === 'select' ? (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'time' ? (
          <Input 
            type="time" 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="w-[140px] h-9" 
          />
        ) : (
          <div className="flex items-center gap-1.5">
            <Input 
              type="number" 
              value={value} 
              onChange={(e) => onChange(e.target.value)} 
              className="w-[100px] h-9 text-right" 
              step={field.key.includes('rate') ? '0.1' : '1'}
            />
            {field.unit && (
              <span className="text-xs text-muted-foreground w-12">{field.unit}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CompanyPoliciesPortal() {
  const [selectedCompany, setSelectedCompany] = useState<string>('global');
  const companyId = selectedCompany === 'global' ? null : selectedCompany;
  const { policies, isLoading, getPolicyValue, bulkUpdatePolicies, refetch } = useCompanyPolicies(companyId);
  const { companies } = useCompanies();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local values from policies
  useEffect(() => {
    if (policies.length > 0) {
      const vals: Record<string, string> = {};
      policies.forEach(p => {
        vals[`${p.policy_category}:${p.policy_key}`] = p.policy_value;
      });
      setLocalValues(vals);
      setHasChanges(false);
    }
  }, [policies]);

  const handleChange = (category: string, key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [`${category}:${key}`]: value }));
    setHasChanges(true);
  };

  const getLocalValue = (category: string, key: string): string => {
    return localValues[`${category}:${key}`] ?? getPolicyValue(category, key, '');
  };

  const handleSaveAll = async () => {
    const updates = Object.entries(localValues).map(([compositeKey, value]) => {
      const [category, key] = compositeKey.split(':');
      return { policy_category: category, policy_key: key, policy_value: value, company_id: companyId };
    });
    
    await bulkUpdatePolicies.mutateAsync(updates);
    setHasChanges(false);
  };

  const renderPolicySection = (category: string, fields: PolicyField[], title: string, description: string, icon: React.ElementType) => {
    const Icon = icon;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <Card className="shadow-corporate">
          <CardContent className="p-2">
            <div className="divide-y divide-border/50">
              {fields.map(field => (
                <PolicyFieldRenderer
                  key={field.key}
                  field={field}
                  value={getLocalValue(category, field.key)}
                  onChange={(val) => handleChange(category, field.key, val)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Company Policy Configuration
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Centralized rules for Attendance, Leave & Overtime — applied across all HR modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            size="sm" 
            onClick={handleSaveAll} 
            disabled={!hasChanges || bulkUpdatePolicies.isPending}
            className="min-w-[120px]"
          >
            {bulkUpdatePolicies.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
            ) : (
              <Save className="w-4 h-4 mr-1.5" />
            )}
            Save All Changes
          </Button>
        </div>
      </div>

      {/* Company Scope Selector */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-3">
          <div className="flex items-center gap-4">
            <Globe className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <Label className="text-sm font-medium">Policy Scope</Label>
              <p className="text-[11px] text-muted-foreground">
                Global defaults apply to all companies. Company-specific rules override globals.
              </p>
            </div>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Global Defaults (All Companies)
                  </div>
                </SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-amber-700 dark:text-amber-400">You have unsaved changes. Click "Save All Changes" to apply.</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="attendance" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="attendance" className="gap-1.5">
              <Clock className="w-4 h-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="leave" className="gap-1.5">
              <CalendarDays className="w-4 h-4" />
              Leave
            </TabsTrigger>
            <TabsTrigger value="overtime" className="gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Overtime
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance">
            <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
              {renderPolicySection('attendance', ATTENDANCE_FIELDS, 'Attendance Rules', 'Configure work hours, late thresholds, and clock-in/out requirements', Clock)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="leave">
            <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
              {renderPolicySection('leave', LEAVE_FIELDS, 'Leave Rules', 'Set default leave allowances, approval workflow, and carry-over policies', CalendarDays)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="overtime">
            <ScrollArea className="h-[calc(100vh-500px)] min-h-[400px]">
              {renderPolicySection('overtime', OVERTIME_FIELDS, 'Overtime Rules', 'Configure OT rates, thresholds, and calculation methods', TrendingUp)}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
