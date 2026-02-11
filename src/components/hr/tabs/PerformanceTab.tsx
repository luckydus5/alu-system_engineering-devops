import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, Award, TrendingUp, Star, Users, Calendar,
  CheckCircle2, Clock, BarChart3, ChevronRight, 
  Medal, Trophy, Flame, Sparkles, MessageSquare
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

interface PerformanceTabProps {
  departmentId: string;
}

const PERFORMANCE_LEVELS = [
  { level: 'Outstanding', min: 90, max: 100, color: 'text-emerald-600', bgColor: 'bg-emerald-500', badge: 'bg-emerald-500/10 border-emerald-500/20' },
  { level: 'Exceeds', min: 75, max: 89, color: 'text-blue-600', bgColor: 'bg-blue-500', badge: 'bg-blue-500/10 border-blue-500/20' },
  { level: 'Meets', min: 60, max: 74, color: 'text-amber-600', bgColor: 'bg-amber-500', badge: 'bg-amber-500/10 border-amber-500/20' },
  { level: 'Needs Improvement', min: 0, max: 59, color: 'text-red-600', bgColor: 'bg-red-500', badge: 'bg-red-500/10 border-red-500/20' },
];

function getPerformanceLevel(score: number) {
  return PERFORMANCE_LEVELS.find(l => score >= l.min && score <= l.max) || PERFORMANCE_LEVELS[3];
}

const mockReviews = [
  { id: '1', employeeName: 'John Smith', score: 92, period: 'Q4 2025', status: 'completed', goals: 8, goalsCompleted: 7 },
  { id: '2', employeeName: 'Sarah Johnson', score: 85, period: 'Q4 2025', status: 'completed', goals: 6, goalsCompleted: 5 },
  { id: '3', employeeName: 'Mike Wilson', score: 78, period: 'Q4 2025', status: 'in_progress', goals: 5, goalsCompleted: 3 },
  { id: '4', employeeName: 'Emily Brown', score: 95, period: 'Q4 2025', status: 'completed', goals: 10, goalsCompleted: 10 },
  { id: '5', employeeName: 'David Lee', score: 68, period: 'Q4 2025', status: 'pending', goals: 4, goalsCompleted: 2 },
];

const mockGoals = [
  { id: '1', title: 'Complete Q4 Sales Target', progress: 85, dueDate: '2025-12-31', priority: 'high' },
  { id: '2', title: 'Team Training Sessions', progress: 100, dueDate: '2025-11-30', priority: 'medium' },
  { id: '3', title: 'Process Documentation', progress: 60, dueDate: '2026-01-15', priority: 'low' },
  { id: '4', title: 'Customer Satisfaction Improvement', progress: 75, dueDate: '2026-02-28', priority: 'high' },
];

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

