import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Users, Calendar, Clock, Building2,
  ClipboardList, Search, Target, Star,
  Hand, Wine, Heart, Settings, Plus, Check, MoreVertical
} from 'lucide-react';
import { useLeaveRequests, LEAVE_TYPE_LABELS } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { useCompanies } from '@/hooks/useCompanies';
import { usePerformanceReviews } from '@/hooks/usePerformanceReviews';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { format, parseISO } from 'date-fns';

interface HROverviewTabProps {
  departmentId: string;
  metrics: {
    pendingLeaveRequests: number;
    approvedThisMonth: number;
    activeEmployees: number;
    openPositions: number;
    employeeGrowth: number;
    retentionRate: number;
    departmentCount: number;
    employeesOnLeaveToday: number;
  };
  urgentItems: Array<{ type: string; title: string; priority: string; action: () => void }>;
  onNavigate: (tab: string) => void;
}

export function HROverviewTab({ departmentId, metrics, urgentItems, onNavigate }: HROverviewTabProps) {
  const { leaveRequests } = useLeaveRequests(undefined, true);
  const { users } = useUsers();
  const { companies } = useCompanies();
  const { reviews, goals } = usePerformanceReviews();
  const [taskTab, setTaskTab] = useState<'today' | 'upcoming' | 'overdue'>('today');
  const [taskSearch, setTaskSearch] = useState('');

  // Compute leave stats
  const leaveStats = useMemo(() => {
    const approved = leaveRequests.filter(r => r.status === 'approved');
    const annualHours = approved
      .filter(r => r.leave_type === 'annual')
      .reduce((sum, r) => sum + r.total_days * 8, 0);
    const personalHours = approved
      .filter(r => r.leave_type === 'personal' || r.leave_type === 'sick')
      .reduce((sum, r) => sum + r.total_days * 8, 0);
    return { annualHours, personalHours };
  }, [leaveRequests]);

  const STAT_CARDS = [
    { 
      label: 'NEW TASKS', 
      value: metrics.pendingLeaveRequests.toString(), 
      icon: ClipboardList,
      gradient: 'bg-gradient-to-br from-[hsl(340,82%,52%)] to-[hsl(340,82%,42%)]',
      onClick: () => onNavigate('leave')
    },
    { 
      label: 'ANNUAL LEAVE', 
      value: `${leaveStats.annualHours} hr`, 
      icon: Hand,
      gradient: 'bg-gradient-to-br from-[hsl(187,71%,45%)] to-[hsl(187,71%,35%)]',
      onClick: () => onNavigate('leave')
    },
    { 
      label: 'PERSONAL LEAVE', 
      value: `${leaveStats.personalHours} hr`, 
      icon: Wine,
      gradient: 'bg-gradient-to-br from-[hsl(88,50%,53%)] to-[hsl(88,50%,40%)]',
      onClick: () => onNavigate('leave')
    },
    { 
      label: 'TOTAL EMPLOYEES', 
      value: metrics.activeEmployees.toString(), 
      icon: Heart,
      gradient: 'bg-gradient-to-br from-[hsl(36,100%,50%)] to-[hsl(36,100%,40%)]',
      onClick: () => onNavigate('employees')
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">Home</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 mt-1">
          <span className="text-lg">🚀</span> Start
        </h1>
      </div>

      {/* Colorful Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(stat => (
          <button 
            key={stat.label}
            onClick={stat.onClick}
            className={cn(
              "flex items-center gap-4 p-6 rounded-xl text-white text-left transition-transform hover:-translate-y-0.5 shadow-lg",
              stat.gradient
            )}
          >
            <div className="h-12 w-12 flex items-center justify-center opacity-90">
              <stat.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs font-medium opacity-90 uppercase tracking-wider">{stat.label}</p>
              <p className="text-3xl font-bold mt-0.5">{stat.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Tasks & Notifications */}
      <Card className="shadow-sm rounded-xl border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold uppercase tracking-wide">Tasks & Notifications</CardTitle>
            <Settings className="h-5 w-5 text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs + Filter */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {(['today', 'upcoming', 'overdue'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setTaskTab(tab)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded transition-colors capitalize",
                    taskTab === tab 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {tab}
                </button>
              ))}
              <span className="text-sm text-muted-foreground ml-2 flex items-center gap-1 cursor-pointer hover:text-foreground">
                Filter <span className="text-xs">▾</span>
              </span>
            </div>
            <Button size="sm" className="gap-1.5 bg-[hsl(187,71%,45%)] hover:bg-[hsl(187,71%,38%)] text-white">
              <Plus className="h-4 w-4" /> Quick Task
            </Button>
          </div>

          {/* Search */}
          <div className="mb-4">
            <Input 
              placeholder="Search..." 
              className="h-9 text-sm"
              value={taskSearch}
              onChange={e => setTaskSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          {(() => {
            const now = new Date();
            const todayStr = format(now, 'yyyy-MM-dd');
            const filtered = leaveRequests.filter(r => {
              if (taskTab === 'today') return r.status === 'pending' || r.status === 'manager_approved';
              if (taskTab === 'upcoming') return r.status === 'approved' && r.start_date > todayStr;
              if (taskTab === 'overdue') return (r.status === 'pending' || r.status === 'manager_approved') && r.created_at < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
              return true;
            }).filter(r => {
              if (!taskSearch) return true;
              const q = taskSearch.toLowerCase();
              return r.requester?.full_name?.toLowerCase().includes(q) || 
                     LEAVE_TYPE_LABELS[r.leave_type]?.toLowerCase().includes(q);
            }).slice(0, 10);

            return (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Task Name</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned To</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Due Date</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filter</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-sm text-muted-foreground">No items found</td>
                      </tr>
                    ) : filtered.map(r => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => onNavigate('leave')}>
                        <td className="py-4 px-3">
                          <span className="text-sm font-medium">{LEAVE_TYPE_LABELS[r.leave_type]}</span>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Me</span>
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                                {r.requester?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-sm text-destructive font-medium">
                          {format(parseISO(r.start_date), 'MM/dd/yyyy')}
                        </td>
                        <td className="py-4 px-3">
                          <Badge className="text-[11px] font-semibold bg-[hsl(28,100%,94%)] text-[hsl(28,100%,45%)] border-[hsl(28,100%,80%)] hover:bg-[hsl(28,100%,90%)]">
                            {r.status === 'pending' ? 'Delegated' : r.status === 'manager_approved' ? 'Manager OK' : r.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-2 text-muted-foreground/60">
                            <Check className="h-4 w-4 cursor-pointer hover:text-foreground" />
                            <MoreVertical className="h-4 w-4 cursor-pointer hover:text-foreground" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Performance & Goals Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Performance */}
        <Card className="shadow-sm rounded-xl border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold uppercase tracking-wide">My Performance</CardTitle>
              <Settings className="h-5 w-5 text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors" />
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            {(() => {
              const completedReviews = reviews.filter(r => r.status === 'completed');
              const pendingReviews = reviews.filter(r => r.status === 'pending');
              const latestCompleted = completedReviews[0];
              const nextPending = pendingReviews[0];
              const activeGoals = goals.filter(g => g.status === 'active').length;
              const actionPlans = goals.length;
              return (
                <div className="divide-y divide-border">
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">Next Review</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{nextPending ? format(parseISO(nextPending.created_at), 'dd MMMM yyyy') : 'None scheduled'}</span>
                      {nextPending && (
                        <Badge className="text-[10px] bg-[hsl(207,90%,95%)] text-[hsl(207,90%,40%)] border-[hsl(207,90%,80%)]">
                          Not Yet Opened
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">Last Review</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{latestCompleted ? format(parseISO(latestCompleted.created_at), 'dd MMMM yyyy') : 'None yet'}</span>
                      {latestCompleted && (
                        <Badge className="text-[10px] bg-[hsl(122,39%,95%)] text-[hsl(122,39%,35%)] border-[hsl(122,39%,75%)]">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">Current Goals</span>
                    <span className="text-sm font-bold">{activeGoals}</span>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wide">Action Plans</span>
                    <span className="text-sm font-bold">{actionPlans}</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="shadow-sm rounded-xl border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold uppercase tracking-wide">Goals</CardTitle>
              <Settings className="h-5 w-5 text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors" />
            </div>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-center py-10">
                <Target className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground">No goals defined yet</p>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-border">
                <div className="flex items-center justify-between py-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Goal Name</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Progress</span>
                </div>
                {goals.slice(0, 6).map((goal, i) => (
                  <div key={goal.id} className="flex items-center justify-between py-4 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{goal.title}</p>
                    </div>
                    <div className="shrink-0 w-48">
                      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            i % 2 === 0 
                              ? "bg-[hsl(174,72%,56%)]" 
                              : "bg-[hsl(199,84%,55%)]"
                          )}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company Overview */}
      {companies.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">Companies</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {companies.map(company => (
              <div key={company.id} className="flex items-center gap-3 p-4 rounded-xl bg-card border shadow-sm">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                  company.parent_id ? 'bg-muted' : 'gradient-primary'
                )}>
                  <Building2 className={cn("h-5 w-5", company.parent_id ? 'text-muted-foreground' : 'text-primary-foreground')} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{company.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {company.parent_id ? 'Subsidiary' : 'Parent'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
