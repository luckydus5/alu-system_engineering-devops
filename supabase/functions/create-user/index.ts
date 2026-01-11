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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a client with the user's token to verify them
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the JWT and get claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestingUserId = claimsData.claims.sub as string;
    console.log('Requesting user ID:', requestingUserId);

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if requesting user is admin or super_admin and get their department
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, department_id')
      .eq('user_id', requestingUserId);

    if (roleError) {
      console.error('Error fetching roles:', roleError);
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

    // Get request body
    const { email, password, fullName, role, departmentId } = await req.json();

    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate role assignment - admins cannot create admin or super_admin
    if (!isSuperAdmin && (role === 'admin' || role === 'super_admin')) {
      return new Response(JSON.stringify({ error: 'You cannot assign admin or super_admin roles' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate department assignment - admins can only create users in their department
    if (!isSuperAdmin && departmentId && departmentId !== adminDepartmentId) {
      return new Response(JSON.stringify({ error: 'You can only create users in your department' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For non-super admins, force the department to be their own
    const finalDepartmentId = isSuperAdmin ? departmentId : (adminDepartmentId || departmentId);

    console.log('Creating user:', email, 'with role:', role, 'department:', finalDepartmentId);

    // Create the user using admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = userData.user.id;

    // Update the user's role (the trigger creates a default staff role)
    const { error: updateRoleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role, department_id: finalDepartmentId || null })
      .eq('user_id', newUserId);

    if (updateRoleError) {
      console.error('Error updating role:', updateRoleError);
    }

    // Update the profile with department
    if (finalDepartmentId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ department_id: finalDepartmentId })
        .eq('id', newUserId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
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