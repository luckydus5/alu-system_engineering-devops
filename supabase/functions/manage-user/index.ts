import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestingUserId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: requestingUserProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', requestingUserId)
      .single();
    
    const adminName = requestingUserProfile?.full_name || requestingUserProfile?.email || 'Admin';
    const adminEmail = requestingUserProfile?.email || 'admin@system';

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, department_id')
      .eq('user_id', requestingUserId);

    if (roleError) {
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
      return new Response(
        JSON.stringify({ error: 'Only admins can manage users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { action, userId, role, departmentId, fullName, departmentIds, systemPosition } = await req.json();
    console.log(`Managing user: action=${action}, userId=${userId}, isSuperAdmin=${isSuperAdmin}, systemPosition=${systemPosition}`);

    const canManageUser = async (targetUserId: string): Promise<boolean> => {
      if (isSuperAdmin) return true;
      const { data: targetRole } = await supabaseAdmin
        .from('user_roles')
        .select('department_id, role')
        .eq('user_id', targetUserId)
        .single();
      if (!targetRole || targetRole.department_id !== adminDepartmentId) return false;
      if (targetRole.role === 'admin' || targetRole.role === 'super_admin') return false;
      return true;
    };

    const canAssignDepartment = (deptId: string | null): boolean => {
      if (isSuperAdmin) return true;
      return deptId === adminDepartmentId || deptId === null;
    };

    const canAssignRole = (targetRole: string): boolean => {
      if (isSuperAdmin) return true;
      return !['admin', 'super_admin'].includes(targetRole);
    };

    // Helper to sync system position (leave approver)
    const syncSystemPosition = async (targetUserId: string, position: string | null) => {
      if (!isSuperAdmin) return; // Only super admins can assign positions

      // Get current position for this user
      const { data: currentApprovers } = await supabaseAdmin
        .from('leave_approvers')
        .select('id, approver_role')
        .eq('user_id', targetUserId)
        .eq('is_active', true);

      const currentRole = currentApprovers?.[0]?.approver_role || null;

      // If position hasn't changed, do nothing
      if (currentRole === position) return;

      // Deactivate old position for this user
      if (currentRole) {
        await supabaseAdmin
          .from('leave_approvers')
          .update({ is_active: false })
          .eq('user_id', targetUserId)
          .eq('is_active', true);
      }

      // Assign new position
      if (position) {
        // Deactivate anyone else with this position
        await supabaseAdmin
          .from('leave_approvers')
          .update({ is_active: false })
          .eq('approver_role', position)
          .eq('is_active', true);

        // Assign to this user
        await supabaseAdmin
          .from('leave_approvers')
          .insert({
            user_id: targetUserId,
            approver_role: position,
            granted_by: requestingUserId,
            is_active: true,
          });

        console.log('System position assigned:', position, 'to user:', targetUserId);
      }
    };

    if (action === 'update') {
      if (!await canManageUser(userId)) {
        return new Response(
          JSON.stringify({ error: 'You can only manage users in your department' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (role && !canAssignRole(role)) {
        return new Response(
          JSON.stringify({ error: 'You cannot assign admin or super_admin roles' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!canAssignDepartment(departmentId)) {
        return new Response(
          JSON.stringify({ error: 'You can only assign users to your department' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: targetProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();
      const targetUserName = targetProfile?.full_name || targetProfile?.email || userId;

      const { data: oldRoleData } = await supabaseAdmin
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fullName !== undefined) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            full_name: fullName,
            department_id: departmentId || null,
          })
          .eq('id', userId);

        if (profileError) throw profileError;
      }

      if (role) {
        const { error: roleUpdateError } = await supabaseAdmin
          .from('user_roles')
          .update({ 
            role,
            department_id: departmentId || null,
          })
          .eq('user_id', userId);

        if (roleUpdateError) throw roleUpdateError;

        const { data: newRoleData } = await supabaseAdmin
          .from('user_roles')
          .select('*')
          .eq('user_id', userId)
          .single();

        await logAudit({
          action: 'UPDATE',
          tableName: 'user_roles',
          recordId: newRoleData?.id || userId,
          oldData: { ...oldRoleData, affected_user: targetUserName },
          newData: { ...newRoleData, affected_user: targetUserName },
          departmentId: departmentId || oldRoleData?.department_id,
        });
      }

      // Sync system position if provided
      if (systemPosition !== undefined) {
        await syncSystemPosition(userId, systemPosition);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User updated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'delete') {
      if (userId === requestingUserId) {
        return new Response(
          JSON.stringify({ error: 'You cannot delete your own account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!await canManageUser(userId)) {
        return new Response(
          JSON.stringify({ error: 'You can only delete users in your department' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deactivate any leave approver roles before deleting
      await supabaseAdmin
        .from('leave_approvers')
        .update({ is_active: false })
        .eq('user_id', userId);

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, message: 'User deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        throw grantError;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Department access granted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'revoke_department_access') {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only super admins can revoke department access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin
        .from('user_department_access')
        .delete()
        .eq('user_id', userId)
        .eq('department_id', departmentId);

      return new Response(
        JSON.stringify({ success: true, message: 'Department access revoked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update_department_access') {
      if (!isSuperAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only super admins can update department access' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin
        .from('user_department_access')
        .delete()
        .eq('user_id', userId);

      if (departmentIds && departmentIds.length > 0) {
        const accessRecords = departmentIds.map((deptId: string) => ({
          user_id: userId,
          department_id: deptId,
          granted_by: requestingUserId,
        }));

        const { error: insertError } = await supabaseAdmin
          .from('user_department_access')
          .insert(accessRecords);

        if (insertError) throw insertError;
      }

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
