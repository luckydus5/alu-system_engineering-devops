import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Search, Users, Mail, Phone, Building2, MapPin,
  Briefcase, UserCog, MoreHorizontal, Eye, Edit,
  Grid3X3, List, Filter, SortAsc, Download, UserPlus,
  Calendar, Clock, Award, ChevronRight, ExternalLink,
  Shield, Star, TrendingUp, Activity
} from 'lucide-react';
import { useUsers, UserWithRole } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { usePositions } from '@/hooks/usePositions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EmployeeHubTabProps {
  departmentId: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-gradient-to-r from-red-500 to-rose-600', text: 'text-white', border: 'border-red-500' },
  admin: { bg: 'bg-gradient-to-r from-purple-500 to-violet-600', text: 'text-white', border: 'border-purple-500' },
  director: { bg: 'bg-gradient-to-r from-blue-500 to-indigo-600', text: 'text-white', border: 'border-blue-500' },
  manager: { bg: 'bg-gradient-to-r from-cyan-500 to-teal-600', text: 'text-white', border: 'border-cyan-500' },
  supervisor: { bg: 'bg-gradient-to-r from-amber-500 to-orange-600', text: 'text-white', border: 'border-amber-500' },
  staff: { bg: 'bg-gradient-to-r from-emerald-500 to-green-600', text: 'text-white', border: 'border-emerald-500' },
};

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-600',
];

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function EmployeeCard({ user, onView, departments }: { 
  user: UserWithRole; 
  onView: (user: UserWithRole) => void;
  departments: Array<{ id: string; name: string }>;
}) {
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email.slice(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(user.full_name || user.email);
  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.staff;
  const deptName = departments.find(d => d.id === user.department_id)?.name || 'No Department';

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className={cn("h-1", roleStyle.bg)} />
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-offset-2 ring-slate-200 dark:ring-slate-700">
            <AvatarImage src={undefined} />
            <AvatarFallback className={cn("text-white font-semibold bg-gradient-to-br", avatarColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{user.full_name || 'Unnamed'}</h3>
              <Badge className={cn("text-xs px-2 py-0.5", roleStyle.bg, roleStyle.text)}>
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">{deptName}</span>
            </div>
          </div>

          <Button 
            size="icon" 
            variant="ghost" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onView(user)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeListItem({ user, onView, departments }: { 
  user: UserWithRole; 
  onView: (user: UserWithRole) => void;
  departments: Array<{ id: string; name: string }>;
}) {
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email.slice(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(user.full_name || user.email);
  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.staff;
  const deptName = departments.find(d => d.id === user.department_id)?.name || 'No Department';

  return (
    <div 
      className="flex items-center gap-4 p-4 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer group"
      onClick={() => onView(user)}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className={cn("text-white text-sm bg-gradient-to-br", avatarColor)}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0 grid grid-cols-4 gap-4 items-center">
        <div>
          <p className="font-medium truncate">{user.full_name || 'Unnamed'}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm truncate">{deptName}</span>
        </div>
        
        <div>
          <Badge className={cn("text-xs", roleStyle.bg, roleStyle.text)}>
            {user.role.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function EmployeeProfileDialog({ user, open, onClose, departments }: {
  user: UserWithRole | null;
  open: boolean;
  onClose: () => void;
  departments: Array<{ id: string; name: string }>;
}) {
  if (!user) return null;

  const initials = user.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email.slice(0, 2).toUpperCase();
  const avatarColor = getAvatarColor(user.full_name || user.email);
  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.staff;
  const deptName = departments.find(d => d.id === user.department_id)?.name || 'No Department';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        {/* Profile Header */}
        <div className="relative">
          <div className={cn("absolute inset-x-0 top-0 h-24 rounded-t-lg", roleStyle.bg)} />
          <div className="relative pt-12 px-6 pb-4">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 ring-4 ring-white dark:ring-slate-900 shadow-xl">
                <AvatarFallback className={cn("text-3xl text-white bg-gradient-to-br", avatarColor)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <h2 className="text-2xl font-bold">{user.full_name || 'Unnamed'}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <Badge className={cn("mb-2", roleStyle.bg, roleStyle.text)}>
                {user.role.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Profile Details */}
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{deptName}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Employee ID</Label>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{user.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Joined</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(user.created_at), 'MMMM d, yyyy')}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 mx-auto text-violet-500 mb-2" />
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Leave Days Used</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto text-amber-500 mb-2" />
                <p className="text-2xl font-bold">98%</p>
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">4.5</p>
                <p className="text-xs text-muted-foreground">Performance Score</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EmployeeHubTab({ departmentId }: EmployeeHubTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  const { users, loading } = useUsers();
  const { departments } = useDepartments();
  const { positions } = usePositions();

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartment = departmentFilter === 'all' || user.department_id === departmentFilter;
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesDepartment && matchesRole;
    });
  }, [users, searchTerm, departmentFilter, roleFilter]);

  const stats = useMemo(() => {
    const byRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byDepartment = users.reduce((acc, user) => {
      const deptId = user.department_id || 'none';
      acc[deptId] = (acc[deptId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { byRole, byDepartment };
  }, [users]);

  const handleViewProfile = (user: UserWithRole) => {
    setSelectedUser(user);
    setProfileDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Departments</p>
                <p className="text-3xl font-bold">{departments.length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Managers</p>
                <p className="text-3xl font-bold">{stats.byRole.manager || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <UserCog className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="text-3xl font-bold">{positions.filter(p => p.is_active).length}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <Shield className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredUsers.length}</span> of{' '}
          <span className="font-medium text-foreground">{users.length}</span> employees
        </p>
      </div>

      {/* Employee Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredUsers.map(user => (
            <EmployeeCard 
              key={user.id} 
              user={user} 
              onView={handleViewProfile}
              departments={departments}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-2">
            <div className="divide-y">
              {filteredUsers.map(user => (
                <EmployeeListItem 
                  key={user.id} 
                  user={user} 
                  onView={handleViewProfile}
                  departments={departments}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Dialog */}
      <EmployeeProfileDialog
        user={selectedUser}
        open={profileDialogOpen}
        onClose={() => {
          setProfileDialogOpen(false);
          setSelectedUser(null);
        }}
        departments={departments}
      />
    </div>
  );
}
