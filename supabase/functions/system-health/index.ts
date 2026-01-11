import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const started = performance.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse({ error: 'No authorization header' }, 401);

    // Validate JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return jsonResponse({ error: 'Invalid token' }, 401);

    const requestingUserId = claimsData.claims.sub as string;

    // Privileged client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authorize: super_admin only
    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId);

    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    if (roleError || !roles.includes('super_admin')) {
      return jsonResponse({ error: 'Only super_admin can view system health' }, 403);
    }

    const countsStart = performance.now();

    const tableNames = [
      'departments',
      'profiles',
      'user_roles',
      'inventory_items',
      'warehouse_locations',
      'warehouse_classifications',
      'reports',
      'fleets',
      'maintenance_records',
      'stock_transactions',
      'audit_logs',
    ] as const;

    const countResults = await Promise.all(
      tableNames.map(async (table) => {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) throw error;
        return [table, count ?? 0] as const;
      })
    );

    const counts = Object.fromEntries(countResults);

    const countsMs = Math.round(performance.now() - countsStart);

    const auditStart = performance.now();

    // Audit actions in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: actions24h, error: actionsErr } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);

    if (actionsErr) throw actionsErr;

    // Active users in last 24h (dedupe by user_id)
    const activeUserIds = new Set<string>();
    const pageSize = 1000;
    const maxPages = 10; // safety limit

    for (let page = 0; page < maxPages; page++) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data: rows, error } = await supabaseAdmin
        .from('audit_logs')
        .select('user_id')
        .gte('created_at', since)
        .range(from, to);

      if (error) throw error;

      if (!rows || rows.length === 0) break;

      for (const r of rows as Array<{ user_id: string }>) {
        if (r.user_id) activeUserIds.add(r.user_id);
      }

      if (rows.length < pageSize) break;
    }

    // Last audit event time
    const { data: lastAudit, error: lastAuditErr } = await supabaseAdmin
      .from('audit_logs')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastAuditErr) throw lastAuditErr;

    const auditMs = Math.round(performance.now() - auditStart);

    return jsonResponse({
      generatedAt: new Date().toISOString(),
      counts,
      activeUsers24h: activeUserIds.size,
      actions24h: actions24h ?? 0,
      lastAuditAt: lastAudit?.created_at ?? null,
      timingsMs: {
        total: Math.round(performance.now() - started),
        counts: countsMs,
        audit: auditMs,
      },
    });
  } catch (error: unknown) {
    console.error('Error in system-health function:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return jsonResponse({ error: message }, 500);
  }
});
