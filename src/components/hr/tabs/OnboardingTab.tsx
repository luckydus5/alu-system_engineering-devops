import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
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

// Mock data for onboarding
const mockNewHires = [
  { 
    id: '1', 
    name: 'Alex Thompson', 
    position: 'Software Engineer', 
    department: 'Engineering',
    startDate: '2026-02-10', 
    progress: 65, 
    status: 'in_progress',
    manager: 'John Smith',
    email: 'alex.thompson@company.com'
  },
  { 
    id: '2', 
    name: 'Maria Garcia', 
    position: 'Product Designer', 
    department: 'Design',
    startDate: '2026-02-17', 
    progress: 30, 
    status: 'in_progress',
    manager: 'Sarah Johnson',
    email: 'maria.garcia@company.com'
  },
  { 
    id: '3', 
    name: 'James Wilson', 
    position: 'Marketing Manager', 
    department: 'Marketing',
    startDate: '2026-02-03', 
    progress: 100, 
    status: 'completed',
    manager: 'Emily Brown',
    email: 'james.wilson@company.com'
  },
  { 
    id: '4', 
    name: 'Lisa Chen', 
    position: 'Data Analyst', 
    department: 'Analytics',
    startDate: '2026-02-24', 
    progress: 0, 
    status: 'pending',
    manager: 'David Lee',
    email: 'lisa.chen@company.com'
  },
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
  
  const statusConfig = {
    pending: { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
    in_progress: { label: 'In Progress', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
    completed: { label: 'Completed', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  };
  
  const status = statusConfig[hire.status as keyof typeof statusConfig];

  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-lg">
              {hire.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold">{hire.name}</h4>
              <Badge className={cn("text-xs", status.bgColor, status.color)}>
                {status.label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground">{hire.position}</p>
            <p className="text-xs text-muted-foreground">{hire.department} • Reports to {hire.manager}</p>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {isStarted ? 'Started' : 'Starts'} {format(new Date(hire.startDate), 'MMM d, yyyy')}
                  {!isStarted && daysUntilStart > 0 && ` (${daysUntilStart} days)`}
                </span>
                <span className={cn("font-medium", hire.progress === 100 ? "text-emerald-600" : "text-blue-600")}>
                  {hire.progress}%
                </span>
              </div>
              <Progress value={hire.progress} className="h-2" />
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Contact
          </Button>
          <Button size="sm">
            View Details
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OnboardingChecklistView({ hire }: { hire: typeof mockNewHires[0] }) {
  const [checkedItems, setCheckedItems] = useState<string[]>([
    'welcome', 'account', // Demo: some items already checked
  ]);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const categories = [
    { id: 'admin', label: 'Administrative', color: 'text-blue-600' },
    { id: 'it', label: 'IT Setup', color: 'text-violet-600' },
    { id: 'hr', label: 'HR Tasks', color: 'text-emerald-600' },
    { id: 'training', label: 'Training', color: 'text-amber-600' },
    { id: 'team', label: 'Team Integration', color: 'text-rose-600' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                {hire.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{hire.name}'s Onboarding</CardTitle>
              <CardDescription>{hire.position} • {hire.department}</CardDescription>
            </div>
          </div>
          <Badge variant="outline">
            {checkedItems.length}/{onboardingChecklist.length} Complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Progress 
          value={(checkedItems.length / onboardingChecklist.length) * 100} 
          className="h-2 mb-6"
        />
        
        <div className="space-y-6">
          {categories.map(category => {
            const items = onboardingChecklist.filter(item => item.category === category.id);
            
            return (
              <div key={category.id}>
                <h4 className={cn("text-sm font-semibold mb-3", category.color)}>
                  {category.label}
                </h4>
                <div className="space-y-2">
                  {items.map(item => {
                    const Icon = item.icon;
                    const isChecked = checkedItems.includes(item.id);
                    
                    return (
                      <div 
                        key={item.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                          isChecked ? "bg-emerald-500/5" : "bg-muted/50 hover:bg-muted"
                        )}
                        onClick={() => toggleItem(item.id)}
                      >
                        <Checkbox 
                          checked={isChecked}
                          onCheckedChange={() => toggleItem(item.id)}
                        />
                        <Icon className={cn(
                          "h-4 w-4",
                          isChecked ? "text-emerald-600" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-sm",
                          isChecked && "line-through text-muted-foreground"
                        )}>
                          {item.label}
                        </span>
                        {isChecked && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />
                        )}
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
  const [selectedHire, setSelectedHire] = useState<typeof mockNewHires[0] | null>(null);
  const [activeView, setActiveView] = useState('new-hires');

  const stats = {
    totalNewHires: mockNewHires.length,
    inProgress: mockNewHires.filter(h => h.status === 'in_progress').length,
    pending: mockNewHires.filter(h => h.status === 'pending').length,
    completed: mockNewHires.filter(h => h.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Hires</p>
                <p className="text-3xl font-bold text-cyan-600">{stats.totalNewHires}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Start</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="new-hires" className="gap-2">
              <Users className="h-4 w-4" />
              New Hires
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-2">
              <FileText className="h-4 w-4" />
              Checklists
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Hire
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
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Onboarding Templates</h3>
              <p className="text-muted-foreground mb-4">
                Create and manage reusable onboarding templates for different roles and departments
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
