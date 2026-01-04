import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Users, FileText, AlertTriangle, Wrench, Building2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type FleetWithOperator = Tables<"fleets"> & {
  operator?: Tables<"profiles"> | null;
};

const Department = () => {
  const { code } = useParams<{ code: string }>();
  const [department, setDepartment] = useState<Tables<"departments"> | null>(null);
  const [fleets, setFleets] = useState<FleetWithOperator[]>([]);
  const [issues, setIssues] = useState<Tables<"fleet_issues">[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<Tables<"maintenance_records">[]>([]);
  const [teamMembers, setTeamMembers] = useState<Tables<"profiles">[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (code) {
      fetchDepartmentData();
    }
  }, [code]);

  const fetchDepartmentData = async () => {
    setIsLoading(true);

    // Fetch department
    const { data: deptData } = await supabase
      .from("departments")
      .select("*")
      .eq("code", code)
      .single();

    if (!deptData) {
      setIsLoading(false);
      return;
    }

    setDepartment(deptData);

    // Fetch fleets for this department
    const { data: fleetsData } = await supabase
      .from("fleets")
      .select("*, operator:profiles(*)")
      .eq("department_id", deptData.id)
      .order("fleet_number");

    setFleets(fleetsData || []);

    // Fetch fleet issues
    const fleetIds = (fleetsData || []).map(f => f.id);
    if (fleetIds.length > 0) {
      const { data: issuesData } = await supabase
        .from("fleet_issues")
        .select("*")
        .in("fleet_id", fleetIds)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false });

      setIssues(issuesData || []);
    }

    // Fetch maintenance records
    const { data: maintenanceData } = await supabase
      .from("maintenance_records")
      .select("*")
      .eq("department_id", deptData.id)
      .order("maintenance_date", { ascending: false })
      .limit(10);

    setMaintenanceRecords(maintenanceData || []);

    // Fetch team members (users with role in this department)
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("department_id", deptData.id);

    if (rolesData && rolesData.length > 0) {
      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      setTeamMembers(profilesData || []);
    }

    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      operational: "default",
      under_maintenance: "secondary",
      out_of_service: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status.replace("_", " ")}</Badge>;
  };

  const getConditionBadge = (condition: string | null) => {
    if (!condition) return null;
    const colors: Record<string, string> = {
      operational: "bg-green-100 text-green-800",
      good_condition: "bg-green-100 text-green-800",
      grounded: "bg-red-100 text-red-800",
      under_repair: "bg-yellow-100 text-yellow-800",
      waiting_parts: "bg-orange-100 text-orange-800",
      decommissioned: "bg-gray-100 text-gray-800",
    };
    return <Badge className={colors[condition] || ""}>{condition.replace("_", " ")}</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading department...</p>
        </div>
      </MainLayout>
    );
  }

  if (!department) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Department not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div 
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: department.color || "hsl(var(--primary))" }}
          >
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{department.name}</h1>
            <p className="text-muted-foreground">{department.description || `${department.code} Department`}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fleet Size</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fleets.length}</div>
              <p className="text-xs text-muted-foreground">
                {fleets.filter(f => f.status === "operational").length} operational
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{issues.length}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{maintenanceRecords.length}</div>
              <p className="text-xs text-muted-foreground">Recent records</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <p className="text-xs text-muted-foreground">Active members</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="fleet" className="space-y-4">
          <TabsList>
            <TabsTrigger value="fleet">Fleet</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="fleet">
            <Card>
              <CardHeader>
                <CardTitle>Fleet Inventory</CardTitle>
                <CardDescription>All vehicles and equipment in this department</CardDescription>
              </CardHeader>
              <CardContent>
                {fleets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No fleet items</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fleet #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Operator</TableHead>
                        <TableHead>Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fleets.map((fleet) => (
                        <TableRow key={fleet.id}>
                          <TableCell className="font-medium">{fleet.fleet_number}</TableCell>
                          <TableCell>{fleet.machine_type}</TableCell>
                          <TableCell>{getStatusBadge(fleet.status)}</TableCell>
                          <TableCell>{getConditionBadge(fleet.condition)}</TableCell>
                          <TableCell>{fleet.operator?.full_name || "-"}</TableCell>
                          <TableCell>{fleet.machine_hours || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <Card>
              <CardHeader>
                <CardTitle>Open Issues</CardTitle>
                <CardDescription>Unresolved issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {issues.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No open issues</p>
                ) : (
                  <div className="space-y-4">
                    {issues.map((issue) => (
                      <div key={issue.id} className="flex items-start gap-3 rounded-lg border p-4">
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm">{issue.issue_description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Reported: {new Date(issue.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance History</CardTitle>
                <CardDescription>Recent maintenance records</CardDescription>
              </CardHeader>
              <CardContent>
                {maintenanceRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No maintenance records</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Condition After</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {maintenanceRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{new Date(record.maintenance_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.service_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{record.service_description}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.condition_after_service || "-"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Users assigned to this department</CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No team members assigned</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded-lg border p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                          {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.full_name || "Unnamed"}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Department;
