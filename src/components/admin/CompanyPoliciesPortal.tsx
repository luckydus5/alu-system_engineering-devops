import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { 
  Clock, CalendarDays, TrendingUp, Loader2, 
  RefreshCw, Building2, Globe, Shield, CheckCircle2,
  Sun, Moon
} from 'lucide-react';
import { useCompanyPolicies } from '@/hooks/useCompanyPolicies';
import { useCompanies } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';
import { PolicyKPICards } from './policies/PolicyKPICards';
import { PolicySection } from './policies/PolicySection';
import { SHIFT_FIELDS, ATTENDANCE_FIELDS, LEAVE_FIELDS, OVERTIME_FIELDS } from './policies/policyFieldDefinitions';
import { Card, CardContent } from '@/components/ui/card';

export function CompanyPoliciesPortal() {
  const [selectedCompany, setSelectedCompany] = useState<string>('global');
  const companyId = selectedCompany === 'global' ? null : selectedCompany;
  const { policies, isLoading, getPolicyValue, bulkUpdatePolicies, refetch } = useCompanyPolicies(companyId);
  const { companies } = useCompanies();
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (policies.length > 0) {
      const vals: Record<string, string> = {};
      policies.forEach(p => {
        vals[`${p.policy_category}:${p.policy_key}`] = p.policy_value;
      });
      setLocalValues(vals);
    }
  }, [policies]);

  const autoSave = useCallback(async (category: string, key: string, value: string) => {
    // Treat empty as "0" for number fields
    const saveValue = value === '' ? '0' : value;
    setSavingStatus('saving');
    try {
      await bulkUpdatePolicies.mutateAsync([
        { policy_category: category, policy_key: key, policy_value: saveValue, company_id: companyId }
      ]);
      setSavingStatus('saved');
      setTimeout(() => setSavingStatus('idle'), 2000);
    } catch {
      setSavingStatus('idle');
    }
  }, [bulkUpdatePolicies, companyId]);

  const handleChange = (category: string, key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [`${category}:${key}`]: value }));
    
    // Debounce auto-save per field (800ms)
    const timerKey = `${category}:${key}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }
    debounceTimers.current[timerKey] = setTimeout(() => {
      autoSave(category, key, value);
    }, 800);
  };

  const getLocalValue = (category: string, key: string): string => {
    return localValues[`${category}:${key}`] ?? getPolicyValue(category, key, '');
  };

  const policyCount = policies.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Timesheet & HR Policy Engine
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Centralized business rules for Shifts, Attendance, Leave & Overtime — applied across all modules
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savingStatus === 'saving' && (
            <Badge variant="outline" className="text-xs gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </Badge>
          )}
          {savingStatus === 'saved' && (
            <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-300">
              <CheckCircle2 className="w-3 h-3" />
              Saved
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {policyCount} rules configured
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isLoading && "animate-spin")} />
            Refresh
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

      {/* Auto-save is active — no manual save needed */}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <PolicyKPICards getPolicyValue={getLocalValue} />

          {/* Tabs */}
          <Tabs defaultValue="shift" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="shift" className="gap-1.5 text-xs">
                <Sun className="w-3.5 h-3.5" />
                Shifts
              </TabsTrigger>
              <TabsTrigger value="attendance" className="gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="leave" className="gap-1.5 text-xs">
                <CalendarDays className="w-3.5 h-3.5" />
                Leave
              </TabsTrigger>
              <TabsTrigger value="overtime" className="gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5" />
                Overtime
              </TabsTrigger>
              <TabsTrigger value="processing" className="gap-1.5 text-xs">
                <Moon className="w-3.5 h-3.5" />
                Processing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="shift">
              <ScrollArea className="h-[calc(100vh-580px)] min-h-[350px]">
                <PolicySection
                  category="shift"
                  fields={SHIFT_FIELDS}
                  title="Shift Configuration"
                  description="Define day/night shift hours, detection thresholds, and multi-entry handling"
                  icon={Sun}
                  getLocalValue={getLocalValue}
                  handleChange={handleChange}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="attendance">
              <ScrollArea className="h-[calc(100vh-580px)] min-h-[350px]">
                <PolicySection
                  category="attendance"
                  fields={ATTENDANCE_FIELDS}
                  title="Attendance Rules"
                  description="Configure work hours, late thresholds, breaks, and clock-in/out requirements"
                  icon={Clock}
                  getLocalValue={getLocalValue}
                  handleChange={handleChange}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="leave">
              <ScrollArea className="h-[calc(100vh-580px)] min-h-[350px]">
                <PolicySection
                  category="leave"
                  fields={LEAVE_FIELDS}
                  title="Leave Rules"
                  description="Set default leave allowances, approval workflow, and carry-over policies"
                  icon={CalendarDays}
                  getLocalValue={getLocalValue}
                  handleChange={handleChange}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="overtime">
              <ScrollArea className="h-[calc(100vh-580px)] min-h-[350px]">
                <PolicySection
                  category="overtime"
                  fields={OVERTIME_FIELDS}
                  title="Overtime Rules"
                  description="Configure OT rates, min/max per shift type, rounding, and calculation methods"
                  icon={TrendingUp}
                  getLocalValue={getLocalValue}
                  handleChange={handleChange}
                />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="processing">
              <ScrollArea className="h-[calc(100vh-580px)] min-h-[350px]">
                <div className="space-y-6">
                  <Card className="shadow-sm border-dashed">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Moon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold">Timesheet Processing Rules</h3>
                          <p className="text-xs text-muted-foreground">How raw timesheet data is processed and validated</p>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <RuleCard 
                          title="Multiple Check-ins" 
                          description="When an employee checks in/out multiple times per day, the system uses the FIRST check-in and LAST check-out to calculate total hours."
                          status={getLocalValue('shift', 'multiple_checkin_policy') || 'first_in_last_out'}
                        />
                        <RuleCard 
                          title="Cross-Midnight Shifts" 
                          description="Night shifts spanning midnight (e.g., 18:00 → 03:00) are automatically detected and hours calculated across two calendar days."
                          status={getLocalValue('shift', 'cross_midnight_detection') === 'true' ? 'Enabled' : 'Disabled'}
                        />
                        <RuleCard 
                          title="Early Check-in Policy" 
                          description="Arriving early (e.g., 06:00 for 08:00 shift) does NOT earn overtime. OT only counts after official shift end time."
                          status={getLocalValue('shift', 'early_checkin_counts_ot') === 'true' ? 'Counts as OT' : 'No OT'}
                        />
                        <RuleCard 
                          title="OT Minimum Threshold" 
                          description={`Day shift: ${getLocalValue('overtime', 'day_shift_ot_min_minutes') || '30'} min minimum. Night shift: ${getLocalValue('overtime', 'night_shift_ot_min_minutes') || '30'} min minimum. Below = no OT recorded.`}
                          status="Enforced"
                        />
                        <RuleCard 
                          title="OT Maximum Cap" 
                          description={`Day shift max: ${getLocalValue('overtime', 'day_shift_ot_max_hours') || '1.5'}h per shift. Night shift max: ${getLocalValue('overtime', 'night_shift_ot_max_hours') || '3'}h per shift.`}
                          status="Enforced"
                        />
                        <RuleCard 
                          title="OT Rounding" 
                          description={`Overtime hours are rounded to the nearest ${getLocalValue('overtime', 'ot_rounding_increment') || '15'} minutes for payroll accuracy.`}
                          status={`${getLocalValue('overtime', 'ot_rounding_increment') || '15'} min`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function RuleCard({ title, description, status }: { title: string; description: string; status: string }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="secondary" className="text-[10px]">{status}</Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
