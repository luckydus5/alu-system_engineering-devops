import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DepartmentMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_primary: boolean; // true if this is their primary dept, false if granted access
}

export function useDepartmentMembers(departmentId?: string) {
  const [members, setMembers] = useState<DepartmentMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!departmentId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const fetchMembers = async () => {
      setLoading(true);
      try {
        // Fetch users with this as their primary department (via user_roles)
        const { data: primaryMembers, error: primaryError } = await supabase
          .from('user_roles')
          .select(`
            user_id,
            role,
            profiles!inner (
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .eq('department_id', departmentId);

        if (primaryError) throw primaryError;

        // Fetch users with granted access to this department
        const { data: grantedMembers, error: grantedError } = await supabase
          .from('user_department_access')
          .select(`
            user_id,
            profiles!inner (
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .eq('department_id', departmentId);

        if (grantedError) throw grantedError;

        // Get roles for granted members
        const grantedUserIds = (grantedMembers || []).map(m => m.user_id);
        let grantedRoles: { user_id: string; role: string }[] = [];
        
        if (grantedUserIds.length > 0) {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', grantedUserIds);
          grantedRoles = rolesData || [];
        }

        // Combine and deduplicate
        const memberMap = new Map<string, DepartmentMember>();

        // Add primary members
        (primaryMembers || []).forEach((m: any) => {
          const profile = m.profiles;
          memberMap.set(profile.id, {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            role: m.role,
            is_primary: true,
          });
        });

        // Add granted members (if not already primary)
        (grantedMembers || []).forEach((m: any) => {
          const profile = m.profiles;
          if (!memberMap.has(profile.id)) {
            const userRole = grantedRoles.find(r => r.user_id === m.user_id);
            memberMap.set(profile.id, {
              id: profile.id,
              email: profile.email,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              role: userRole?.role || 'staff',
              is_primary: false,
            });
          }
        });

        setMembers(Array.from(memberMap.values()));
      } catch (error) {
        console.error('Error fetching department members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [departmentId]);

  return { members, loading, count: members.length };
}
