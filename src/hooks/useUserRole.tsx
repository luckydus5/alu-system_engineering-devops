import { useState, useEffect, useRef, useCallback } from 'react';
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

// Global cache for user role data - persists across hook instances
interface UserRoleCache {
  userId: string;
  roles: UserRole[];
  profile: Profile | null;
  highestRole: AppRole;
  grantedDepartmentIds: string[];
  timestamp: number;
}

let globalUserRoleCache: UserRoleCache | null = null;
const ROLE_CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache for roles

// Helper to check if cache is valid for a user
const isCacheValid = (userId: string | undefined): boolean => {
  return !!(globalUserRoleCache && userId && globalUserRoleCache.userId === userId);
};

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>(() => 
    isCacheValid(user?.id) ? globalUserRoleCache!.roles : []
  );
  const [profile, setProfile] = useState<Profile | null>(() =>
    isCacheValid(user?.id) ? globalUserRoleCache!.profile : null
  );
  const [loading, setLoading] = useState(() => 
    !isCacheValid(user?.id)
  );
  const [highestRole, setHighestRole] = useState<AppRole>(() =>
    isCacheValid(user?.id) ? globalUserRoleCache!.highestRole : 'staff'
  );
  const [grantedDepartmentIds, setGrantedDepartmentIds] = useState<string[]>(() =>
    isCacheValid(user?.id) ? globalUserRoleCache!.grantedDepartmentIds : []
  );
  
  const fetchInProgress = useRef(false);
  const lastUserId = useRef<string | null>(null);

  const fetchUserData = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setRoles([]);
      setProfile(null);
      setHighestRole('staff');
      setGrantedDepartmentIds([]);
      setLoading(false);
      return;
    }

    // Check cache first
    if (!forceRefresh && globalUserRoleCache && 
        globalUserRoleCache.userId === user.id && 
        Date.now() - globalUserRoleCache.timestamp < ROLE_CACHE_TTL) {
      setRoles(globalUserRoleCache.roles);
      setProfile(globalUserRoleCache.profile);
      setHighestRole(globalUserRoleCache.highestRole);
      setGrantedDepartmentIds(globalUserRoleCache.grantedDepartmentIds);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchInProgress.current && !forceRefresh) {
      return;
    }

    try {
      fetchInProgress.current = true;
      // Don't show loading if we have cached data
      if (!globalUserRoleCache || globalUserRoleCache.userId !== user.id) {
        setLoading(true);
      }

      // Fetch all data in parallel
      const [rolesResult, profileResult, accessResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('id, role, department_id')
          .eq('user_id', user.id),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('user_department_access')
          .select('department_id')
          .eq('user_id', user.id)
      ]);

      if (rolesResult.error) throw rolesResult.error;
      if (profileResult.error) throw profileResult.error;
      if (accessResult.error) throw accessResult.error;

      const typedRoles: UserRole[] = (rolesResult.data || []).map(r => ({
        ...r,
        role: r.role as AppRole
      }));

      // Determine highest role
      const roleHierarchy: AppRole[] = ['admin', 'director', 'manager', 'supervisor', 'staff'];
      const highest = roleHierarchy.find(role => 
        typedRoles.some(r => r.role === role)
      ) || 'staff';

      const grantedIds = (accessResult.data || []).map(a => a.department_id);

      // Update cache
      globalUserRoleCache = {
        userId: user.id,
        roles: typedRoles,
        profile: profileResult.data,
        highestRole: highest,
        grantedDepartmentIds: grantedIds,
        timestamp: Date.now(),
      };

      setRoles(typedRoles);
      setProfile(profileResult.data);
      setHighestRole(highest);
      setGrantedDepartmentIds(grantedIds);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [user]);

  useEffect(() => {
    // Only fetch if user changed or no cached data
    if (user?.id !== lastUserId.current) {
      lastUserId.current = user?.id || null;
      fetchUserData();
    } else if (user && roles.length === 0) {
      fetchUserData();
    }
  }, [user, fetchUserData, roles.length]);

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
    refetch: () => fetchUserData(true),
  };
}
