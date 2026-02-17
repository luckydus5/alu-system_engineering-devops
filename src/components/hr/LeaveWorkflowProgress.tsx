import { cn } from '@/lib/utils';
import { Check, X, Clock, FileText, UserCheck, Building, Shield } from 'lucide-react';
import { LeaveStatus } from '@/hooks/useLeaveRequests';
import { format } from 'date-fns';

interface WorkflowStep {
  key: string;
  label: string;
  icon: React.ElementType;
  status: 'completed' | 'active' | 'pending' | 'rejected';
  timestamp?: string | null;
  comment?: string | null;
}

interface LeaveWorkflowProgressProps {
  requestStatus: LeaveStatus;
  createdAt: string;
  hrActionAt?: string | null;
  hrComment?: string | null;
  managerActionAt?: string | null;
  managerComment?: string | null;
  gmActionAt?: string | null;
  gmComment?: string | null;
  compact?: boolean;
}

function getWorkflowSteps(props: LeaveWorkflowProgressProps): WorkflowStep[] {
  const { requestStatus, createdAt, hrActionAt, hrComment, managerActionAt, managerComment, gmActionAt, gmComment } = props;
  
  const isRejected = requestStatus === 'rejected';
  const isCancelled = requestStatus === 'cancelled';

  const steps: WorkflowStep[] = [
    {
      key: 'submitted',
      label: 'Submitted',
      icon: FileText,
      status: 'completed',
      timestamp: createdAt,
    },
    {
      key: 'hr_review',
      label: 'HR Review',
      icon: UserCheck,
      status: (() => {
        if (isCancelled) return 'pending';
        if (isRejected && !hrActionAt && !managerActionAt && !gmActionAt) return 'rejected';
        if (hrActionAt) return 'completed';
        if (requestStatus === 'pending') return 'active';
        return 'pending';
      })(),
      timestamp: hrActionAt,
      comment: hrComment,
    },
    {
      key: 'manager_review',
      label: 'Manager',
      icon: Building,
      status: (() => {
        if (isCancelled) return 'pending';
        if (isRejected && hrActionAt && !managerActionAt && !gmActionAt) return 'rejected';
        if (managerActionAt) return 'completed';
        if (requestStatus === 'hr_approved') return 'active';
        return 'pending';
      })(),
      timestamp: managerActionAt,
      comment: managerComment,
    },
    {
      key: 'final_approval',
      label: 'GM/OM',
      icon: Shield,
      status: (() => {
        if (isCancelled) return 'pending';
        if (isRejected && (managerActionAt || (hrActionAt && !managerActionAt)) && !gmActionAt) return 'rejected';
        if (requestStatus === 'approved') return 'completed';
        if (requestStatus === 'manager_approved' || requestStatus === 'gm_pending') return 'active';
        return 'pending';
      })(),
      timestamp: gmActionAt,
      comment: gmComment,
    },
  ];

  return steps;
}

const stepColors = {
  completed: {
    dot: 'bg-emerald-500',
    line: 'bg-emerald-500',
    text: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    icon: 'text-white',
  },
  active: {
    dot: 'bg-amber-500 animate-pulse',
    line: 'bg-border',
    text: 'text-amber-600',
    bg: 'bg-amber-500/10',
    icon: 'text-white',
  },
  pending: {
    dot: 'bg-muted-foreground/30',
    line: 'bg-border',
    text: 'text-muted-foreground',
    bg: 'bg-muted/50',
    icon: 'text-muted-foreground',
  },
  rejected: {
    dot: 'bg-red-500',
    line: 'bg-red-500',
    text: 'text-red-600',
    bg: 'bg-red-500/10',
    icon: 'text-white',
  },
};

export function LeaveWorkflowProgress(props: LeaveWorkflowProgressProps) {
  const { compact = false } = props;
  const steps = getWorkflowSteps(props);

  if (compact) {
    return (
      <div className="flex items-center gap-1 w-full">
        {steps.map((step, i) => {
          const colors = stepColors[step.status];
          const StepIcon = step.status === 'completed' ? Check : step.status === 'rejected' ? X : step.icon;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-0.5" title={`${step.label}: ${step.status}`}>
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                  step.status === 'completed' || step.status === 'rejected' || step.status === 'active'
                    ? colors.dot
                    : 'border-2 border-muted-foreground/30 bg-background'
                )}>
                  {step.status === 'completed' || step.status === 'rejected' || step.status === 'active' ? (
                    <StepIcon className={cn("h-3 w-3", colors.icon)} />
                  ) : (
                    <step.icon className="h-3 w-3 text-muted-foreground/50" />
                  )}
                </div>
                <span className={cn("text-[9px] font-medium leading-tight text-center", colors.text)}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-0.5 mt-[-10px]",
                  step.status === 'completed' ? 'bg-emerald-500' : 'bg-border'
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-0 w-full">
      {steps.map((step, i) => {
        const colors = stepColors[step.status];
        const StepIcon = step.status === 'completed' ? Check : step.status === 'rejected' ? X : step.icon;
        return (
          <div key={step.key} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 min-w-[60px]">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                step.status === 'completed' || step.status === 'rejected' || step.status === 'active'
                  ? colors.dot
                  : 'border-2 border-muted-foreground/30 bg-background'
              )}>
                {step.status === 'completed' || step.status === 'rejected' || step.status === 'active' ? (
                  <StepIcon className={cn("h-4 w-4", colors.icon)} />
                ) : (
                  <step.icon className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              <span className={cn("text-[10px] font-semibold leading-tight text-center", colors.text)}>
                {step.label}
              </span>
              {step.timestamp && (
                <span className="text-[9px] text-muted-foreground leading-tight">
                  {format(new Date(step.timestamp), 'MMM d')}
                </span>
              )}
              {step.status === 'active' && (
                <span className="text-[9px] text-amber-600 font-medium">Waiting...</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mt-4 mx-1",
                step.status === 'completed' ? 'bg-emerald-500' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
