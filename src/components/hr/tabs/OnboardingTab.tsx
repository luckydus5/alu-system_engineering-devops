import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, CheckCircle2, Clock, FileText,
  GraduationCap, Building2, ChevronRight, Plus, Users,
  Calendar, Mail, Shield, Laptop, Key, BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface OnboardingTabProps {
  departmentId: string;
}

const mockNewHires = [
  { id: '1', name: 'Alex Thompson', position: 'Software Engineer', department: 'Engineering', startDate: '2026-02-10', progress: 65, status: 'in_progress', manager: 'John Smith', email: 'alex.thompson@company.com' },
  { id: '2', name: 'Maria Garcia', position: 'Product Designer', department: 'Design', startDate: '2026-02-17', progress: 30, status: 'in_progress', manager: 'Sarah Johnson', email: 'maria.garcia@company.com' },
  { id: '3', name: 'James Wilson', position: 'Marketing Manager', department: 'Marketing', startDate: '2026-02-03', progress: 100, status: 'completed', manager: 'Emily Brown', email: 'james.wilson@company.com' },
  { id: '4', name: 'Lisa Chen', position: 'Data Analyst', department: 'Analytics', startDate: '2026-02-24', progress: 0, status: 'pending', manager: 'David Lee', email: 'lisa.chen@company.com' },
];

const onboardingChecklist = [
  { id: 'welcome', label: 'Welcome Email Sent', category: 'admin', icon: Mail },
  { id: 'account', label: 'Company Account Created', category: 'admin', icon: Shield },
  { id: 'equipment', label: 'Equipment Prepared', category: 'it', icon: Laptop },
  { id: 'access', label: 'System Access Granted', category: 'it', icon: Key },
  { id: 'workspace', label: 'Workspace Setup', category: 'facilities', icon: Building2 },
  { id: 'orientation', label: 'HR Orientation Scheduled', category: 'hr', icon: Calendar },
  { id: 'handbook', label: 'Employee Handbook Shared', category: 'hr', icon: BookOpen },
  { id: 'mentor', label: 'Mentor Assigned', category: 'hr', icon: Users },
  { id: 'training', label: 'Training Plan Created', category: 'training', icon: GraduationCap },
  { id: 'intro', label: 'Team Introduction Meeting', category: 'team', icon: Users },
];

function OnboardingChecklistView({ hire }: { hire: typeof mockNewHires[0] }) {
  const [checkedItems, setCheckedItems] = useState<string[]>(['welcome', 'account']);
  const toggleItem = (id: string) => setCheckedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const categories = [
    { id: 'admin', label: 'Administrative' },
    { id: 'it', label: 'IT Setup' },
    { id: 'hr', label: 'HR Tasks' },
    { id: 'training', label: 'Training' },
    { id: 'team', label: 'Team Integration' },
  ];

  return (
    <Card className="border rounded-2xl shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                {hire.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm">{hire.name}</CardTitle>
              <CardDescription className="text-xs">{hire.position}</CardDescription>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{checkedItems.length}/{onboardingChecklist.length}</span>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={(checkedItems.length / onboardingChecklist.length) * 100} className="h-1 mb-5" />
        <div className="space-y-5">
          {categories.map(category => {
            const items = onboardingChecklist.filter(item => item.category === category.id);
            if (items.length === 0) return null;
            return (
              <div key={category.id}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{category.label}</p>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const Icon = item.icon;
                    const isChecked = checkedItems.includes(item.id);
                    return (
                      <div 
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
                        onClick={() => toggleItem(item.id)}
                      >
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleItem(item.id)} />
                        <Icon className={cn("h-3.5 w-3.5", isChecked ? "text-emerald-600" : "text-muted-foreground")} />
                        <span className={cn("text-xs", isChecked && "line-through text-muted-foreground")}>{item.label}</span>
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 ml-auto" />}
                      </div>
                    );
                  })}
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
  const [activeView, setActiveView] = useState('new-hires');

  const stats = {
    totalNewHires: mockNewHires.length,
    inProgress: mockNewHires.filter(h => h.status === 'in_progress').length,
    pending: mockNewHires.filter(h => h.status === 'pending').length,
    completed: mockNewHires.filter(h => h.status === 'completed').length,
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'New Hires', value: stats.totalNewHires, icon: UserPlus },
          { label: 'In Progress', value: stats.inProgress, icon: Clock },
          { label: 'Pending', value: stats.pending, icon: Calendar },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2 },
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
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-0.5 rounded-xl h-auto">
            <TabsTrigger value="new-hires" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-sm px-4 py-2">
              <Users className="h-3.5 w-3.5" /> New Hires
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-sm px-4 py-2">
              <FileText className="h-3.5 w-3.5" /> Checklists
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1.5 text-xs rounded-lg data-[state=active]:shadow-sm px-4 py-2">
              <BookOpen className="h-3.5 w-3.5" /> Templates
            </TabsTrigger>
          </TabsList>
          <Button size="sm" variant="outline" className="text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add New Hire
          </Button>
        </div>

        <TabsContent value="new-hires" className="mt-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mockNewHires.map(hire => {
              const daysUntilStart = differenceInDays(new Date(hire.startDate), new Date());
              const isStarted = daysUntilStart <= 0;
              const statusLabel = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }[hire.status] || hire.status;

              return (
                <div key={hire.id} className="p-5 rounded-2xl bg-card border space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                        {hire.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{hire.name}</p>
                      <p className="text-xs text-muted-foreground">{hire.position}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{hire.department} · {hire.manager}</span>
                    <Badge variant="outline" className="text-[10px]">{statusLabel}</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {isStarted ? 'Started' : `Starts ${format(new Date(hire.startDate), 'MMM d')}`}
                        {!isStarted && daysUntilStart > 0 && ` (${daysUntilStart}d)`}
                      </span>
                      <span className={hire.progress === 100 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                        {hire.progress}%
                      </span>
                    </div>
                    <Progress value={hire.progress} className="h-1" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground">
                      <Mail className="h-3 w-3 mr-1" /> Contact
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Details <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="checklists" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {mockNewHires.filter(h => h.status !== 'completed').map(hire => (
              <OnboardingChecklistView key={hire.id} hire={hire} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="text-center py-16 rounded-2xl bg-card border">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-semibold">Onboarding Templates</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Create reusable onboarding templates for different roles
            </p>
            <Button className="mt-4" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> Create Template
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
