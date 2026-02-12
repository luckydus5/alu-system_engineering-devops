import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, TrendingUp, Star, 
  CheckCircle2, Clock, BarChart3, 
  Trophy, Plus, Loader2
} from 'lucide-react';
import { usePerformanceReviews } from '@/hooks/usePerformanceReviews';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PerformanceTabProps {
  departmentId: string;
}

const PERFORMANCE_LEVELS = [
  { level: 'Outstanding', min: 90, max: 100, color: 'text-success', bgColor: 'bg-success', badge: 'bg-success/10 text-success border-success/30' },
  { level: 'Exceeds', min: 75, max: 89, color: 'text-info', bgColor: 'bg-info', badge: 'bg-info/10 text-info border-info/30' },
  { level: 'Meets', min: 60, max: 74, color: 'text-warning', bgColor: 'bg-warning', badge: 'bg-warning/10 text-warning border-warning/30' },
  { level: 'Needs Improvement', min: 0, max: 59, color: 'text-destructive', bgColor: 'bg-destructive', badge: 'bg-destructive/10 text-destructive border-destructive/30' },
];

function getPerformanceLevel(score: number) {
  return PERFORMANCE_LEVELS.find(l => score >= l.min && score <= l.max) || PERFORMANCE_LEVELS[3];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function PerformanceTab({ departmentId }: PerformanceTabProps) {
  const { reviews, goals, loading, addReview, addGoal } = usePerformanceReviews();
  const { employees } = useEmployees();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState('overview');
  const [addReviewOpen, setAddReviewOpen] = useState(false);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reviewForm, setReviewForm] = useState({ employee_id: '', review_period: '', score: '', comments: '' });
  const [goalForm, setGoalForm] = useState({ employee_id: '', title: '', description: '', priority: 'medium', due_date: '' });

  const scoredReviews = reviews.filter(r => r.score !== null);
  const avgScore = scoredReviews.length > 0 ? Math.round(scoredReviews.reduce((s, r) => s + (r.score || 0), 0) / scoredReviews.length) : 0;
  const completed = reviews.filter(r => r.status === 'completed').length;
  const pending = reviews.filter(r => r.status === 'pending').length;
  const topPerformers = scoredReviews.filter(r => (r.score || 0) >= 90).length;
  const goalsOnTrack = goals.length > 0 ? Math.round(goals.filter(g => g.progress >= 50).length / goals.length * 100) : 0;

  const handleAddReview = async () => {
    if (!reviewForm.employee_id || !reviewForm.review_period) {
      toast({ title: 'Employee and period are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await addReview({
        employee_id: reviewForm.employee_id,
        review_period: reviewForm.review_period,
        score: reviewForm.score ? parseInt(reviewForm.score) : null,
        comments: reviewForm.comments || null,
        status: reviewForm.score ? 'completed' : 'pending',
      });
      toast({ title: 'Review added!' });
      setAddReviewOpen(false);
      setReviewForm({ employee_id: '', review_period: '', score: '', comments: '' });
    } catch (err: any) {
      toast({ title: 'Failed to add review', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddGoal = async () => {
    if (!goalForm.employee_id || !goalForm.title) {
      toast({ title: 'Employee and title are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await addGoal({
        employee_id: goalForm.employee_id,
        title: goalForm.title,
        description: goalForm.description || null,
        priority: goalForm.priority,
        due_date: goalForm.due_date || null,
      });
      toast({ title: 'Goal added!' });
      setAddGoalOpen(false);
      setGoalForm({ employee_id: '', title: '', description: '', priority: 'medium', due_date: '' });
    } catch (err: any) {
      toast({ title: 'Failed to add goal', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: 'Avg Score', value: scoredReviews.length > 0 ? `${avgScore}%` : '—', icon: TrendingUp, variant: 'kpi-blue' },
          { label: 'Completed', value: completed, icon: CheckCircle2, variant: 'kpi-success' },
          { label: 'Pending', value: pending, icon: Clock, variant: 'kpi-gold' },
          { label: 'Top Stars', value: topPerformers, icon: Trophy, variant: 'kpi-warning' },
          { label: 'On Track', value: goals.length > 0 ? `${goalsOnTrack}%` : '—', icon: Target, variant: 'kpi-blue' },
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

      <Tabs value={activeView} onValueChange={setActiveView}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-0.5 rounded-lg h-auto">
            <TabsTrigger value="overview" className="gap-1.5 text-xs rounded-md data-[state=active]:shadow-sm px-4 py-2">
              <BarChart3 className="h-3.5 w-3.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5 text-xs rounded-md data-[state=active]:shadow-sm px-4 py-2">
              <Star className="h-3.5 w-3.5" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1.5 text-xs rounded-md data-[state=active]:shadow-sm px-4 py-2">
              <Target className="h-3.5 w-3.5" /> Goals
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setAddReviewOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Review
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setAddGoalOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Goal
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-corporate rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scoredReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No reviews with scores yet.</p>
                ) : (
                  PERFORMANCE_LEVELS.map((level) => {
                    const count = scoredReviews.filter(r => (r.score || 0) >= level.min && (r.score || 0) <= level.max).length;
                    const pct = (count / scoredReviews.length) * 100;
                    return (
                      <div key={level.level} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{level.level}</span>
                          <span className="text-muted-foreground font-semibold">{count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", level.bgColor)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="shadow-corporate rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                {scoredReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No scored reviews yet.</p>
                ) : (
                  <div className="space-y-1">
                    {scoredReviews
                      .sort((a, b) => (b.score || 0) - (a.score || 0))
                      .slice(0, 5)
                      .map((review, idx) => {
                        const level = getPerformanceLevel(review.score || 0);
                        const name = review.employee_name || 'Unknown';
                        return (
                          <div key={review.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                            <span className="text-xs font-bold text-secondary w-5 text-center">{idx + 1}</span>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{name}</p>
                              <p className="text-[10px] text-muted-foreground">{review.review_period}</p>
                            </div>
                            <span className={cn("text-sm font-bold tabular-nums", level.color)}>{review.score}%</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          {reviews.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-card border shadow-corporate">
              <Star className="h-12 w-12 mx-auto text-secondary/30 mb-4" />
              <h3 className="text-lg font-bold">No Reviews Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Click "Add Review" to create the first performance review.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map(review => {
                const level = review.score !== null ? getPerformanceLevel(review.score) : null;
                return (
                  <Card key={review.id} className="shadow-corporate rounded-xl">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {getInitials(review.employee_name || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{review.employee_name}</p>
                          <p className="text-xs text-muted-foreground">{review.review_period}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {level ? (
                          <>
                            <Badge variant="outline" className={cn("text-[10px] border", level.badge)}>{level.level}</Badge>
                            <span className={cn("text-lg font-bold", level.color)}>{review.score}%</span>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">{review.status}</Badge>
                        )}
                      </div>
                      {review.score !== null && <Progress value={review.score} className="h-1.5" />}
                      {review.comments && <p className="text-xs text-muted-foreground line-clamp-2">{review.comments}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="goals" className="mt-6">
          {goals.length === 0 ? (
            <div className="text-center py-16 rounded-xl bg-card border shadow-corporate">
              <Target className="h-12 w-12 mx-auto text-primary/30 mb-4" />
              <h3 className="text-lg font-bold">No Goals Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Click "Add Goal" to create the first performance goal.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {goals.map(goal => (
                <Card key={goal.id} className="shadow-corporate rounded-xl">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {goal.employee_name} {goal.due_date ? `· Due: ${goal.due_date}` : ''}
                        </p>
                      </div>
                      <span className={cn(
                        "text-xs font-bold",
                        goal.progress === 100 ? "text-success" : "text-muted-foreground"
                      )}>
                        {goal.progress}%
                      </span>
                    </div>
                    <Progress value={goal.progress} className="h-1.5" />
                    {goal.description && <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Review Dialog */}
      <Dialog open={addReviewOpen} onOpenChange={setAddReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Performance Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Employee <span className="text-destructive">*</span></Label>
              <Select value={reviewForm.employee_id} onValueChange={v => setReviewForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Review Period <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Q1 2026" value={reviewForm.review_period} onChange={e => setReviewForm(f => ({ ...f, review_period: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Score (0-100)</Label>
              <Input type="number" min="0" max="100" placeholder="Optional" value={reviewForm.score} onChange={e => setReviewForm(f => ({ ...f, score: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <Textarea value={reviewForm.comments} onChange={e => setReviewForm(f => ({ ...f, comments: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleAddReview} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={addGoalOpen} onOpenChange={setAddGoalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Performance Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Employee <span className="text-destructive">*</span></Label>
              <Select value={goalForm.employee_id} onValueChange={v => setGoalForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={goalForm.priority} onValueChange={v => setGoalForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={goalForm.due_date} onChange={e => setGoalForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGoalOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGoal} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
