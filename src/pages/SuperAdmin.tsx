import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserRole } from '@/hooks/useUserRole';
import { useDepartments } from '@/hooks/useDepartments';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Activity, 
  RefreshCw, 
  Loader2, 
  Search,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Calendar,
  User,
  Users,
  Database,
  FileSpreadsheet,
  Download,
  Building2,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: unknown;
  new_data: unknown;
  department_id: string | null;
  created_at: string;
}

interface SystemStats {
  totalUsers: number;
  totalDepartments: number;
  activeUsers24h: number;
  totalActions: number;
  insertsCount: number;
  updatesCount: number;
  deletesCount: number;
}

interface UserWithDepartment {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  department_name: string | null;
  department_id: string | null;
}

const actionIcons: Record<string, React.ReactNode> = {
  INSERT: <Plus className="w-4 h-4 text-green-500" />,
  UPDATE: <Edit className="w-4 h-4 text-blue-500" />,
  DELETE: <Trash2 className="w-4 h-4 text-red-500" />,
};

const actionColors: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function SuperAdmin() {
  const { highestRole, loading: roleLoading } = useUserRole();
  const { departments } = useDepartments();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserWithDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalDepartments: 0,
    activeUsers24h: 0,
    totalActions: 0,
    insertsCount: 0,
    updatesCount: 0,
    deletesCount: 0,
  });

  const tables = [
    'inventory_items',
    'fleets',
    'maintenance_records',
    'reports',
    'user_roles',
    'departments',
    'stock_transactions',
    'profiles',
    'user_department_access',
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch audit logs
      let logsQuery = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (tableFilter !== 'all') {
        logsQuery = logsQuery.eq('table_name', tableFilter);
      }
      if (actionFilter !== 'all') {
        logsQuery = logsQuery.eq('action', actionFilter);
      }
      if (departmentFilter !== 'all') {
        logsQuery = logsQuery.eq('department_id', departmentFilter);
      }

      const { data: logsData, error: logsError } = await logsQuery;
      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Fetch users with their roles and departments
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, department_id, departments(name)');
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, department_id, departments(name)');
      if (rolesError) throw rolesError;

      const usersData: UserWithDepartment[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: userRole?.role || 'staff',
          department_name: profile.departments?.name || userRole?.departments?.name || null,
          department_id: profile.department_id || userRole?.department_id || null,
        };
      });
      setUsers(usersData);

      // Calculate stats
      const allLogs = logsData || [];
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeUserIds = new Set(
        allLogs
          .filter((log) => new Date(log.created_at) > yesterday)
          .map((log) => log.user_id)
      );

      setStats({
        totalUsers: usersData.length,
        totalDepartments: departments.length,
        activeUsers24h: activeUserIds.size,
        totalActions: allLogs.length,
        insertsCount: allLogs.filter((l) => l.action === 'INSERT').length,
        updatesCount: allLogs.filter((l) => l.action === 'UPDATE').length,
        deletesCount: allLogs.filter((l) => l.action === 'DELETE').length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (highestRole === 'super_admin') {
      fetchData();
    }
  }, [highestRole, tableFilter, actionFilter, departmentFilter]);

  // Only super_admin can access this page
  if (!roleLoading && highestRole !== 'super_admin') {
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
                This page is restricted to Super Admins only. Regular admins do not have access to this dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(searchLower) ||
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.table_name.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower)
    );
  });

  const getChangedFields = (oldData: unknown, newData: unknown) => {
    if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') return [];
    const oldObj = oldData as Record<string, unknown>;
    const newObj = newData as Record<string, unknown>;
    const changes: { field: string; oldValue: unknown; newValue: unknown }[] = [];
    
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    allKeys.forEach((key) => {
      if (key === 'updated_at' || key === 'created_at') return;
      if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
        changes.push({
          field: key,
          oldValue: oldObj[key],
          newValue: newObj[key],
        });
      }
    });
    
    return changes;
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'N/A';
    const dept = departments.find((d) => d.id === deptId);
    return dept?.name || 'Unknown';
  };

  const exportToExcel = () => {
    const exportData = filteredLogs.map((log, index) => ({
      'No.': index + 1,
      'User': log.user_name || log.user_email || 'Unknown',
      'Email': log.user_email || 'N/A',
      'Department': getDepartmentName(log.department_id),
      'Action': log.action,
      'Table': log.table_name,
      'Timestamp': format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      'Record ID': log.record_id || 'N/A',
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0] || {}).join(',');
    const rows = exportData.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();
    toast.success('Audit logs exported successfully');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete system control and monitoring
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToExcel} variant="outline" disabled={loading}>
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </Button>
            <Button onClick={fetchData} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <Users className="w-4 h-4" /> Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Departments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalDepartments}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Active (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.activeUsers24h}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-500" /> Inserts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.insertsCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-500" /> Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.updatesCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" /> Deletes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.deletesCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="audit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Overview
            </TabsTrigger>
          </TabsList>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      System Audit Logs
                    </CardTitle>
                    <CardDescription>
                      Complete history of all user actions across the system
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search logs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-[180px]"
                      />
                    </div>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[160px]">
                        <Building2 className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={tableFilter} onValueChange={setTableFilter}>
                      <SelectTrigger className="w-[160px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Table" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tables</SelectItem>
                        {tables.map((table) => (
                          <SelectItem key={table} value={table}>
                            {table.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="INSERT">Insert</SelectItem>
                        <SelectItem value="UPDATE">Update</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[60px]">No.</TableHead>
                          <TableHead className="w-[140px]">Department</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead className="w-[160px]">Timestamp</TableHead>
                          <TableHead className="w-[80px]">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No audit logs found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredLogs.map((log, index) => (
                            <TableRow 
                              key={log.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => setSelectedLog(log)}
                            >
                              <TableCell className="font-mono text-sm font-semibold">
                                {index + 1}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal">
                                  {getDepartmentName(log.department_id)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium text-sm">
                                      {log.user_name || 'System'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {log.user_email || 'system'}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={actionColors[log.action]}>
                                  <span className="flex items-center gap-1">
                                    {actionIcons[log.action]}
                                    {log.action}
                                  </span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {log.table_name}
                                </code>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                  <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Overview Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All System Users
                </CardTitle>
                <CardDescription>
                  Overview of all users and their department assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Primary Department</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.full_name || 'No Name'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.department_name || <span className="text-muted-foreground">Not assigned</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Action Detail Dialog */}
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLog && actionIcons[selectedLog.action]}
                Action Details
              </DialogTitle>
              <DialogDescription>
                Complete details of the selected action
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User</label>
                    <p className="font-medium">{selectedLog.user_name || 'System'}</p>
                    <p className="text-sm text-muted-foreground">{selectedLog.user_email || 'system'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                    <p className="font-mono">{format(new Date(selectedLog.created_at), 'PPpp')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Department</label>
                    <p>{getDepartmentName(selectedLog.department_id)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Table / Record</label>
                    <p><code className="bg-muted px-2 py-1 rounded text-sm">{selectedLog.table_name}</code></p>
                    <p className="text-xs text-muted-foreground mt-1">ID: {selectedLog.record_id}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  {selectedLog.action === 'UPDATE' && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Edit className="w-4 h-4 text-blue-500" />
                        Changed Fields
                      </h4>
                      <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
                        {getChangedFields(selectedLog.old_data, selectedLog.new_data).map((change) => (
                          <div key={change.field} className="flex flex-col gap-1">
                            <span className="font-mono font-medium text-sm">{change.field}</span>
                            <div className="flex gap-2 text-sm">
                              <span className="text-red-600 bg-red-50 dark:bg-red-950/50 px-2 py-1 rounded line-through">
                                {JSON.stringify(change.oldValue)}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-green-600 bg-green-50 dark:bg-green-950/50 px-2 py-1 rounded">
                                {JSON.stringify(change.newValue)}
                              </span>
                            </div>
                          </div>
                        ))}
                        {getChangedFields(selectedLog.old_data, selectedLog.new_data).length === 0 && (
                          <span className="text-muted-foreground">No field changes detected</span>
                        )}
                      </div>
                    </div>
                  )}
                  {selectedLog.action === 'INSERT' && selectedLog.new_data && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-green-500" />
                        New Record Created
                      </h4>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60">
                        {JSON.stringify(selectedLog.new_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.action === 'DELETE' && selectedLog.old_data && (
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Trash2 className="w-4 h-4 text-red-500" />
                        Deleted Record
                      </h4>
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-60">
                        {JSON.stringify(selectedLog.old_data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}