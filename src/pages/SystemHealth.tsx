import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { KPICard } from "@/components/dashboard/KPICard";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Database,
  Users,
  FileText,
  Boxes,
  RefreshCcw,
  Shield,
} from "lucide-react";

type SystemHealthResponse = {
  generatedAt: string;
  counts: Record<string, number>;
  activeUsers24h: number;
  actions24h: number;
  lastAuditAt: string | null;
  timingsMs: {
    total: number;
    counts: number;
    audit: number;
  };
};

function formatNumber(n: number | undefined) {
  if (n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat().format(n);
}

export default function SystemHealth() {
  const { highestRole, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SystemHealthResponse | null>(null);

  const canView = highestRole === "super_admin";

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    const start = performance.now();

    try {
      const { data: res, error } = await supabase.functions.invoke("system-health", {
        body: {},
      });

      if (error) throw error;
      if (res?.error) throw new Error(res.error);

      setData(res as SystemHealthResponse);
    } catch (err: any) {
      console.error("Failed to load system health", err);
      toast({
        title: "Failed to load system health",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setData(null);
    } finally {
      const total = performance.now() - start;
      // If backend didn't provide timings, at least show UI fetch duration
      setData((prev) =>
        prev
          ? {
              ...prev,
              timingsMs: {
                ...prev.timingsMs,
                total: prev.timingsMs?.total ?? Math.round(total),
              },
            }
          : prev
      );
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!roleLoading && canView) fetchHealth();
  }, [roleLoading, canView, fetchHealth]);

  const counts = data?.counts ?? {};

  const kpis = useMemo(
    () => [
      {
        title: "Total Users",
        value: formatNumber(counts.profiles),
        icon: <Users className="h-5 w-5" />,
        variant: "blue" as const,
        description: "Profiles in the system",
      },
      {
        title: "Active Users (24h)",
        value: formatNumber(data?.activeUsers24h),
        icon: <Activity className="h-5 w-5" />,
        variant: "success" as const,
        description: "Based on audit activity",
      },
      {
        title: "Actions (24h)",
        value: formatNumber(data?.actions24h),
        icon: <Shield className="h-5 w-5" />,
        variant: "gold" as const,
        description: "Logged in audit trail",
      },
      {
        title: "Inventory Items",
        value: formatNumber(counts.inventory_items),
        icon: <Boxes className="h-5 w-5" />,
        variant: "default" as const,
        description: "All departments",
      },
      {
        title: "Reports",
        value: formatNumber(counts.reports),
        icon: <FileText className="h-5 w-5" />,
        variant: "warning" as const,
        description: "Submitted & drafts",
      },
      {
        title: "Departments",
        value: formatNumber(counts.departments),
        icon: <Database className="h-5 w-5" />,
        variant: "default" as const,
        description: "Configured in system",
      },
    ],
    [counts, data?.activeUsers24h, data?.actions24h]
  );

  if (!roleLoading && !canView) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="w-5 h-5" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You do not have permission to access this page. Only Super Admins can view system health.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => (window.location.href = "/")} variant="outline" className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="System Health">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground">
              Overview of database activity, users, and basic performance checks.
            </p>
          </div>
          <Button onClick={fetchHealth} disabled={loading} variant="outline">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpis.map((kpi) => (
            <KPICard
              key={kpi.title}
              title={kpi.title}
              value={loading ? "…" : kpi.value}
              icon={kpi.icon}
              variant={kpi.variant}
              description={kpi.description}
            />
          ))}
        </div>

        <Card className="shadow-corporate">
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Timing of the latest health check request.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-semibold text-foreground">
                {loading ? "…" : `${formatNumber(data?.timingsMs?.total)} ms`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Counts</p>
              <p className="text-xl font-semibold text-foreground">
                {loading ? "…" : `${formatNumber(data?.timingsMs?.counts)} ms`}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Audit</p>
              <p className="text-xl font-semibold text-foreground">
                {loading ? "…" : `${formatNumber(data?.timingsMs?.audit)} ms`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-corporate">
          <CardHeader>
            <CardTitle>Database Activity</CardTitle>
            <CardDescription>Latest audit event timestamps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Last audit event</p>
              <p className="text-sm font-medium text-foreground">
                {loading
                  ? "…"
                  : data?.lastAuditAt
                    ? new Date(data.lastAuditAt).toLocaleString()
                    : "No audit events"}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">Generated</p>
              <p className="text-sm font-medium text-foreground">
                {loading ? "…" : data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
