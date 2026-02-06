import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, Users, Mail, Building, Edit2, 
  Briefcase, UserCog, Loader2, RefreshCw
} from 'lucide-react';
import { useUsers, UserWithRole } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { usePositions } from '@/hooks/usePositions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: 'bg-red-500/20', text: 'text-red-600' },
  admin: { bg: 'bg-purple-500/20', text: 'text-purple-600' },
  director: { bg: 'bg-blue-500/20', text: 'text-blue-600' },
  manager: { bg: 'bg-cyan-500/20', text: 'text-cyan-600' },
  supervisor: { bg: 'bg-amber-500/20', text: 'text-amber-600' },
  staff: { bg: 'bg-emerald-500/20', text: 'text-emerald-600' },
};

export function EmployeeDirectoryTab() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editPositionId, setEditPositionId] = useState<string>('');
  const [editFullName, setEditFullName] = useState('');
  const [saving, setSaving] = useState(false);

  const { users, loading: usersLoading, refetch } = useUsers();
  const { departments, loading: depsLoading } = useDepartments();
  const { activePositions, isLoading: positionsLoading } = usePositions();

  const isLoading = usersLoading || depsLoading || positionsLoading;

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || 
      user.department_id === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'No Department';
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'Unknown';
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const openEditDialog = (user: UserWithRole) => {
    setEditingUser(user);
    setEditFullName(user.full_name || '');
    setEditPositionId('');
    setEditDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      const updates: { full_name?: string; position_id?: string | null } = {};
      
      if (editFullName !== editingUser.full_name) {
        updates.full_name = editFullName;
      }
      if (editPositionId) {
        updates.position_id = editPositionId === 'none' ? null : editPositionId;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editingUser.id);

        if (error) throw error;
      }

      toast({ title: 'Employee updated successfully' });
      setEditDialogOpen(false);
      refetch();
    } catch (error) {
      toast({ 
        title: 'Failed to update employee', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Employee Directory
            <Badge variant="secondary" className="ml-2">{users.length} employees</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Building className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employee Grid */}
          <ScrollArea className="h-[550px]">
            <div className="grid gap-3">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-lg font-medium text-muted-foreground">No employees found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                        <AvatarFallback className={cn(
                          "font-semibold text-lg",
                          ROLE_STYLES[user.role]?.bg || 'bg-muted',
                          ROLE_STYLES[user.role]?.text || 'text-muted-foreground'
                        )}>
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground truncate">
                              {user.full_name || user.email}
                            </p>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                              <Mail className="h-3.5 w-3.5" />
                              <span className="truncate">{user.email}</span>
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => openEditDialog(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {user.role && (
                            <Badge className={cn(
                              "border-0 capitalize",
                              ROLE_STYLES[user.role]?.bg || 'bg-muted',
                              ROLE_STYLES[user.role]?.text || 'text-muted-foreground'
                            )}>
                              <UserCog className="h-3 w-3 mr-1" />
                              {user.role.replace('_', ' ')}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            <Building className="h-3 w-3 mr-1" />
                            {getDepartmentName(user.department_id)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-primary" />
              Edit Employee
            </DialogTitle>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-4 py-4">
              {/* User Info Display */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={cn(
                    ROLE_STYLES[editingUser.role]?.bg,
                    ROLE_STYLES[editingUser.role]?.text
                  )}>
                    {getInitials(editingUser.full_name, editingUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{editingUser.full_name || editingUser.email}</p>
                  <p className="text-sm text-muted-foreground truncate">{editingUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={editPositionId} onValueChange={setEditPositionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No position assigned</SelectItem>
                    {activePositions.map(position => (
                      <SelectItem key={position.id} value={position.id}>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5" />
                          {position.name}
                          <span className="text-xs text-muted-foreground">
                            (Level {position.level})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                <p><strong>Note:</strong> To change roles or department assignments, use the Admin panel.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
