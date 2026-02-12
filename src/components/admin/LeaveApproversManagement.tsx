import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLeaveApprovers, APPROVER_ROLE_LABELS } from '@/hooks/useLeaveApprovers';
import { POSITION_LABELS } from '@/lib/systemPositions';
import { Shield, UserCheck, Loader2, AlertCircle } from 'lucide-react';

const roleOrder = ['peat_manager', 'hr_reviewer', 'gm_approver', 'om_approver', 'it_manager', 'it_officer'] as const;

export function LeaveApproversManagement() {
  const { approvers, isLoading, removeApprover } = useLeaveApprovers();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Group approvers by role
  const approversByRole = roleOrder.map(role => ({
    role,
    label: POSITION_LABELS[role] || APPROVER_ROLE_LABELS[role],
    approver: approvers.find(a => a.approver_role === role),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-600" />
          Leave Approval Chain
        </h3>
        <Badge variant="secondary">{approvers.length} assigned</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Each position can only be assigned to one person. Assign positions via the User Management edit dialog.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {approversByRole.map(({ role, label, approver }, index) => (
          <Card key={role} className={approver ? 'border-indigo-500/30' : 'border-dashed border-muted-foreground/30'}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    approver ? 'bg-indigo-500/10 text-indigo-600' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    {approver ? (
                      <>
                        <p className="text-sm text-foreground">{approver.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{approver.profile?.email}</p>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        Not assigned
                      </div>
                    )}
                  </div>
                </div>
                {approver && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive text-xs"
                    onClick={() => removeApprover.mutate(approver.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-2">Approval Flow</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Badge variant="outline" className="text-[10px]">Employee Files Leave</Badge>
            <span>→</span>
            <Badge variant="outline" className="text-[10px] bg-amber-500/10">Peat Manager</Badge>
            <span>→</span>
            <Badge variant="outline" className="text-[10px] bg-blue-500/10">HR Officer</Badge>
            <span>→</span>
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10">GM / OM</Badge>
            <span>→</span>
            <Badge variant="outline" className="text-[10px] bg-emerald-600/20">✓ Approved</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
