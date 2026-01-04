import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Truck, 
  AlertTriangle, 
  Clock,
  Building2
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  totalFleets: number;
  fleetsUnderMaintenance: number;
  openIssues: number;
  departments: Tables<"departments">[];
}

const Index = () => {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    pendingReports: 0,
    totalFleets: 0,
    fleetsUnderMaintenance: 0,
    openIssues: 0,
    departments: [],
  });
  const [recentReports, setRecentReports] = useState<Tables<"reports">[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch departments
        const { data: departments } = await supabase
          .from("departments")
          .select("*")
          .order("name");

        // Fetch reports count
        const { count: totalReports } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true });

        const { count: pendingReports } = await supabase
          .from("reports")
          .select("*", { count: "exact", head: true })
          .in("status", ["submitted", "in_review"]);

        // Fetch fleets count
        const { count: totalFleets } = await supabase
          .from("fleets")
          .select("*", { count: "exact", head: true });

        const { count: fleetsUnderMaintenance } = await supabase
          .from("fleets")
          .select("*", { count: "exact", head: true })
          .eq("status", "under_maintenance");

        // Fetch open issues
        const { count: openIssues } = await supabase
          .from("fleet_issues")
          .select("*", { count: "exact", head: true })
          .eq("is_resolved", false);

        // Fetch recent reports
        const { data: reports } = await supabase
          .from("reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);

        setStats({
          totalReports: totalReports || 0,
          pendingReports: pendingReports || 0,
          totalFleets: totalFleets || 0,
          fleetsUnderMaintenance: fleetsUnderMaintenance || 0,
          openIssues: openIssues || 0,
          departments: departments || [],
        });

        setRecentReports(reports || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      submitted: "secondary",
      in_review: "default",
      resolved: "default",
      closed: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-muted text-muted-foreground",
      medium: "bg-primary/10 text-primary",
      high: "bg-destructive/10 text-destructive",
      critical: "bg-destructive text-destructive-foreground",
    };
    return <Badge className={colors[priority] || ""}>{priority}</Badge>;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || "User"}
            {role && <Badge variant="outline" className="ml-2 capitalize">{role}</Badge>}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReports}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingReports} pending review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fleet Status</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFleets}</div>
              <p className="text-xs text-muted-foreground">
                {stats.fleetsUnderMaintenance} under maintenance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.openIssues}</div>
              <p className="text-xs text-muted-foreground">
                Requiring attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.departments.length}</div>
              <p className="text-xs text-muted-foreground">
                Active departments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Latest submitted reports across departments</CardDescription>
            </CardHeader>
            <CardContent>
              {recentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reports yet</p>
              ) : (
                <div className="space-y-4">
                  {recentReports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{report.title}</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(report.priority)}
                        {getStatusBadge(report.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Department Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>Quick access to department dashboards</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.departments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No departments configured</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {stats.departments.map((dept) => (
                    <a
                      key={dept.id}
                      href={`/department/${dept.code}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{ backgroundColor: dept.color || "hsl(var(--muted))" }}
                      >
                        <Building2 className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dept.name}</p>
                        <p className="text-xs text-muted-foreground">{dept.code}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
