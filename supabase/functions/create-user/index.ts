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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestingUserId = claimsData.claims.sub as string;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, department_id')
      .eq('user_id', requestingUserId);

    if (roleError) {
      return new Response(JSON.stringify({ error: 'Failed to verify privileges' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const roles = roleRows || [];
    const isSuperAdmin = roles.some((r: { role: string }) => r.role === 'super_admin');
    const isAdmin = roles.some((r: { role: string }) => r.role === 'admin');
    const adminDepartmentId = roles.find((r: { role: string; department_id: string | null }) => 
      r.role === 'admin' || r.role === 'super_admin'
    )?.department_id;

    if (!isSuperAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, fullName, role, departmentId, systemPosition } = await req.json();

    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isSuperAdmin && (role === 'admin' || role === 'super_admin')) {
      return new Response(JSON.stringify({ error: 'You cannot assign admin or super_admin roles' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isSuperAdmin && departmentId && departmentId !== adminDepartmentId) {
      return new Response(JSON.stringify({ error: 'You can only create users in your department' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only super admins can assign system positions
    if (systemPosition && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Only super admins can assign system positions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const finalDepartmentId = isSuperAdmin ? departmentId : (adminDepartmentId || departmentId);

    console.log('Creating user:', email, 'with role:', role, 'department:', finalDepartmentId, 'position:', systemPosition);

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = userData.user.id;

    // Update role
    const { error: updateRoleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role, department_id: finalDepartmentId || null })
      .eq('user_id', newUserId);

    if (updateRoleError) {
      console.error('Error updating role:', updateRoleError);
    }

    // Update profile with department
    if (finalDepartmentId) {
      await supabaseAdmin
        .from('profiles')
        .update({ department_id: finalDepartmentId })
        .eq('id', newUserId);
    }

    // Assign system position (leave approver role) if provided
    if (systemPosition) {
      // First deactivate any existing user with this position
      await supabaseAdmin
        .from('leave_approvers')
        .update({ is_active: false })
        .eq('approver_role', systemPosition)
        .eq('is_active', true);

      // Assign the position to the new user
      const { error: approverError } = await supabaseAdmin
        .from('leave_approvers')
        .upsert({
          user_id: newUserId,
          approver_role: systemPosition,
          granted_by: requestingUserId,
          is_active: true,
        }, { onConflict: 'user_id,approver_role' });

      if (approverError) {
        console.error('Error assigning system position:', approverError);
      } else {
        console.log('System position assigned:', systemPosition, 'to user:', newUserId);
      }
    }

    console.log('User created successfully:', newUserId);

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: newUserId, email } 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
