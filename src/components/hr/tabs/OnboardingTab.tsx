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
    <Card className="shadow-corporate rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm">{employeeName}</CardTitle>
              <CardDescription className="text-xs">{completedCount}/{checklists.length} completed</CardDescription>
            </div>
          </div>
          <Badge variant={completedCount === checklists.length ? 'default' : 'outline'} className="text-[10px]">
            {completedCount === checklists.length ? 'Complete' : 'In Progress'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={checklists.length > 0 ? (completedCount / checklists.length) * 100 : 0} className="h-1.5 mb-5" />
        <div className="space-y-5">
          {categories.map(category => {
            const items = checklists.filter(c => c.category === category);
            const Icon = CATEGORY_ICONS[category] || Shield;
            return (
              <div key={category}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  {CATEGORY_LABELS[category] || category}
                </p>
                <div className="space-y-0.5">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => onToggle(item.id, !item.is_completed)}
                    >
                      <Checkbox checked={item.is_completed} onCheckedChange={() => onToggle(item.id, !item.is_completed)} />
                      <span className={cn("text-xs flex-1", item.is_completed && "line-through text-muted-foreground")}>{item.task_label}</span>
                      {item.is_completed && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
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

  const recentHires = useMemo(() => {
    const now = new Date();
    return employees.filter(e => {
      const hireDays = differenceInDays(now, new Date(e.hire_date));
      return hireDays >= 0 && hireDays <= 90;
    }).sort((a, b) => new Date(b.hire_date).getTime() - new Date(a.hire_date).getTime());
  }, [employees]);

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
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Recent Hires', value: recentHires.length, icon: UserPlus, variant: 'kpi-blue' },
          { label: 'In Progress', value: inProgress, icon: Clock, variant: 'kpi-gold' },
          { label: 'Pending', value: pendingCount, icon: Calendar, variant: 'kpi-warning' },
          { label: 'Completed', value: completedCount, icon: CheckCircle2, variant: 'kpi-success' },
        ].map(({ label, value, icon: Icon, variant }) => (
          <div key={label} className={cn("p-5 rounded-xl shadow-corporate", variant)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
              </div>
              <Icon className="h-5 w-5 text-muted-foreground/40" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent Hires */}
      <div>
        <h3 className="text-base font-bold mb-4">Recent Hires (Last 90 Days)</h3>
        {recentHires.length === 0 ? (
          <div className="text-center py-16 rounded-xl bg-card border shadow-corporate">
            <Rocket className="h-12 w-12 mx-auto text-secondary/30 mb-4" />
            <h3 className="text-lg font-bold">No Recent Hires</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Employees hired in the last 90 days will appear here.
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
                <Card key={hire.id} className="shadow-corporate rounded-xl">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {hire.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{hire.full_name}</p>
                        <p className="text-xs text-muted-foreground">{hire.position_name || hire.employment_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{hire.department_name || '—'} · {hire.company_name || '—'}</span>
                      <Badge variant="outline" className="text-[10px]">{hire.employment_status}</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {isStarted ? `Started ${daysSinceHire}d ago` : `Starts ${format(new Date(hire.hire_date), 'MMM d')}`}
                        </span>
                        {hasChecklist && (
                          <span className={progress === 100 ? "text-success font-bold" : "text-muted-foreground font-medium"}>
                            {progress}%
                          </span>
                        )}
                      </div>
                      {hasChecklist && <Progress value={progress} className="h-1.5" />}
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Checklists */}
      {employeesWithChecklists.length > 0 && (
        <div>
          <h3 className="text-base font-bold mb-4">Onboarding Checklists</h3>
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
