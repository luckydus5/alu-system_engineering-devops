import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  RefreshCw,
  CalendarDays,
  Clock,
  CheckCircle2,
  Users,
  CheckSquare,
  LayoutGrid,
  List,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { useOfficeActivities, OfficeActivity, CreateActivityData, ActivityType } from '@/hooks/useOfficeActivities';
import { ActivityCard } from './ActivityCard';
import { AddActivityDialog } from './AddActivityDialog';
import { cn } from '@/lib/utils';
import { getDepartmentIcon, getDepartmentColors } from '@/lib/departmentIcons';
import { format, isToday } from 'date-fns';

interface OfficeDashboardProps {
  department: Department;
  canManage: boolean;
}

export function OfficeDashboard({ department, canManage }: OfficeDashboardProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<OfficeActivity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    activities,
    loading,
    stats,
    todayActivities,
    upcomingActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    togglePin,
    refetch,
  } = useOfficeActivities(department.id);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      searchQuery === '' ||
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || activity.activity_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSubmit = async (data: CreateActivityData) => {
    setIsSubmitting(true);

    if (editActivity) {
      await updateActivity(editActivity.id, data);
      setEditActivity(null);
    } else {
      await createActivity({
        ...data,
        department_id: department.id,
      });
    }

    setIsSubmitting(false);
    setAddDialogOpen(false);
  };

  const handleEdit = (activity: OfficeActivity) => {
    setEditActivity(activity);
    setAddDialogOpen(true);
  };

  const handleStatusChange = async (id: string, status: OfficeActivity['status']) => {
    await updateActivity(id, { status });
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditActivity(null);
    }
    setAddDialogOpen(open);
  };

  const deptColors = getDepartmentColors(department.code);
  const DeptIcon = getDepartmentIcon(department.code);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 md:p-8 text-white",
        deptColors.gradient
      )}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <DeptIcon className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-bold">{department.name}</h2>
                <Badge className="bg-white/20 text-white border-none">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Office
                </Badge>
              </div>
              <p className="text-white/80 mt-1">
                {department.description || 'Team activities, meetings & updates'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={refetch} 
              disabled={loading}
              className="bg-white/20 hover:bg-white/30 text-white border-none"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
            {canManage && (
              <Button 
                onClick={() => setAddDialogOpen(true)}
                className="bg-white text-gray-800 hover:bg-white/90 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Activity
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Calendar className="h-4 w-4" />
              Today
            </div>
            <p className="text-3xl font-bold">{todayActivities.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <Users className="h-4 w-4" />
              Meetings
            </div>
            <p className="text-3xl font-bold">{stats.meetings}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </div>
            <p className="text-3xl font-bold">{stats.tasks}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-white/70 text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </div>
            <p className="text-3xl font-bold">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Today's Activities & Upcoming */}
        <div className="space-y-6">
          {/* Today's Activities */}
          <Card className="shadow-corporate overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Today
                <span className="text-xs font-normal text-muted-foreground ml-auto">
                  {format(new Date(), 'EEEE, MMM d')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {todayActivities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activities scheduled for today</p>
                  {canManage && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setAddDialogOpen(true)}
                      className="mt-2"
                    >
                      Add one now
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {todayActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      canManage={canManage}
                      onTogglePin={togglePin}
                      onDelete={deleteActivity}
                      onEdit={handleEdit}
                      onStatusChange={handleStatusChange}
                      variant="compact"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card className="shadow-corporate">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                Upcoming (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {upcomingActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming activities
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-3">
                    {upcomingActivities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        canManage={canManage}
                        onTogglePin={togglePin}
                        onDelete={deleteActivity}
                        onEdit={handleEdit}
                        onStatusChange={handleStatusChange}
                        variant="compact"
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: All Activities */}
        <div className="lg:col-span-2">
          <Card className="shadow-corporate">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg">All Activities</CardTitle>
                
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="meeting">Meetings</SelectItem>
                      <SelectItem value="task">Tasks</SelectItem>
                      <SelectItem value="announcement">Announcements</SelectItem>
                      <SelectItem value="update">Updates</SelectItem>
                      <SelectItem value="milestone">Milestones</SelectItem>
                      <SelectItem value="event">Events</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="icon"
                      className="rounded-none h-9 w-9"
                      onClick={() => setViewMode('grid')}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="icon"
                      className="rounded-none h-9 w-9"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All ({filteredActivities.length})</TabsTrigger>
                  <TabsTrigger value="meetings">
                    <Users className="h-4 w-4 mr-1" />
                    Meetings ({stats.meetings})
                  </TabsTrigger>
                  <TabsTrigger value="tasks">
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Tasks ({stats.tasks})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <ActivitiesGrid
                    activities={filteredActivities}
                    loading={loading}
                    viewMode={viewMode}
                    canManage={canManage}
                    onTogglePin={togglePin}
                    onDelete={deleteActivity}
                    onEdit={handleEdit}
                    onStatusChange={handleStatusChange}
                    onCreateClick={() => setAddDialogOpen(true)}
                  />
                </TabsContent>

                <TabsContent value="meetings">
                  <ActivitiesGrid
                    activities={filteredActivities.filter((a) => a.activity_type === 'meeting')}
                    loading={loading}
                    viewMode={viewMode}
                    canManage={canManage}
                    onTogglePin={togglePin}
                    onDelete={deleteActivity}
                    onEdit={handleEdit}
                    onStatusChange={handleStatusChange}
                    onCreateClick={() => setAddDialogOpen(true)}
                    emptyMessage="No meetings scheduled"
                  />
                </TabsContent>

                <TabsContent value="tasks">
                  <ActivitiesGrid
                    activities={filteredActivities.filter((a) => a.activity_type === 'task')}
                    loading={loading}
                    viewMode={viewMode}
                    canManage={canManage}
                    onTogglePin={togglePin}
                    onDelete={deleteActivity}
                    onEdit={handleEdit}
                    onStatusChange={handleStatusChange}
                    onCreateClick={() => setAddDialogOpen(true)}
                    emptyMessage="No tasks yet"
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <AddActivityDialog
        open={addDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        editActivity={editActivity}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// Activities Grid Component
interface ActivitiesGridProps {
  activities: OfficeActivity[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  canManage: boolean;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (activity: OfficeActivity) => void;
  onStatusChange: (id: string, status: OfficeActivity['status']) => void;
  onCreateClick: () => void;
  emptyMessage?: string;
}

function ActivitiesGrid({
  activities,
  loading,
  viewMode,
  canManage,
  onTogglePin,
  onDelete,
  onEdit,
  onStatusChange,
  onCreateClick,
  emptyMessage = 'No activities found',
}: ActivitiesGridProps) {
  if (loading) {
    return (
      <div className={cn('gap-4', viewMode === 'grid' ? 'grid md:grid-cols-2' : 'flex flex-col')}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground mb-4">
          Create an activity to keep your team informed.
        </p>
        {canManage && (
          <Button onClick={onCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Activity
          </Button>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className={cn('gap-4 pr-3', viewMode === 'grid' ? 'grid md:grid-cols-2' : 'flex flex-col')}>
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            canManage={canManage}
            onTogglePin={onTogglePin}
            onDelete={onDelete}
            onEdit={onEdit}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
