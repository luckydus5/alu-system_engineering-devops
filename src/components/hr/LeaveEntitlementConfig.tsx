import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Search, Settings2, Users, Calendar, TrendingUp,
  Edit, Trash2, Plus, ChevronRight, Info, Loader2,
  RefreshCw, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useEmployeeLeaveEntitlements, EntitlementUpsert } from '@/hooks/useEmployeeLeaveEntitlements';
import { useCompanyPolicies } from '@/hooks/useCompanyPolicies';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LeaveEntitlementConfigProps {
  departmentId: string;
}

const LEAVE_FIELDS: { key: keyof EntitlementUpsert; label: string; color: string }[] = [
  { key: 'annual_days',      label: 'Annual Leave',   color: 'text-blue-600' },
  { key: 'sick_days',        label: 'Sick Leave',     color: 'text-red-600' },
  { key: 'personal_days',    label: 'Personal',       color: 'text-purple-600' },
  { key: 'maternity_days',   label: 'Maternity',      color: 'text-pink-600' },
  { key: 'paternity_days',   label: 'Paternity',      color: 'text-cyan-600' },
  { key: 'bereavement_days', label: 'Bereavement',    color: 'text-slate-600' },
  { key: 'unpaid_days',      label: 'Unpaid',         color: 'text-amber-600' },
];

interface EditForm {
  annual_days: string;
  sick_days: string;
  personal_days: string;
  maternity_days: string;
  paternity_days: string;
  bereavement_days: string;
  unpaid_days: string;
  notes: string;
}

const DEFAULT_DAYS = {
  annual_days: '18',
  sick_days: '10',
  personal_days: '5',
  maternity_days: '90',
  paternity_days: '10',
  bereavement_days: '5',
  unpaid_days: '30',
};

