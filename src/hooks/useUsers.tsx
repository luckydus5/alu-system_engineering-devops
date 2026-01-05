import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/hooks/useUserRole';

export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
  department_name: string | null;
  role: AppRole;
  role_id: string;
  created_at: string;
}

export function useUsers() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles with their roles and departments
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          department_id,
          created_at,
          departments (name)
        `);

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role, department_id');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          department_id: profile.department_id || userRole?.department_id || null,
          department_name: profile.departments?.name || null,
          role: userRole?.role || 'staff',
          role_id: userRole?.id || '',
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUser = async (
    userId: string,
    updates: { role?: AppRole; departmentId?: string | null; fullName?: string }
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update',
          userId,
          ...updates,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await fetchUsers();
      return { error: null };
    } catch (err) {
      console.error('Error updating user:', err);
      return { error: err instanceof Error ? err : new Error('Failed to update user') };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'delete',
          userId,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      await fetchUsers();
      return { error: null };
    } catch (err) {
      console.error('Error deleting user:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete user') };
    }
  };

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    updateUser,
    deleteUser,
  };
}
