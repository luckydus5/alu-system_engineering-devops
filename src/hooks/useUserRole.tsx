import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'staff' | 'supervisor' | 'manager' | 'director' | 'admin';

interface UserRole {
  id: string;
  role: AppRole;
  department_id: string | null;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  department_id: string | null;
  phone: string | null;
}

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [highestRole, setHighestRole] = useState<AppRole>('staff');
  const [grantedDepartmentIds, setGrantedDepartmentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setProfile(null);
      setHighestRole('staff');
      setGrantedDepartmentIds([]);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      setLoading(true);
      try {
        // Fetch user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('id, role, department_id')
          .eq('user_id', user.id);

        if (rolesError) throw rolesError;

        const typedRoles: UserRole[] = (rolesData || []).map(r => ({
          ...r,
          role: r.role as AppRole
        }));
        setRoles(typedRoles);

        // Determine highest role
        const roleHierarchy: AppRole[] = ['admin', 'director', 'manager', 'supervisor', 'staff'];
        const highest = roleHierarchy.find(role => 
          typedRoles.some(r => r.role === role)
        ) || 'staff';
        setHighestRole(highest);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch granted department access
        const { data: accessData, error: accessError } = await supabase
          .from('user_department_access')
          .select('department_id')
          .eq('user_id', user.id);

        if (accessError) throw accessError;
        setGrantedDepartmentIds((accessData || []).map(a => a.department_id));
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const hasRole = (role: AppRole): boolean => {
    return roles.some(r => r.role === role);
  };

  const hasMinRole = (minRole: AppRole): boolean => {
    const roleHierarchy: AppRole[] = ['staff', 'supervisor', 'manager', 'director', 'admin'];
    const minIndex = roleHierarchy.indexOf(minRole);
    const userIndex = roleHierarchy.indexOf(highestRole);
    return userIndex >= minIndex;
  };

  const isInDepartment = (departmentId: string): boolean => {
    // Check both user_roles department and granted department access
    return roles.some(r => r.department_id === departmentId) || 
           grantedDepartmentIds.includes(departmentId);
  };

  return {
    roles,
    profile,
    loading,
    highestRole,
    hasRole,
    hasMinRole,
    isInDepartment,
    grantedDepartmentIds,
  };
}
