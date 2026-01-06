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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a client with the user's token to verify them
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

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

    const requestingUserId = claimsData.claims.sub;
    console.log('Requesting user ID:', requestingUserId);

    // Create admin client for privileged operations (bypasses RLS)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    console.log('Service role key exists:', !!serviceRoleKey);
    console.log('Supabase URL:', supabaseUrl);
    
    const supabaseAdmin = createClient(
      supabaseUrl ?? '',
      serviceRoleKey ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if requesting user is admin using admin client (bypasses RLS)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .maybeSingle();

    console.log('Role data:', roleData, 'Role error:', roleError);

    if (roleError || !roleData || roleData.role !== 'admin') {
      console.log('Not admin - role is:', roleData?.role);
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

    console.log('Creating user:', email, 'with role:', role, 'department:', departmentId);

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
      .update({ role, department_id: departmentId || null })
      .eq('user_id', newUserId);

    if (updateRoleError) {
      console.error('Error updating role:', updateRoleError);
    }

    // Update the profile with department
    if (departmentId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ department_id: departmentId })
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
