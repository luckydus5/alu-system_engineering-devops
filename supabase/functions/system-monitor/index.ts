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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'No authorization header' }, 401);
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }

    const requestingUserId = claimsData.claims.sub as string;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleRows, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId);

    const roles = (roleRows || []).map((r: { role: string }) => r.role);
    if (roleError || !roles.includes('super_admin')) {
      return jsonResponse({ error: 'Only super_admin can view system monitor' }, 403);
    }

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const since5min = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    // Cleanup old sessions
    await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false } as never)
      .lt('last_activity', since5min)
      .eq('is_active', true);

    // Parallel queries
    const [sessionsRes, usersRes, eventsRes, auditRes, reportsRes] = await Promise.all([
      supabaseAdmin.from('user_sessions').select('*'),
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('system_events').select('*').order('created_at', { ascending: false }).limit(50),
      supabaseAdmin.from('audit_logs').select('action').gte('created_at', since24h),
      supabaseAdmin.from('system_reports').select('created_at').order('created_at', { ascending: false }).limit(1),
    ]);

    const sessions = (sessionsRes.data || []) as Array<{ is_active: boolean }>;
    const activeSessions = sessions.filter((s) => s.is_active).length;
    const inactiveSessions = sessions.filter((s) => !s.is_active).length;

    const auditLogs = (auditRes.data || []) as Array<{ action: string }>;
    const inserts24h = auditLogs.filter((l) => l.action === 'INSERT').length;
    const updates24h = auditLogs.filter((l) => l.action === 'UPDATE').length;
    const deletes24h = auditLogs.filter((l) => l.action === 'DELETE').length;

    const eventsList = (eventsRes.data || []) as Array<{ severity: string; resolved: boolean }>;
    const unresolvedCritical = eventsList.filter((e) => e.severity === 'critical' && !e.resolved).length;
    const unresolvedHigh = eventsList.filter((e) => e.severity === 'high' && !e.resolved).length;

    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const issues: string[] = [];

    if (unresolvedCritical > 0) {
      healthStatus = 'critical';
      issues.push(`${unresolvedCritical} critical unresolved issue(s)`);
    } else if (unresolvedHigh > 0) {
      healthStatus = 'degraded';
      issues.push(`${unresolvedHigh} high priority issue(s)`);
    }

    const reportData = (reportsRes.data || []) as Array<{ created_at: string }>;

    return jsonResponse({
      activeSessions,
      inactiveSessions,
      totalUsers: usersRes.count || 0,
      recentEvents: eventsRes.data || [],
      dbStats: {
        totalRecords: {},
        recentActivity: { inserts24h, updates24h, deletes24h },
      },
      authMetrics: { failedLogins24h: 0, successfulLogins24h: 0, suspiciousActivity: 0 },
      systemHealth: { status: healthStatus, issues },
      lastReportAt: reportData[0]?.created_at || null,
      generatedAt: now.toISOString(),
    });

  } catch (error: unknown) {
    console.error('Error in system-monitor:', error);
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return jsonResponse({ error: message }, 500);
  }
});
