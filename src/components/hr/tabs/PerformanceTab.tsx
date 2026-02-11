import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, TrendingUp, Star, 
  CheckCircle2, Clock, BarChart3, ChevronRight, 
  Trophy, Sparkles, MessageSquare
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

interface PerformanceTabProps {
  departmentId: string;
}

const PERFORMANCE_LEVELS = [
  { level: 'Outstanding', min: 90, max: 100, color: 'text-emerald-600', bgColor: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  { level: 'Exceeds', min: 75, max: 89, color: 'text-blue-600', bgColor: 'bg-blue-500', badge: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  { level: 'Meets', min: 60, max: 74, color: 'text-amber-600', bgColor: 'bg-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  { level: 'Needs Improvement', min: 0, max: 59, color: 'text-red-600', bgColor: 'bg-red-500', badge: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' },
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

export function PerformanceTab({ departmentId }: PerformanceTabProps) {
  const [activeView, setActiveView] = useState('overview');
  const { users } = useUsers();

  const stats = { avgScore: 84, reviewsCompleted: 45, reviewsPending: 12, topPerformers: 8, goalsOnTrack: 78 };

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: 'Avg Score', value: `${stats.avgScore}%`, icon: TrendingUp },
          { label: 'Completed', value: stats.reviewsCompleted, icon: CheckCircle2 },
          { label: 'Pending', value: stats.reviewsPending, icon: Clock },
          { label: 'Top Stars', value: stats.topPerformers, icon: Trophy },
          { label: 'On Track', value: `${stats.goalsOnTrack}%`, icon: Target },
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

      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-muted/50 p-0.5 rounded-xl h-auto">
          <TabsTrigger value="overview" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-sm px-4 py-2">
            <BarChart3 className="h-3.5 w-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-sm px-4 py-2">
            <Star className="h-3.5 w-3.5" /> Reviews
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-sm px-4 py-2">
            <Target className="h-3.5 w-3.5" /> Goals
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-sm px-4 py-2">
            <MessageSquare className="h-3.5 w-3.5" /> Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Distribution */}
            <Card className="border rounded-2xl shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {PERFORMANCE_LEVELS.map((level) => {
                  const count = mockReviews.filter(r => r.score >= level.min && r.score <= level.max).length;
                  const pct = (count / mockReviews.length) * 100;
                  return (
                    <div key={level.level} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{level.level}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", level.bgColor)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="border rounded-2xl shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {mockReviews
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((review, idx) => {
                      const level = getPerformanceLevel(review.score);
                      return (
                        <div key={review.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                          <span className="text-xs font-medium text-muted-foreground w-5 text-center">{idx + 1}</span>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px] font-medium bg-muted text-muted-foreground">
                              {review.employeeName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{review.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground">{review.goalsCompleted}/{review.goals} goals</p>
                          </div>
                          <span className={cn("text-sm font-semibold tabular-nums", level.color)}>{review.score}%</span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mockReviews.map(review => {
              const level = getPerformanceLevel(review.score);
              return (
                <div key={review.id} className="p-5 rounded-2xl bg-card border space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                        {review.employeeName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{review.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{review.period}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn("text-[10px]", level.badge)}>{level.level}</Badge>
                    <span className={cn("text-lg font-semibold", level.color)}>{review.score}%</span>
                  </div>
                  <Progress value={review.score} className="h-1" />
                  <p className="text-xs text-muted-foreground">{review.goalsCompleted}/{review.goals} goals completed</p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2">
            {mockGoals.map(goal => (
              <div key={goal.id} className="p-5 rounded-2xl bg-card border space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{goal.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Due: {goal.dueDate}</p>
                  </div>
                  <span className={cn(
                    "text-xs font-medium",
                    goal.progress === 100 ? "text-emerald-600" : "text-muted-foreground"
                  )}>
                    {goal.progress}%
                  </span>
                </div>
                <Progress value={goal.progress} className="h-1" />
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="mt-6">
          <div className="text-center py-16 rounded-2xl bg-card border">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold">360° Feedback</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Collect and manage employee feedback for comprehensive performance reviews
            </p>
            <Button className="mt-4" variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Start Feedback Cycle
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
