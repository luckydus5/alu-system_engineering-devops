import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  UserPlus, CheckCircle2, Clock, FileText, Briefcase,
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

const AVATAR_GRADIENTS = [
  'from-cyan-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
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

function NewHireCard({ hire }: { hire: typeof mockNewHires[0] }) {
  const daysUntilStart = differenceInDays(new Date(hire.startDate), new Date());
  const isStarted = daysUntilStart <= 0;
  const gradient = AVATAR_GRADIENTS[hire.name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  
  const statusConfig = {
    pending: { label: 'Pending', color: 'text-amber-600 border-amber-500/20 bg-amber-500/10' },
    in_progress: { label: 'In Progress', color: 'text-blue-600 border-blue-500/20 bg-blue-500/10' },
    completed: { label: 'Completed', color: 'text-emerald-600 border-emerald-500/20 bg-emerald-500/10' },
  };
  const status = statusConfig[hire.status as keyof typeof statusConfig];

  return (
    <Card className="group border-0 shadow-corporate hover:shadow-corporate-lg transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      <div className={cn("h-0.5 bg-gradient-to-r", gradient)} />
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
            <AvatarFallback className={cn("text-sm font-bold text-white bg-gradient-to-br", gradient)}>
              {hire.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-sm">{hire.name}</h4>
              <Badge variant="outline" className={cn("text-[10px] font-semibold", status.color)}>
                {status.label}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground">{hire.position}</p>
            <p className="text-[10px] text-muted-foreground">{hire.department} · {hire.manager}</p>
            
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {isStarted ? 'Started' : 'Starts'} {format(new Date(hire.startDate), 'MMM d, yyyy')}
                  {!isStarted && daysUntilStart > 0 && ` (${daysUntilStart}d)`}
                </span>
                <span className={cn("font-semibold", hire.progress === 100 ? "text-emerald-600" : "text-primary")}>
                  {hire.progress}%
                </span>
              </div>
              <Progress value={hire.progress} className="h-1.5" />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between pt-3 border-t">
          <Button variant="ghost" size="sm" className="text-xs h-8">
            <Mail className="h-3.5 w-3.5 mr-1.5" /> Contact
          </Button>
          <Button size="sm" className="text-xs h-8 shadow-sm">
            Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OnboardingChecklistView({ hire }: { hire: typeof mockNewHires[0] }) {
  const [checkedItems, setCheckedItems] = useState<string[]>(['welcome', 'account']);
  const gradient = AVATAR_GRADIENTS[hire.name.charCodeAt(0) % AVATAR_GRADIENTS.length];

  const toggleItem = (id: string) => {
    setCheckedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const categories = [
    { id: 'admin', label: 'Administrative', color: 'text-primary' },
    { id: 'it', label: 'IT Setup', color: 'text-violet-600' },
    { id: 'hr', label: 'HR Tasks', color: 'text-emerald-600' },
    { id: 'training', label: 'Training', color: 'text-secondary-foreground' },
    { id: 'team', label: 'Team Integration', color: 'text-rose-600' },
  ];

  return (
    <Card className="border-0 shadow-corporate">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className={cn("text-xs font-bold text-white bg-gradient-to-br", gradient)}>
                {hire.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm">{hire.name}</CardTitle>
              <CardDescription className="text-xs">{hire.position}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold">
            {checkedItems.length}/{onboardingChecklist.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={(checkedItems.length / onboardingChecklist.length) * 100} className="h-1.5 mb-5" />
        
        <div className="space-y-5">
          {categories.map(category => {
            const items = onboardingChecklist.filter(item => item.category === category.id);
            if (items.length === 0) return null;
            
            return (
              <div key={category.id}>
                <h4 className={cn("text-[10px] font-semibold uppercase tracking-wider mb-2", category.color)}>
                  {category.label}
                </h4>
                <div className="space-y-1">
                  {items.map(item => {
                    const Icon = item.icon;
                    const isChecked = checkedItems.includes(item.id);
                    return (
                      <div 
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer",
                          isChecked ? "bg-emerald-500/5" : "bg-muted/30 hover:bg-muted/50"
                        )}
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

  const statCards = [
    { label: 'New Hires', value: stats.totalNewHires, icon: UserPlus, gradient: 'from-cyan-500 to-blue-600' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Pending', value: stats.pending, icon: Calendar, gradient: 'from-amber-500 to-orange-600' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
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
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="new-hires" className="gap-2 text-xs">
              <Users className="h-3.5 w-3.5" /> New Hires
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-2 text-xs">
              <FileText className="h-3.5 w-3.5" /> Checklists
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2 text-xs">
              <BookOpen className="h-3.5 w-3.5" /> Templates
            </TabsTrigger>
          </TabsList>
          
          <Button size="sm" className="shadow-sm text-xs h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add New Hire
          </Button>
        </div>

        <TabsContent value="new-hires" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockNewHires.map(hire => (
              <NewHireCard key={hire.id} hire={hire} />
            ))}
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
          <Card className="border-0 shadow-corporate">
            <CardContent className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Onboarding Templates</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Create reusable onboarding templates for different roles
              </p>
              <Button className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Create Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