export function LeaveEntitlementConfig({ departmentId }: LeaveEntitlementConfigProps) {
  const { users, loading: usersLoading } = useUsers();
  const { entitlements, isLoading, upsertEntitlement, deleteEntitlement, getEntitlementForUser } = useEmployeeLeaveEntitlements();
  const { policies } = useCompanyPolicies();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    annual_days: '18', sick_days: '10', personal_days: '5',
    maternity_days: '90', paternity_days: '10', bereavement_days: '5',
    unpaid_days: '30', notes: '',
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'custom' | 'default'>('all');

  // Get global policy defaults
  const globalAnnual = policies?.find(p => p.policy_key === 'default_annual_days')?.policy_value || '18';
  const globalAccrual = policies?.find(p => p.policy_key === 'monthly_accrual_days')?.policy_value || '1.5';

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
          u.full_name?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department_name?.toLowerCase().includes(q);
        const hasCustom = !!getEntitlementForUser(u.id);
        const matchFilter =
          filter === 'all' ||
          (filter === 'custom' && hasCustom) ||
          (filter === 'default' && !hasCustom);
        return matchSearch && matchFilter;
      })
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [users, search, filter, entitlements]);

  const openEdit = (userId: string) => {
    const existing = getEntitlementForUser(userId);
    setForm({
      annual_days:      String(existing?.annual_days      ?? globalAnnual),
      sick_days:        String(existing?.sick_days        ?? 10),
      personal_days:    String(existing?.personal_days    ?? 5),
      maternity_days:   String(existing?.maternity_days   ?? 90),
      paternity_days:   String(existing?.paternity_days   ?? 10),
      bereavement_days: String(existing?.bereavement_days ?? 5),
      unpaid_days:      String(existing?.unpaid_days      ?? 30),
      notes:            existing?.notes ?? '',
    });
    setEditingUserId(userId);
  };

  const handleSave = async () => {
    if (!editingUserId) return;
    const annual = parseFloat(form.annual_days);
    if (isNaN(annual) || annual <= 0) {
      toast({ title: 'Invalid', description: 'Annual days must be a positive number.', variant: 'destructive' });
      return;
    }
    await upsertEntitlement.mutateAsync({
      user_id: editingUserId,
      annual_days:      annual,
      sick_days:        parseFloat(form.sick_days) || 10,
      personal_days:    parseFloat(form.personal_days) || 5,
      maternity_days:   parseFloat(form.maternity_days) || 90,
      paternity_days:   parseFloat(form.paternity_days) || 10,
      bereavement_days: parseFloat(form.bereavement_days) || 5,
      unpaid_days:      parseFloat(form.unpaid_days) || 30,
      notes:            form.notes || null,
    });
    setEditingUserId(null);
  };

  const handleInitializeAll = async () => {
    setIsInitializing(true);
    try {
      const { error } = await supabase.rpc('initialize_default_leave_balances' as any);
      if (error) throw error;
      toast({ title: 'Balances synchronized', description: 'All employee leave balances have been updated.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsInitializing(false);
    }
  };

  const editingUser = editingUserId ? users.find(u => u.id === editingUserId) : null;
  const editingEntitlement = editingUserId ? getEntitlementForUser(editingUserId) : null;
  const previewAccrual = editingUserId ? (parseFloat(form.annual_days) / 12).toFixed(3) : '0';

  const customCount = entitlements.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Leave Entitlement Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set individual annual leave allowances per employee. Monthly accrual is auto-calculated.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInitializeAll}
          disabled={isInitializing}
          className="gap-2 shrink-0"
        >
          {isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync All Balances
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Employees</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Custom Entitlements</p>
          <p className="text-2xl font-bold text-primary mt-1">{customCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Global Annual Default</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{globalAnnual} days</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Global Monthly Accrual</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{globalAccrual} days/mo</p>
        </Card>
      </div>

      {/* Info banner */}
      <div className="flex gap-3 items-start p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Employees <strong>without</strong> a custom entitlement use the global policy ({globalAnnual} days/year, {globalAccrual} days/month).
          When you set a custom annual allowance (e.g. 20 days), the system auto-calculates the monthly accrual as <strong>annual ÷ 12</strong>
          and stops accruing once the cap is reached.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee, email or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 border rounded-lg p-1 bg-muted/30">
          {(['all', 'custom', 'default'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize",
                filter === f ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === 'custom' ? `Custom (${customCount})` : f === 'default' ? `Using Global (${users.length - customCount})` : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Employee list */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            {usersLoading || isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No employees found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map(user => {
                  const entitlement = getEntitlementForUser(user.id);
                  const hasCustom = !!entitlement;
                  const annualDays = entitlement?.annual_days ?? parseFloat(globalAnnual);
                  const monthlyAccrual = entitlement?.monthly_accrual ?? parseFloat(globalAccrual);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                          {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{user.full_name || user.email}</span>
                          {hasCustom ? (
                            <Badge className="text-[10px] px-1.5 bg-primary/10 text-primary border-primary/20">Custom</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">Global Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{user.department_name || user.email}</p>
                      </div>

                      {/* Leave summary chips */}
                      <div className="hidden md:flex items-center gap-3 text-xs">
                        <div className="text-center">
                          <p className="text-muted-foreground">Annual</p>
                          <p className={cn("font-bold", hasCustom ? "text-primary" : "text-muted-foreground")}>
                            {annualDays} days
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Monthly +</p>
                          <p className={cn("font-bold", hasCustom ? "text-emerald-600" : "text-muted-foreground")}>
                            {monthlyAccrual.toFixed(3)}
                          </p>
                        </div>
                        {entitlement?.sick_days !== undefined && (
                          <div className="text-center">
                            <p className="text-muted-foreground">Sick</p>
                            <p className="font-bold text-red-500">{entitlement.sick_days}d</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(user.id)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {hasCustom && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteEntitlement.mutate(user.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingUserId} onOpenChange={open => !open && setEditingUserId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              {editingEntitlement ? 'Edit' : 'Set'} Leave Entitlement
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 mb-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {(editingUser.full_name || editingUser.email).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{editingUser.full_name || editingUser.email}</p>
                <p className="text-xs text-muted-foreground">{editingUser.department_name || editingUser.email}</p>
              </div>
            </div>
          )}

          {/* Annual days — primary field */}
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-blue-600">
              Annual Leave Allowance *
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={365}
                step={0.5}
                value={form.annual_days}
                onChange={e => setForm(f => ({ ...f, annual_days: e.target.value }))}
                className="text-lg font-bold"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">days / year</span>
            </div>
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Monthly accrual: <strong>+{previewAccrual} days/month</strong> until cap reached
            </p>
          </div>

          <div className="h-px bg-border" />

          {/* Other leave types in a grid */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Other Leave Types</p>
          <div className="grid grid-cols-2 gap-3">
            {LEAVE_FIELDS.filter(f => f.key !== 'annual_days').map(field => (
              <div key={field.key} className="space-y-1">
                <Label className={cn("text-xs", field.color)}>{field.label}</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    step={1}
                    value={form[field.key as keyof EditForm]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="text-sm h-8"
                  />
                  <span className="text-xs text-muted-foreground">d</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              placeholder="Reason for custom entitlement..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="text-sm"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditingUserId(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={upsertEntitlement.isPending} className="gap-2">
              {upsertEntitlement.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <CheckCircle2 className="h-4 w-4" />
              Save Entitlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
