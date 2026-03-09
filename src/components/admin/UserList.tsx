import { useState, useRef } from 'react';
import { useUsers, UserWithRole } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { usePositions } from '@/hooks/usePositions';
import { AppRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLeaveApprovers } from '@/hooks/useLeaveApprovers';
import { supabase } from '@/integrations/supabase/client';
import { SYSTEM_POSITIONS, POSITION_LABELS, POSITION_COLORS } from '@/lib/systemPositions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Trash2, Users, Loader2, RefreshCw, Building2, KeyRound, Briefcase, Plus, Check } from 'lucide-react';
import { DepartmentAccessDialog } from './DepartmentAccessDialog';
import { SetPasswordDialog } from './SetPasswordDialog';

const roleColors: Record<AppRole, string> = {
  super_admin: 'bg-purple-700 text-white',
  admin: 'bg-destructive text-destructive-foreground',
  director: 'bg-primary text-primary-foreground',
  manager: 'bg-blue-600 text-white',
  supervisor: 'bg-amber-500 text-white',
  staff: 'bg-secondary text-secondary-foreground',
};

const roles: { value: AppRole; label: string }[] = [
  { value: 'staff', label: 'Staff' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

interface UserListProps {
  adminDepartmentId?: string | null;
  isSuperAdmin?: boolean;
}

export function UserList({ adminDepartmentId, isSuperAdmin = false }: UserListProps) {
  const { users, loading, refetch, updateUser, deleteUser } = useUsers();
  const { departments } = useDepartments();
  const { positions, activePositions, createPosition } = usePositions();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { approvers } = useLeaveApprovers();

  // Build a map of user_id -> approver_role for display
  const approverMap = new Map(approvers.map(a => [a.user_id, a.approver_role]));

  // Filter users based on admin's department access
  const filteredUsers = adminDepartmentId
    ? users.filter((u) => u.department_id === adminDepartmentId && u.role !== 'super_admin')
    : users;

  // Helper to check if current user (admin) can manage the target user
  const canManageUser = (user: UserWithRole): boolean => {
    if (isSuperAdmin) return true;
    if (user.role === 'super_admin' || user.role === 'admin') return false;
    if (adminDepartmentId && user.department_id !== adminDepartmentId) return false;
    return true;
  };

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithRole | null>(null);
  const [accessUser, setAccessUser] = useState<UserWithRole | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'staff' as AppRole,
    departmentId: '',
    systemPosition: '',
    positionId: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [isCreatingPosition, setIsCreatingPosition] = useState(false);
  const [showNewPositionInput, setShowNewPositionInput] = useState(false);
  const newPositionInputRef = useRef<HTMLInputElement>(null);

  // Map of userId -> position name for display in table
  const positionNameMap = new Map(positions.map(p => [p.id, p.name]));

  const handleCreatePosition = async () => {
    if (!newPositionName.trim()) return;
    setIsCreatingPosition(true);
    const result = await createPosition.mutateAsync({ name: newPositionName.trim(), level: 1 });
    if (result?.id) {
      setEditForm(prev => ({ ...prev, positionId: result.id }));
    }
    setNewPositionName('');
    setShowNewPositionInput(false);
    setIsCreatingPosition(false);
  };

  const handleEditClick = async (user: UserWithRole) => {
    // Fetch current position_id from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('position_id')
      .eq('id', user.id)
      .single();

    setEditingUser(user);
    setEditForm({
      fullName: user.full_name || '',
      role: user.role,
      departmentId: user.department_id || '',
      systemPosition: approverMap.get(user.id) || '',
      positionId: profile?.position_id || '',
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setIsUpdating(true);

    // Update position_id on profile directly (not through edge function)
    await supabase
      .from('profiles')
      .update({ position_id: editForm.positionId || null })
      .eq('id', editingUser.id);

    const { error } = await updateUser(editingUser.id, {
      fullName: editForm.fullName,
      role: editForm.role,
      departmentId: editForm.departmentId || null,
      systemPosition: editForm.systemPosition || null,
    });

    setIsUpdating(false);

    if (error) {
      toast({
        title: 'Failed to update user',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'User updated',
        description: `${editForm.fullName} has been updated successfully.`,
      });
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    const { error } = await deleteUser(deletingUser.id);

    setIsDeleting(false);

    if (error) {
      toast({
        title: 'Failed to delete user',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'User deleted',
        description: `${deletingUser.full_name || deletingUser.email} has been removed.`,
      });
      setDeletingUser(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {adminDepartmentId ? 'Department Users' : 'All Users'} ({filteredUsers.length})
            </CardTitle>
            <CardDescription>
              Manage user accounts, roles, department assignments and job positions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Job Position</TableHead>
                  <TableHead>System Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No users found in {adminDepartmentId ? 'your department' : 'the system'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || '-'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role]}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {/* Job position from positions table — shown as job title */}
                        <span className="text-xs text-muted-foreground">—</span>
                      </TableCell>
                      <TableCell>
                        {approverMap.has(user.id) ? (
                          <Badge variant="outline" className={`text-xs ${POSITION_COLORS[approverMap.get(user.id)!] || 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'}`}>
                            {POSITION_LABELS[approverMap.get(user.id)!] || approverMap.get(user.id)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{user.department_name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {isSuperAdmin && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setResetPasswordUser(user)}
                                title="Reset user password"
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAccessUser(user)}
                                title="Manage department access"
                              >
                                <Building2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {canManageUser(user) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(user)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingUser(user)}
                                disabled={user.id === currentUser?.id}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {!canManageUser(user) && !isSuperAdmin && (
                            <span className="text-xs text-muted-foreground px-2">
                              No access
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) { setEditingUser(null); setShowNewPositionInput(false); setNewPositionName(''); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information, role, department assignment, and job position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                value={editForm.fullName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={editForm.role}
                onValueChange={(value: AppRole) => setEditForm((prev) => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles
                    .filter(role => isSuperAdmin || !['admin', 'super_admin'].includes(role.value))
                    .map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department — super admins can assign any department */}
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select
                value={editForm.departmentId || 'none'}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, departmentId: value === 'none' ? '' : value }))}
                disabled={!isSuperAdmin && !!adminDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {(isSuperAdmin
                    ? departments
                    : departments.filter(d => d.id === adminDepartmentId)
                  ).map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isSuperAdmin && adminDepartmentId && (
                <p className="text-xs text-muted-foreground">
                  You can only manage users in your assigned department.
                </p>
              )}
            </div>

            {/* Job Position — assign from positions table with inline create */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />
                Job Position
              </Label>
              <Select
                value={editForm.positionId || 'none'}
                onValueChange={(value) => {
                  if (value === '__create__') {
                    setShowNewPositionInput(true);
                    setTimeout(() => newPositionInputRef.current?.focus(), 50);
                  } else {
                    setEditForm((prev) => ({ ...prev, positionId: value === 'none' ? '' : value }));
                    setShowNewPositionInput(false);
                  }
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="No position assigned" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="none">— No position assigned —</SelectItem>
                  {activePositions.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      <span className="flex items-center gap-2">
                        {editForm.positionId === pos.id && <Check className="h-3 w-3 text-primary" />}
                        {pos.name}
                        {pos.department?.name ? (
                          <span className="text-muted-foreground text-xs">· {pos.department.name}</span>
                        ) : null}
                      </span>
                    </SelectItem>
                  ))}
                  {/* Inline create option */}
                  <div className="border-t mt-1 pt-1 px-2 pb-1">
                    {!showNewPositionInput ? (
                      <button
                        type="button"
                        className="flex items-center gap-2 w-full text-sm text-primary hover:text-primary/80 py-1.5 px-1 rounded hover:bg-primary/5 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowNewPositionInput(true);
                          setTimeout(() => newPositionInputRef.current?.focus(), 50);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create new position
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 pt-1" onMouseDown={(e) => e.stopPropagation()}>
                        <Input
                          ref={newPositionInputRef}
                          value={newPositionName}
                          onChange={(e) => setNewPositionName(e.target.value)}
                          placeholder="Position name..."
                          className="h-7 text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleCreatePosition(); }
                            if (e.key === 'Escape') { setShowNewPositionInput(false); setNewPositionName(''); }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 shrink-0"
                          disabled={!newPositionName.trim() || isCreatingPosition}
                          onMouseDown={(e) => { e.preventDefault(); handleCreatePosition(); }}
                        >
                          {isCreatingPosition ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>


            {/* System Position — only for super admins (leave workflow roles) */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="edit-syspos">System Position</Label>
                <Select
                  value={editForm.systemPosition || 'none'}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, systemPosition: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No special position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No special position</SelectItem>
                    {SYSTEM_POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Assigns a leave approval role. Only one user per position.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deletingUser?.full_name || deletingUser?.email}</strong>? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Department Access Dialog */}
      {isSuperAdmin && (
        <DepartmentAccessDialog
          user={accessUser}
          open={!!accessUser}
          onOpenChange={() => setAccessUser(null)}
          onSuccess={refetch}
        />
      )}

      {/* Set Password Dialog */}
      {isSuperAdmin && (
        <SetPasswordDialog
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          onOpenChange={() => setResetPasswordUser(null)}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
