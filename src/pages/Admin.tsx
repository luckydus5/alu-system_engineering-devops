import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Building2, Shield, Plus, Search, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ProfileWithRole = Tables<"profiles"> & {
  user_roles?: Tables<"user_roles">[];
};

const Admin = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<ProfileWithRole[]>([]);
  const [departments, setDepartments] = useState<Tables<"departments">[]>([]);
  const [userRoles, setUserRoles] = useState<Tables<"user_roles">[]>([]);
  const [departmentAccess, setDepartmentAccess] = useState<Tables<"user_department_access">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit role dialog
  const [selectedUser, setSelectedUser] = useState<ProfileWithRole | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newDepartmentId, setNewDepartmentId] = useState<string>("");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grant access dialog
  const [accessUserId, setAccessUserId] = useState<string>("");
  const [accessDepartmentId, setAccessDepartmentId] = useState<string>("");
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);

  const isAdmin = role === "admin" || role === "director";

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    setIsLoading(true);

    // Fetch profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name");

    // Fetch user roles
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("*");

    // Fetch departments
    const { data: deptsData } = await supabase
      .from("departments")
      .select("*")
      .order("name");

    // Fetch department access
    const { data: accessData } = await supabase
      .from("user_department_access")
      .select("*");

    setUsers(profilesData || []);
    setUserRoles(rolesData || []);
    setDepartments(deptsData || []);
    setDepartmentAccess(accessData || []);
    setIsLoading(false);
  };

  const getUserRole = (userId: string) => {
    const userRole = userRoles.find(r => r.user_id === userId);
    return userRole?.role || "staff";
  };

  const getUserDepartment = (userId: string) => {
    const userRole = userRoles.find(r => r.user_id === userId);
    if (!userRole?.department_id) return null;
    return departments.find(d => d.id === userRole.department_id);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    setIsSubmitting(true);

    // Find existing role
    const existingRole = userRoles.find(r => r.user_id === selectedUser.id);

    if (existingRole) {
      const { error } = await supabase
        .from("user_roles")
        .update({ 
          role: newRole as any,
          department_id: newDepartmentId || null 
        })
        .eq("id", existingRole.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Role updated successfully" });
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.id,
          role: newRole as any,
          department_id: newDepartmentId || null
        });

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Role assigned successfully" });
        fetchData();
      }
    }

    setIsSubmitting(false);
    setIsRoleDialogOpen(false);
    setSelectedUser(null);
  };

  const handleGrantAccess = async () => {
    if (!accessUserId || !accessDepartmentId) return;

    setIsSubmitting(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("user_department_access")
      .insert({
        user_id: accessUserId,
        department_id: accessDepartmentId,
        granted_by: user?.id || ""
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Department access granted" });
      fetchData();
    }

    setIsSubmitting(false);
    setIsAccessDialogOpen(false);
    setAccessUserId("");
    setAccessDepartmentId("");
  };

  const handleRevokeAccess = async (accessId: string) => {
    const { error } = await supabase
      .from("user_department_access")
      .delete()
      .eq("id", accessId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Access revoked" });
      fetchData();
    }
  };

  const filteredUsers = users.filter(user =>
    (user.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-destructive text-destructive-foreground",
      director: "bg-primary text-primary-foreground",
      manager: "bg-primary/80 text-primary-foreground",
      supervisor: "bg-secondary text-secondary-foreground",
      staff: "bg-muted text-muted-foreground",
    };
    return <Badge className={colors[role] || ""}>{role}</Badge>;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, roles, and department access</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Access Grants</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{departmentAccess.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users & Roles</TabsTrigger>
            <TabsTrigger value="access">Department Access</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and department assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || "Unnamed"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(getUserRole(user.id))}</TableCell>
                        <TableCell>{getUserDepartment(user.id)?.name || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(getUserRole(user.id));
                              setNewDepartmentId(getUserDepartment(user.id)?.id || "");
                              setIsRoleDialogOpen(true);
                            }}
                          >
                            Edit Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAccessDialogOpen} onOpenChange={setIsAccessDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Grant Access
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Grant Department Access</DialogTitle>
                    <DialogDescription>Allow a user to access another department</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>User</Label>
                      <Select value={accessUserId} onValueChange={setAccessUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={accessDepartmentId} onValueChange={setAccessDepartmentId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAccessDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleGrantAccess} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Grant Access
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Department Access</CardTitle>
                <CardDescription>Users with cross-department access permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {departmentAccess.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No cross-department access grants</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Granted At</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departmentAccess.map((access) => {
                        const user = users.find(u => u.id === access.user_id);
                        const dept = departments.find(d => d.id === access.department_id);
                        return (
                          <TableRow key={access.id}>
                            <TableCell>{user?.full_name || user?.email || "Unknown"}</TableCell>
                            <TableCell>{dept?.name || "Unknown"}</TableCell>
                            <TableCell>{new Date(access.granted_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRevokeAccess(access.id)}
                              >
                                Revoke
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>
                Update role and department for {selectedUser?.full_name || selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Primary Department</Label>
                <Select value={newDepartmentId} onValueChange={setNewDepartmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateRole} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Admin;
