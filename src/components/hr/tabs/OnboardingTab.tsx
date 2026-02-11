import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  UserPlus, CheckCircle2, Clock,
  Calendar, Mail, Shield, Laptop, Key, BookOpen,
  Users, Building2, GraduationCap, ChevronRight, Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { useEmployees } from '@/hooks/useEmployees';
import { useOnboardingChecklists } from '@/hooks/useOnboardingChecklists';
import { useToast } from '@/hooks/use-toast';

interface OnboardingTabProps {
  departmentId: string;
}

const CATEGORY_ICONS: Record<string, typeof Mail> = {
  admin: Shield,
  it: Laptop,
  hr: BookOpen,
  training: GraduationCap,
  team: Users,
  facilities: Building2,
};

const CATEGORY_LABELS: Record<string, string> = {
  admin: 'Administrative',
  it: 'IT Setup',
  hr: 'HR Tasks',
  training: 'Training',
  team: 'Team Integration',
  facilities: 'Facilities',
};

function OnboardingChecklistView({ employeeId, employeeName, checklists, onToggle }: {
  employeeId: string;
  employeeName: string;
  checklists: Array<{ id: string; task_label: string; category: string; is_completed: boolean }>;
  onToggle: (taskId: string, isCompleted: boolean) => void;
}) {
  const completedCount = checklists.filter(c => c.is_completed).length;
  const categories = [...new Set(checklists.map(c => c.category))];

  return (
    <Card className="border rounded-2xl shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                {employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm">{employeeName}</CardTitle>
              <CardDescription className="text-xs">{completedCount}/{checklists.length} completed</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={checklists.length > 0 ? (completedCount / checklists.length) * 100 : 0} className="h-1 mb-5" />
        <div className="space-y-5">
          {categories.map(category => {
            const items = checklists.filter(c => c.category === category);
            const Icon = CATEGORY_ICONS[category] || Shield;
            return (
              <div key={category}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category] || category}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => onToggle(item.id, !item.is_completed)}
                    >
                      <Checkbox checked={item.is_completed} onCheckedChange={() => onToggle(item.id, !item.is_completed)} />
                      <Icon className={cn("h-3.5 w-3.5", item.is_completed ? "text-emerald-600" : "text-muted-foreground")} />
                      <span className={cn("text-xs", item.is_completed && "line-through text-muted-foreground")}>{item.task_label}</span>
                      {item.is_completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function OnboardingTab({ departmentId }: OnboardingTabProps) {
  const { employees, loading: employeesLoading } = useEmployees();
  const { checklists, loading: checklistsLoading, toggleTask, initializeForEmployee, getForEmployee } = useOnboardingChecklists();
  const { toast } = useToast();
  const [initializing, setInitializing] = useState<string | null>(null);

  const loading = employeesLoading || checklistsLoading;

  // Recent hires = hired in last 90 days
  const recentHires = useMemo(() => {
    const now = new Date();
    return employees.filter(e => {
      const hireDays = differenceInDays(now, new Date(e.hire_date));
      return hireDays >= 0 && hireDays <= 90;
    }).sort((a, b) => new Date(b.hire_date).getTime() - new Date(a.hire_date).getTime());
  }, [employees]);

  // Employees with onboarding checklists
  const employeesWithChecklists = useMemo(() => {
    const ids = new Set(checklists.map(c => c.employee_id));
    return [...ids];
  }, [checklists]);

  const handleInitialize = async (employeeId: string) => {
    setInitializing(employeeId);
    try {
      await initializeForEmployee(employeeId);
      toast({ title: 'Onboarding checklist created!' });
    } catch (err: any) {
      toast({ title: 'Failed to create checklist', description: err.message, variant: 'destructive' });
    } finally {
      setInitializing(null);
    }
  };

  const handleToggle = async (taskId: string, isCompleted: boolean) => {
    try {
      await toggleTask(taskId, isCompleted);
    } catch (err: any) {
      toast({ title: 'Failed to update task', variant: 'destructive' });
    }
  };

  const inProgress = employeesWithChecklists.filter(id => {
    const tasks = getForEmployee(id);
    const done = tasks.filter(t => t.is_completed).length;
    return done > 0 && done < tasks.length;
  }).length;

  const completedCount = employeesWithChecklists.filter(id => {
    const tasks = getForEmployee(id);
    return tasks.length > 0 && tasks.every(t => t.is_completed);
  }).length;

  const pendingCount = employeesWithChecklists.filter(id => {
    const tasks = getForEmployee(id);
    return tasks.every(t => !t.is_completed);
  }).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Recent Hires', value: recentHires.length, icon: UserPlus },
          { label: 'In Progress', value: inProgress, icon: Clock },
          { label: 'Pending', value: pendingCount, icon: Calendar },
          { label: 'Completed', value: completedCount, icon: CheckCircle2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-5 rounded-2xl bg-card border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-semibold tracking-tight mt-1">{value}</p>
              </div>
              <Icon className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Hires */}
      <div>
        <h3 className="text-base font-semibold mb-4">Recent Hires (Last 90 Days)</h3>
        {recentHires.length === 0 ? (
          <div className="text-center py-16 rounded-2xl bg-card border">
            <Rocket className="h-10 w-10 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold">No Recent Hires</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Employees hired in the last 90 days will appear here. Add employees in the People tab.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {recentHires.map(hire => {
              const daysUntilStart = differenceInDays(new Date(hire.hire_date), new Date());
              const isStarted = daysUntilStart <= 0;
              const daysSinceHire = Math.abs(daysUntilStart);
              const hasChecklist = employeesWithChecklists.includes(hire.id);
              const tasks = getForEmployee(hire.id);
              const progress = tasks.length > 0 ? Math.round((tasks.filter(t => t.is_completed).length / tasks.length) * 100) : 0;

              return (
                <div key={hire.id} className="p-5 rounded-2xl bg-card border space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                        {hire.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{hire.full_name}</p>
                      <p className="text-xs text-muted-foreground">{hire.position_name || hire.employment_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{hire.department_name || '—'} · {hire.company_name || '—'}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {hire.employment_status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {isStarted ? `Started ${daysSinceHire}d ago` : `Starts ${format(new Date(hire.hire_date), 'MMM d')}`}
                      </span>
                      {hasChecklist && (
                        <span className={progress === 100 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                          {progress}%
                        </span>
                      )}
                    </div>
                    {hasChecklist && <Progress value={progress} className="h-1" />}
                  </div>
                  {!hasChecklist && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8"
                      disabled={initializing === hire.id}
                      onClick={() => handleInitialize(hire.id)}
                    >
                      {initializing === hire.id ? 'Creating...' : 'Start Onboarding'}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checklists */}
      {employeesWithChecklists.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-4">Onboarding Checklists</h3>
          <div className="grid gap-6 lg:grid-cols-2">
            {employeesWithChecklists.map(empId => {
              const emp = employees.find(e => e.id === empId);
              const tasks = getForEmployee(empId);
              if (!emp || tasks.length === 0) return null;
              return (
                <OnboardingChecklistView
                  key={empId}
                  employeeId={empId}
                  employeeName={emp.full_name}
                  checklists={tasks}
                  onToggle={handleToggle}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
