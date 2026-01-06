import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Activity,
  Filter,
  RefreshCw,
  LayoutGrid,
  List,
  MapPin,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Radio,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { useFieldUpdates, FieldUpdate, CreateFieldUpdateData } from '@/hooks/useFieldUpdates';
import { FieldUpdateCard } from './FieldUpdateCard';
import { AddUpdateDialog } from './AddUpdateDialog';
import { cn } from '@/lib/utils';

interface OperationsDashboardProps {
  department: Department;
  canManage: boolean;
}

export function OperationsDashboard({ department, canManage }: OperationsDashboardProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editUpdate, setEditUpdate] = useState<FieldUpdate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    updates,
    loading,
    stats,
    createUpdate,
    updateFieldUpdate,
    deleteUpdate,
    togglePin,
    uploadPhoto,
    refetch,
  } = useFieldUpdates(department.id);

  // Filter updates
  const filteredUpdates = updates.filter((update) => {
    const matchesSearch =
      searchQuery === '' ||
      update.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      update.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || update.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || update.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Get recent updates with photos
  const updatesWithPhotos = updates.filter((u) => u.photos.length > 0).slice(0, 6);

  // Get urgent/issue updates
  const urgentUpdates = updates.filter((u) => u.priority === 'urgent' || u.status === 'issue');

  const handleSubmit = async (data: CreateFieldUpdateData, photos: File[]) => {
    setIsSubmitting(true);

    const uploadedUrls: string[] = [...(data.photos || [])];
    for (const file of photos) {
      const url = await uploadPhoto(file);
      if (url) {
        uploadedUrls.push(url);
      }
    }

    if (editUpdate) {
      await updateFieldUpdate(editUpdate.id, {
        ...data,
        photos: uploadedUrls,
      });
      setEditUpdate(null);
    } else {
      await createUpdate({
        ...data,
        department_id: department.id,
        photos: uploadedUrls,
      });
    }

    setIsSubmitting(false);
    setAddDialogOpen(false);
  };

  const handleEdit = (update: FieldUpdate) => {
    setEditUpdate(update);
    setAddDialogOpen(true);
  };

  const handleStatusChange = async (id: string, status: FieldUpdate['status']) => {
    await updateFieldUpdate(id, { status });
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditUpdate(null);
    }
    setAddDialogOpen(open);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-bold">{department.name}</h2>
                <Badge className="bg-white/20 text-white border-none">
                  <Radio className="h-3 w-3 mr-1 animate-pulse" />
                  Live
                </Badge>
              </div>
              <p className="text-emerald-100 mt-1">
                {department.description || 'Real-time field operations monitoring'}
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
                className="bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg"
              >
                <Camera className="h-4 w-4 mr-2" />
                Post Field Update
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
              <Activity className="h-4 w-4" />
              Active
            </div>
            <p className="text-3xl font-bold">{stats.active}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
              <Clock className="h-4 w-4" />
              In Progress
            </div>
            <p className="text-3xl font-bold">{stats.inProgress}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
              <CheckCircle className="h-4 w-4" />
              Completed
            </div>
            <p className="text-3xl font-bold">{stats.completed}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-100 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Issues
            </div>
            <p className="text-3xl font-bold">{stats.issues}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="shadow-corporate">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search updates, locations, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground hidden md:block" />

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="issue">Issues</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
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
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Updates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Alerts Section */}
          {urgentUpdates.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  Urgent Attention Required
                  <Badge variant="destructive" className="ml-auto">
                    {urgentUpdates.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {urgentUpdates.slice(0, 3).map((update) => (
                      <div
                        key={update.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-900 border"
                      >
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900">
                          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{update.title}</p>
                          {update.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {update.location}
                            </p>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(update)}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Updates Tabs */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4 w-full justify-start">
              <TabsTrigger value="all" className="gap-2">
                <Activity className="h-4 w-4" />
                All Updates
              </TabsTrigger>
              <TabsTrigger value="pinned" className="gap-2">
                📌 Pinned
              </TabsTrigger>
              <TabsTrigger value="issues" className="gap-2">
                ⚠️ Issues ({stats.issues})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <UpdatesGrid
                updates={filteredUpdates}
                loading={loading}
                viewMode={viewMode}
                canManage={canManage}
                onTogglePin={togglePin}
                onDelete={deleteUpdate}
                onEdit={handleEdit}
                onStatusChange={handleStatusChange}
                onCreateClick={() => setAddDialogOpen(true)}
              />
            </TabsContent>

            <TabsContent value="pinned">
              <UpdatesGrid
                updates={filteredUpdates.filter((u) => u.is_pinned)}
                loading={loading}
                viewMode={viewMode}
                canManage={canManage}
                onTogglePin={togglePin}
                onDelete={deleteUpdate}
                onEdit={handleEdit}
                onStatusChange={handleStatusChange}
                onCreateClick={() => setAddDialogOpen(true)}
                emptyMessage="No pinned updates"
              />
            </TabsContent>

            <TabsContent value="issues">
              <UpdatesGrid
                updates={filteredUpdates.filter((u) => u.status === 'issue')}
                loading={loading}
                viewMode={viewMode}
                canManage={canManage}
                onTogglePin={togglePin}
                onDelete={deleteUpdate}
                onEdit={handleEdit}
                onStatusChange={handleStatusChange}
                onCreateClick={() => setAddDialogOpen(true)}
                emptyMessage="No issues reported"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Photo Gallery & Recent Activity */}
        <div className="space-y-6">
          {/* Recent Photos */}
          {updatesWithPhotos.length > 0 && (
            <Card className="shadow-corporate">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5 text-emerald-600" />
                  Recent Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {updatesWithPhotos.flatMap((u) => 
                    u.photos.slice(0, 2).map((photo, idx) => (
                      <div 
                        key={`${u.id}-${idx}`}
                        className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={photo} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ).slice(0, 9)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="shadow-corporate">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManage && (
                <>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => setAddDialogOpen(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Post Photo Update
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      setStatusFilter('issue');
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report an Issue
                  </Button>
                </>
              )}
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={refetch}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Updates
              </Button>
            </CardContent>
          </Card>

          {/* Status Legend */}
          <Card className="shadow-corporate">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Status Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">Active - Ongoing operations</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">In Progress - Work underway</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-sm">Completed - Work done</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">On Hold - Paused</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">Issue - Needs attention</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <AddUpdateDialog
        open={addDialogOpen}
        onOpenChange={handleDialogClose}
        onSubmit={handleSubmit}
        editUpdate={editUpdate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

// Updates Grid Component
interface UpdatesGridProps {
  updates: FieldUpdate[];
  loading: boolean;
  viewMode: 'grid' | 'list';
  canManage: boolean;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (update: FieldUpdate) => void;
  onStatusChange: (id: string, status: FieldUpdate['status']) => void;
  onCreateClick: () => void;
  emptyMessage?: string;
}

function UpdatesGrid({
  updates,
  loading,
  viewMode,
  canManage,
  onTogglePin,
  onDelete,
  onEdit,
  onStatusChange,
  onCreateClick,
  emptyMessage = 'No updates found',
}: UpdatesGridProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'gap-4',
          viewMode === 'grid'
            ? 'grid sm:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col'
        )}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <Card className="shadow-corporate">
        <CardContent className="py-16 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
          <p className="text-muted-foreground mb-4">
            Post an update to keep your team informed about field operations.
          </p>
          {canManage && (
            <Button onClick={onCreateClick}>
              <Plus className="h-4 w-4 mr-2" />
              Post First Update
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        'gap-4',
        viewMode === 'grid'
          ? 'grid sm:grid-cols-2 lg:grid-cols-3'
          : 'flex flex-col'
      )}
    >
      {updates.map((update) => (
        <FieldUpdateCard
          key={update.id}
          update={update}
          canManage={canManage}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
          onEdit={onEdit}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  );
}