function PerformanceCard({ review, rank }: { review: typeof mockReviews[0]; rank?: number }) {
  const level = getPerformanceLevel(review.score);
  const gradient = AVATAR_GRADIENTS[review.employeeName.charCodeAt(0) % AVATAR_GRADIENTS.length];
  
  return (
    <Card className="group border-0 shadow-corporate hover:shadow-corporate-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      <div className={cn("h-0.5 w-full", level.bgColor)} />
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
              <AvatarFallback className={cn("text-sm font-bold text-white bg-gradient-to-br", gradient)}>
                {review.employeeName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {rank && rank <= 3 && (
              <div className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow",
                rank === 1 ? "bg-amber-500" : rank === 2 ? "bg-slate-400" : "bg-amber-700"
              )}>
                {rank}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-semibold text-sm">{review.employeeName}</h4>
              <Badge variant="outline" className={cn("text-[10px] font-semibold", level.badge, level.color)}>
                {level.level}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>{review.period}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span>{review.goalsCompleted}/{review.goals} goals</span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Score</span>
                <span className={cn("font-bold", level.color)}>{review.score}%</span>
              </div>
              <Progress value={review.score} className="h-1.5" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCard({ goal }: { goal: typeof mockGoals[0] }) {
  const priorityConfig = {
    high: { border: 'border-l-destructive', badge: 'bg-destructive/10 text-destructive', label: 'High' },
    medium: { border: 'border-l-secondary', badge: 'bg-secondary/10 text-secondary-foreground', label: 'Medium' },
    low: { border: 'border-l-primary', badge: 'bg-primary/10 text-primary', label: 'Low' },
  };
  const config = priorityConfig[goal.priority as keyof typeof priorityConfig];
  
  return (
    <Card className={cn("border-l-4 border-0 shadow-corporate hover:shadow-corporate-lg transition-all", config.border)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-sm">{goal.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Due: {goal.dueDate}</p>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", config.badge)}>
            {goal.progress === 100 ? '✓ Done' : `${goal.progress}%`}
          </Badge>
        </div>
        <Progress value={goal.progress} className="h-1.5" />
      </CardContent>
    </Card>
  );
}

export function PerformanceTab({ departmentId }: PerformanceTabProps) {
  const [activeView, setActiveView] = useState('overview');
  const { users } = useUsers();

  const stats = {
    avgScore: 84,
    reviewsCompleted: 45,
    reviewsPending: 12,
    topPerformers: 8,
    goalsOnTrack: 78,
  };

  const statCards = [
    { label: 'Avg Score', value: `${stats.avgScore}%`, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600' },
    { label: 'Completed', value: stats.reviewsCompleted, icon: CheckCircle2, gradient: 'from-blue-500 to-cyan-600' },
    { label: 'Pending', value: stats.reviewsPending, icon: Clock, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Top Stars', value: stats.topPerformers, icon: Trophy, gradient: 'from-violet-500 to-purple-600' },
    { label: 'On Track', value: `${stats.goalsOnTrack}%`, icon: Target, gradient: 'from-rose-500 to-pink-600' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, gradient }) => (
          <Card key={label} className="border-0 shadow-corporate overflow-hidden">
            <div className={cn("h-0.5 bg-gradient-to-r", gradient)} />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
                <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center", gradient)}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-2 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2 text-xs">
            <Star className="h-3.5 w-3.5" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2 text-xs">
            <Target className="h-3.5 w-3.5" /> Goals
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-0 shadow-corporate">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Performance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {PERFORMANCE_LEVELS.map((level) => {
                  const count = mockReviews.filter(r => r.score >= level.min && r.score <= level.max).length;
                  const percentage = (count / mockReviews.length) * 100;
                  return (
                    <div key={level.level} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={cn("font-medium", level.color)}>{level.level}</span>
                        <span className="text-muted-foreground">{count} employees</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", level.bgColor)} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-corporate">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-secondary" />
                  Top Performers
                </CardTitle>
                <CardDescription className="text-xs">Highest rated this quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockReviews
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((review, idx) => {
                      const level = getPerformanceLevel(review.score);
                      const gradient = AVATAR_GRADIENTS[review.employeeName.charCodeAt(0) % AVATAR_GRADIENTS.length];
                      return (
                        <div key={review.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                            idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-muted-foreground/30"
                          )}>
                            {idx + 1}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className={cn("text-[10px] font-bold text-white bg-gradient-to-br", gradient)}>
                              {review.employeeName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{review.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground">{review.goalsCompleted}/{review.goals} goals</p>
                          </div>
                          <span className={cn("text-sm font-bold", level.color)}>{review.score}%</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-corporate">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Performance Reviews</CardTitle>
                <CardDescription className="text-xs">Latest evaluations</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="text-xs h-8">
                View All <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockReviews.slice(0, 3).map((review, idx) => (
                  <PerformanceCard key={review.id} review={review} rank={idx + 1} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockReviews.map(review => (
              <PerformanceCard key={review.id} review={review} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {mockGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <Card className="border-0 shadow-corporate">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold mb-1">360° Feedback</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Collect and manage employee feedback for comprehensive performance reviews
              </p>
              <Button className="shadow-sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Start Feedback Cycle
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
