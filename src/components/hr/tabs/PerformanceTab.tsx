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
  { level: 'Outstanding', min: 90, max: 100, color: 'text-emerald-600', bgColor: 'bg-emerald-500', badge: 'bg-emerald-500/10' },
  { level: 'Exceeds', min: 75, max: 89, color: 'text-blue-600', bgColor: 'bg-blue-500', badge: 'bg-blue-500/10' },
  { level: 'Meets', min: 60, max: 74, color: 'text-amber-600', bgColor: 'bg-amber-500', badge: 'bg-amber-500/10' },
  { level: 'Needs Improvement', min: 0, max: 59, color: 'text-red-600', bgColor: 'bg-red-500', badge: 'bg-red-500/10' },
];

function getPerformanceLevel(score: number) {
  return PERFORMANCE_LEVELS.find(l => score >= l.min && score <= l.max) || PERFORMANCE_LEVELS[3];
}

// Mock data for demonstration
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

function PerformanceCard({ review }: { review: typeof mockReviews[0] }) {
  const level = getPerformanceLevel(review.score);
  
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              {review.employeeName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold">{review.employeeName}</h4>
              <Badge className={cn("text-xs", level.badge, level.color)}>
                {level.level}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>{review.period}</span>
              <span>•</span>
              <span>{review.goalsCompleted}/{review.goals} goals</span>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>Performance Score</span>
                <span className={cn("font-bold", level.color)}>{review.score}%</span>
              </div>
              <Progress value={review.score} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalCard({ goal }: { goal: typeof mockGoals[0] }) {
  const priorityColors = {
    high: 'border-red-500 bg-red-500/5',
    medium: 'border-amber-500 bg-amber-500/5',
    low: 'border-blue-500 bg-blue-500/5',
  };
  
  return (
    <Card className={cn("border-l-4", priorityColors[goal.priority as keyof typeof priorityColors])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold">{goal.title}</h4>
            <p className="text-sm text-muted-foreground">Due: {goal.dueDate}</p>
          </div>
          <Badge variant={goal.progress === 100 ? 'default' : 'secondary'}>
            {goal.progress === 100 ? 'Completed' : `${goal.progress}%`}
          </Badge>
        </div>
        <Progress value={goal.progress} className="h-2" />
      </CardContent>
    </Card>
  );
}

export function PerformanceTab({ departmentId }: PerformanceTabProps) {
  const [activeView, setActiveView] = useState('overview');
  const { users } = useUsers();

  // Calculate mock stats
  const stats = {
    avgScore: 84,
    reviewsCompleted: 45,
    reviewsPending: 12,
    topPerformers: 8,
    goalsOnTrack: 78,
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.avgScore}%</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviews Done</p>
                <p className="text-3xl font-bold text-blue-600">{stats.reviewsCompleted}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold text-amber-600">{stats.reviewsPending}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performers</p>
                <p className="text-3xl font-bold text-violet-600">{stats.topPerformers}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Goals On Track</p>
                <p className="text-3xl font-bold text-rose-600">{stats.goalsOnTrack}%</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2">
            <Star className="h-4 w-4" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-2">
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Performance Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {PERFORMANCE_LEVELS.map((level, idx) => {
                  const count = mockReviews.filter(r => r.score >= level.min && r.score <= level.max).length;
                  const percentage = (count / mockReviews.length) * 100;
                  
                  return (
                    <div key={level.level} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className={level.color}>{level.level}</span>
                        <span className="text-muted-foreground">{count} employees</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full", level.bgColor)}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Performers
                </CardTitle>
                <CardDescription>Highest rated employees this quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {mockReviews
                      .sort((a, b) => b.score - a.score)
                      .slice(0, 5)
                      .map((review, idx) => (
                        <div 
                          key={review.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                            idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-slate-300"
                          )}>
                            {idx + 1}
                          </div>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-sm">
                              {review.employeeName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{review.employeeName}</p>
                            <p className="text-xs text-muted-foreground">{review.goalsCompleted}/{review.goals} goals</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">{review.score}%</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Recent Reviews */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Performance Reviews</CardTitle>
                <CardDescription>Latest employee evaluations</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mockReviews.slice(0, 3).map(review => (
                  <PerformanceCard key={review.id} review={review} />
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
          <Card>
            <CardContent className="p-12 text-center">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-1">360° Feedback</h3>
              <p className="text-muted-foreground mb-4">
                Collect and manage employee feedback for comprehensive performance reviews
              </p>
              <Button>
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
