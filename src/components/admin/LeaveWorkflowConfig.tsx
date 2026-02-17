import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCompanies } from '@/hooks/useCompanies';
import { useCompanyLeaveWorkflows } from '@/hooks/useCompanyLeaveWorkflows';
import { GitBranch, Building2, ArrowRight, CheckCircle2, Loader2, Users, FileText, Briefcase, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LeaveWorkflowConfig() {
  const { companies, loading: companiesLoading } = useCompanies();
  const { workflows, isLoading, upsertWorkflow, getWorkflowForCompany } = useCompanyLeaveWorkflows();
  const parentCompanies = companies.filter(c => !c.parent_id);

  if (companiesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Leave Approval Workflows
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Configure leave approval steps for each company. Toggle which reviewers are in the chain.
          </p>
        </div>
      </div>

      {parentCompanies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No companies found. Create companies first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {parentCompanies.map(company => (
            <CompanyWorkflowCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {/* Default Workflow Info */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-2">Default Workflow (when not configured)</h4>
          <WorkflowStepsPreview hrEnabled managerEnabled finalRole="either" />
        </CardContent>
      </Card>
    </div>
  );
}

function CompanyWorkflowCard({ company }: { company: { id: string; name: string } }) {
  const { getWorkflowForCompany, upsertWorkflow } = useCompanyLeaveWorkflows();
  const workflow = getWorkflowForCompany(company.id);

  const [hrEnabled, setHrEnabled] = useState(workflow?.hr_review_enabled ?? true);
  const [managerEnabled, setManagerEnabled] = useState(workflow?.manager_review_enabled ?? true);
  const [finalRole, setFinalRole] = useState<'gm' | 'om' | 'either'>(workflow?.final_approver_role ?? 'either');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (workflow) {
      setHrEnabled(workflow.hr_review_enabled);
      setManagerEnabled(workflow.manager_review_enabled);
      setFinalRole(workflow.final_approver_role);
    }
  }, [workflow]);

  const handleSave = () => {
    upsertWorkflow.mutate({
      company_id: company.id,
      hr_review_enabled: hrEnabled,
      manager_review_enabled: managerEnabled,
      final_approver_role: finalRole,
    });
    setIsDirty(false);
  };

  const markDirty = () => setIsDirty(true);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {company.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {workflow ? (
              <Badge variant="secondary" className="text-[10px]">Configured</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-600">Using Default</Badge>
            )}
            {isDirty && (
              <Button size="sm" onClick={handleSave} disabled={upsertWorkflow.isPending}>
                {upsertWorkflow.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggles */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <Label className="text-sm font-medium">HR Review</Label>
            </div>
            <Switch checked={hrEnabled} onCheckedChange={(v) => { setHrEnabled(v); markDirty(); }} />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-amber-600" />
              <Label className="text-sm font-medium">Dept Manager</Label>
            </div>
            <Switch checked={managerEnabled} onCheckedChange={(v) => { setManagerEnabled(v); markDirty(); }} />
          </div>

          <div className="p-3 rounded-lg border bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <Label className="text-sm font-medium">Final Approver</Label>
            </div>
            <Select value={finalRole} onValueChange={(v: 'gm' | 'om' | 'either') => { setFinalRole(v); markDirty(); }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="either">GM or OM (either)</SelectItem>
                <SelectItem value="gm">General Manager only</SelectItem>
                <SelectItem value="om">Operations Manager only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {/* Preview */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Approval Flow Preview:</p>
          <WorkflowStepsPreview hrEnabled={hrEnabled} managerEnabled={managerEnabled} finalRole={finalRole} />
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowStepsPreview({ hrEnabled, managerEnabled, finalRole }: {
  hrEnabled: boolean;
  managerEnabled: boolean;
  finalRole: 'gm' | 'om' | 'either';
}) {
  const steps = [
    { label: 'Employee Submits', color: 'bg-slate-500/10 text-slate-700', always: true },
    { label: 'HR Review', color: 'bg-blue-500/10 text-blue-700', always: false, enabled: hrEnabled },
    { label: 'Dept Manager', color: 'bg-amber-500/10 text-amber-700', always: false, enabled: managerEnabled },
    { 
      label: finalRole === 'gm' ? 'General Manager' : finalRole === 'om' ? 'Operations Manager' : 'GM / OM', 
      color: 'bg-emerald-500/10 text-emerald-700', 
      always: true 
    },
    { label: '✓ Approved', color: 'bg-emerald-600/20 text-emerald-700', always: true },
  ];

  const activeSteps = steps.filter(s => s.always || s.enabled);

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      {activeSteps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[10px]", step.color)}>
            {step.label}
          </Badge>
          {idx < activeSteps.length - 1 && (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  );
}
