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

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      console.log('Access denied for user:', requestingUserId, 'Role:', roleData?.role);
      return new Response(
        JSON.stringify({ error: 'Only administrators can manage users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, userId, role, departmentId, fullName, departmentIds } = await req.json();
    console.log(`Managing user: action=${action}, userId=${userId}`);

    if (action === 'update') {
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

    // Grant additional department access
    if (action === 'grant_department_access') {
      const { error: grantError } = await supabaseAdmin
        .from('user_department_access')
        .insert({
          user_id: userId,
          department_id: departmentId,
          granted_by: requestingUserId,
        });

      if (grantError) {
        // Check if it's a unique constraint violation
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

    // Revoke department access
    if (action === 'revoke_department_access') {
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

    // Update multiple department accesses at once
    if (action === 'update_department_access') {
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