import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a client with the user's token to validate JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate the JWT and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;
    console.log('Requesting user ID:', requestingUserId);

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get requesting user's profile info for audit logging
    const { data: requestingUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', requestingUserId)
      .single();
    
    const adminName = requestingUserProfile?.full_name || requestingUserProfile?.email || 'Admin';
    const adminEmail = requestingUserProfile?.email || 'admin@system';

    // Check if requesting user is admin or super_admin and get their department
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, department_id')
      .eq('user_id', requestingUserId);

    if (roleError) {
      console.error('Error fetching roles:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify privileges' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const roles = roleRows || [];
    const isSuperAdmin = roles.some((r: { role: string }) => r.role === 'super_admin');
    const isAdmin = roles.some((r: { role: string }) => r.role === 'admin');
    const adminDepartmentId = roles.find((r: { role: string; department_id: string | null }) => 
      r.role === 'admin' || r.role === 'super_admin'
    )?.department_id;

    if (!isSuperAdmin && !isAdmin) {
      console.log('Access denied for user:', requestingUserId, 'Roles:', roles);
      return new Response(
        JSON.stringify({ error: 'Only admins can manage users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to log audit manually (since service role doesn't have auth context)
    const logAudit = async (params: {
      action: string;
      tableName: string;
      recordId: string;
      oldData?: unknown;
      newData?: unknown;
      departmentId?: string | null;
    }) => {
      try {
        await supabaseAdmin.from('audit_logs').insert({
          user_id: requestingUserId,
          user_name: adminName,
          user_email: adminEmail,
          action: params.action,
          table_name: params.tableName,
          record_id: params.recordId,
          old_data: params.oldData || null,
          new_data: params.newData || null,
          department_id: params.departmentId || null,
        });
      } catch (err) {
        console.error('Failed to log audit:', err);
      }
    };

    const { action, userId, role, departmentId, fullName, departmentIds } = await req.json();
    console.log(`Managing user: action=${action}, userId=${userId}, isSuperAdmin=${isSuperAdmin}`);

    // Helper function to check if admin can manage the target user
    const canManageUser = async (targetUserId: string): Promise<boolean> => {
      if (isSuperAdmin) return true;
      
      // Get target user's department
      const { data: targetRole } = await supabaseAdmin
        .from('user_roles')
        .select('department_id, role')
        .eq('user_id', targetUserId)
        .single();
      
      // Admin can only manage users in their department
      if (!targetRole || targetRole.department_id !== adminDepartmentId) {
        return false;
      }
      
      // Admin cannot manage other admins or super_admins
      if (targetRole.role === 'admin' || targetRole.role === 'super_admin') {
        return false;
      }
      
      return true;
    };

    // Helper to validate department assignment
    const canAssignDepartment = (deptId: string | null): boolean => {
      if (isSuperAdmin) return true;
      // Admins can only assign users to their own department
      return deptId === adminDepartmentId || deptId === null;
    };

    // Helper to validate role assignment
    const canAssignRole = (targetRole: string): boolean => {
      if (isSuperAdmin) return true;
      // Admins cannot assign admin or super_admin roles
      const restrictedRoles = ['admin', 'super_admin'];
      return !restrictedRoles.includes(targetRole);
    };

    if (action === 'update') {
      // Check if admin can manage this user
      if (!await canManageUser(userId)) {
        return new Response(
          JSON.stringify({ error: 'You can only manage users in your department' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate role assignment
      if (role && !canAssignRole(role)) {
        return new Response(
          JSON.stringify({ error: 'You cannot assign admin or super_admin roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate department assignment
      if (!canAssignDepartment(departmentId)) {
        return new Response(
          JSON.stringify({ error: 'You can only assign users to your department' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the target user's info for better audit logging
      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      const targetUserName = targetProfile?.full_name || targetProfile?.email || userId;

      // Get old role data for audit
      const { data: oldRoleData } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Update user profile
      if (fullName !== undefined) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            full_name: fullName,
            department_id: departmentId || null,
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw profileError;
        }
      }

      // Update user role
      if (role) {
        const { error: roleUpdateError } = await supabaseAdmin
          .from('user_roles')
          .update({ 
            role,
            department_id: departmentId || null,
          })
          .eq('user_id', userId);

        if (roleUpdateError) {
          console.error('Error updating role:', roleUpdateError);
          throw roleUpdateError;
        }

        // Get new role data for audit
        const { data: newRoleData } = await supabaseAdmin
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .single();

        // Log the role update with proper admin info
        await logAudit({
          action: 'UPDATE',
          tableName: 'user_roles',
          recordId: newRoleData?.id || userId,
          oldData: { ...oldRoleData, affected_user: targetUserName },
          newData: { ...newRoleData, affected_user: targetUserName },
          departmentId: departmentId || oldRoleData?.department_id,
        });
      }

      console.log('User updated successfully:', userId);
      return new Response(
        JSON.stringify({ success: true, message: 'User updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      // Prevent self-deletion
      if (userId === requestingUserId) {
        return new Response(
          JSON.stringify({ error: 'You cannot delete your own account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if admin can manage this user
      if (!await canManageUser(userId)) {
        return new Response(
          JSON.stringify({ error: 'You can only delete users in your department' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete user from auth (this will cascade to profiles and roles due to foreign keys)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        throw deleteError;
      }

      console.log('User deleted successfully:', userId);
      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Grant additional department access - SUPER ADMIN ONLY
    if (action === 'grant_department_access') {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only super admins can grant department access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: grantError } = await supabaseAdmin
        .from('user_department_access')
        .insert({
          user_id: userId,
          department_id: departmentId,
          granted_by: requestingUserId,
        });

      if (grantError) {
        if (grantError.code === '23505') {
          return new Response(
            JSON.stringify({ error: 'User already has access to this department' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('Error granting department access:', grantError);
        throw grantError;
      }

      console.log('Department access granted:', userId, departmentId);
      return new Response(
        JSON.stringify({ success: true, message: 'Department access granted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Revoke department access - SUPER ADMIN ONLY
    if (action === 'revoke_department_access') {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only super admins can revoke department access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: revokeError } = await supabaseAdmin
        .from('user_department_access')
        .delete()
        .eq('user_id', userId)
        .eq('department_id', departmentId);

      if (revokeError) {
        console.error('Error revoking department access:', revokeError);
        throw revokeError;
      }

      console.log('Department access revoked:', userId, departmentId);
      return new Response(
        JSON.stringify({ success: true, message: 'Department access revoked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update multiple department accesses at once - SUPER ADMIN ONLY
    if (action === 'update_department_access') {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only super admins can update department access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // First, remove all existing additional access
      const { error: deleteError } = await supabaseAdmin
        .from('user_department_access')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error clearing department access:', deleteError);
        throw deleteError;
      }

      // Then add the new ones
      if (departmentIds && departmentIds.length > 0) {
        const accessRecords = departmentIds.map((deptId: string) => ({
          user_id: userId,
          department_id: deptId,
          granted_by: requestingUserId,
        }));

        const { error: insertError } = await supabaseAdmin
          .from('user_department_access')
          .insert(accessRecords);

        if (insertError) {
          console.error('Error inserting department access:', insertError);
          throw insertError;
        }
      }

      console.log('Department access updated:', userId, departmentIds);
      return new Response(
        JSON.stringify({ success: true, message: 'Department access updated' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in manage-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});