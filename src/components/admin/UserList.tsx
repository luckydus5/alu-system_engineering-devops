import { useState } from 'react';
import { useUsers, UserWithRole } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { AppRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
import { Pencil, Trash2, Users, Loader2, RefreshCw, Building2, KeyRound } from 'lucide-react';
import { DepartmentAccessDialog } from './DepartmentAccessDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';

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
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // Filter users based on admin's department access
  // Admins can only see users in their department, and cannot see super_admins
  const filteredUsers = adminDepartmentId 
    ? users.filter((u) => u.department_id === adminDepartmentId && u.role !== 'super_admin')
    : users;

  // Helper to check if current user (admin) can manage the target user
  const canManageUser = (user: UserWithRole): boolean => {
    if (isSuperAdmin) return true;
    // Admins cannot manage super_admins or other admins
    if (user.role === 'super_admin' || user.role === 'admin') return false;
    // Admins can only manage users in their department
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
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditClick = (user: UserWithRole) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.full_name || '',
      role: user.role,
      departmentId: user.department_id || '',
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    setIsUpdating(true);
    const { error } = await updateUser(editingUser.id, {
      fullName: editForm.fullName,
      role: editForm.role,
      departmentId: editForm.departmentId || null,
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
              Manage user accounts, roles, and department assignments
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
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information, role, and department assignment.
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
                  {isSuperAdmin && <SelectItem value="none">No department</SelectItem>}
                  {(isSuperAdmin ? departments : departments.filter(d => d.id === adminDepartmentId)).map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isSuperAdmin && (
                <p className="text-xs text-muted-foreground">
                  You can only manage users in your assigned department.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
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

      {/* Reset Password Dialog */}
      {isSuperAdmin && (
        <ResetPasswordDialog
          user={resetPasswordUser}
          open={!!resetPasswordUser}
          onOpenChange={() => setResetPasswordUser(null)}
          onSuccess={refetch}
        />
      )}
    </>
  );
}
