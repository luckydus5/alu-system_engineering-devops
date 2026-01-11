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
  Calendar,
  User,
  Users,
  Database,
  Download,
  Building2,
  ChevronRight,
  FileText,
  Settings,
  Lock,
  BarChart3,
  Clock,
  Globe,
  History,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Layers
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  INSERT: <Plus className="w-3.5 h-3.5" />,
  UPDATE: <Edit className="w-3.5 h-3.5" />,
  DELETE: <Trash2 className="w-3.5 h-3.5" />,
};

const actionColors: Record<string, string> = {
  INSERT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  UPDATE: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
};

// Admin tools sidebar items
const sidebarTools = [
  { id: 'audit', label: 'Audit Logs', icon: History, description: 'System activity history' },
  { id: 'users', label: 'User Overview', icon: Users, description: 'All system users' },
  { id: 'departments', label: 'Departments', icon: Building2, description: 'Department management' },
  { id: 'reports', label: 'Reports', icon: FileText, description: 'System reports' },
  { id: 'permissions', label: 'Permissions', icon: Lock, description: 'Access control' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Usage statistics' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'System configuration' },
];

// Quick stats items
const quickStatItems = [
  { id: 'online', icon: Globe, label: 'Online Now', color: 'text-emerald-500' },
  { id: 'pending', icon: Clock, label: 'Pending', color: 'text-amber-500' },
  { id: 'approved', icon: CheckCircle, label: 'Approved', color: 'text-blue-500' },
  { id: 'flagged', icon: AlertTriangle, label: 'Flagged', color: 'text-red-500' },
];

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
  const [activeTool, setActiveTool] = useState('audit');
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
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
                This page is restricted to Super Admins only. Regular admins do not have access.
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

    const headers = Object.keys(exportData[0] || {}).join(',');
    const rows = exportData.map((row) =>
      Object.values(row)
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();
    toast.success('Audit logs exported successfully');
  };

  const renderMainContent = () => {
    switch (activeTool) {
      case 'users':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">All System Users</h3>
              <Badge variant="secondary">{users.length} users</Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-380px)]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium">{user.full_name || 'No Name'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={cn(
                            user.role === 'super_admin' && 'bg-purple-500/15 text-purple-700 border-purple-500/30',
                            user.role === 'admin' && 'bg-red-500/15 text-red-700 border-red-500/30',
                            user.role === 'director' && 'bg-blue-500/15 text-blue-700 border-blue-500/30',
                            user.role === 'manager' && 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
                          )}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{user.department_name || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="text-xs text-muted-foreground">Active</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        );

      case 'departments':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Department Management</h3>
              <Badge variant="secondary">{departments.length} departments</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {departments.map((dept) => (
                <Card key={dept.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{dept.name}</h4>
                        <p className="text-xs text-muted-foreground">{dept.code}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {dept.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      default:
        // Audit logs view
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">System Audit Logs</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{filteredLogs.length} records</Badge>
                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none h-8"
                    onClick={() => setViewMode('list')}
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="rounded-none h-8"
                    onClick={() => setViewMode('compact')}
                  >
                    <Database className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-380px)]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead className="w-[120px]">Department</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead className="w-[150px]">Timestamp</TableHead>
                      <TableHead className="w-[60px] text-center">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log, index) => (
                        <TableRow 
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal text-xs">
                              {getDepartmentName(log.department_id)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-medium text-sm leading-tight">
                                  {log.user_name || 'System'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.user_email?.split('@')[0] || 'system'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs gap-1', actionColors[log.action])}>
                              {actionIcons[log.action]}
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                              {log.table_name.replace(/_/g, '_')}
                            </code>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-1 py-3 border-b bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-t-xl -mx-1 mb-4">
          <div className="flex items-center gap-3 px-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Super Admin Dashboard</h1>
              <p className="text-xs text-slate-400">Complete system control & monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px] h-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-purple-500"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToExcel}
              className="h-9 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-9 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Category tabs - secondary bar */}
        <div className="flex items-center gap-1 px-1 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg mb-4 overflow-x-auto">
          <Button
            variant={tableFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTableFilter('all')}
            className="shrink-0"
          >
            All Tables
          </Button>
          {tables.slice(0, 6).map((table) => (
            <Button
              key={table}
              variant={tableFilter === table ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTableFilter(table)}
              className="shrink-0 capitalize"
            >
              {table.replace(/_/g, ' ')}
            </Button>
          ))}
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content Area */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left Sidebar - Tools */}
          <div className="w-[220px] shrink-0 space-y-2">
            <Card className="overflow-hidden">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Admin Tools
                </h3>
              </div>
              <CardContent className="p-2">
                {sidebarTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                      activeTool === tool.id 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <tool.icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm">{tool.label}</span>
                    {activeTool === tool.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Total Users</span>
                  </div>
                  <span className="font-bold">{stats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    <span>Active (24h)</span>
                  </div>
                  <span className="font-bold text-emerald-600">{stats.activeUsers24h}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Database className="w-4 h-4" />
                    <span>Total Actions</span>
                  </div>
                  <span className="font-bold">{stats.totalActions}</span>
                </div>
                <hr className="my-2" />
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-500/10 rounded-lg p-2">
                    <div className="text-lg font-bold text-emerald-600">{stats.insertsCount}</div>
                    <div className="text-[10px] text-muted-foreground">Inserts</div>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-2">
                    <div className="text-lg font-bold text-blue-600">{stats.updatesCount}</div>
                    <div className="text-[10px] text-muted-foreground">Updates</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-2">
                    <div className="text-lg font-bold text-red-600">{stats.deletesCount}</div>
                    <div className="text-[10px] text-muted-foreground">Deletes</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="flex-1 min-w-0">
            <CardContent className="p-4 h-full">
              {renderMainContent()}
            </CardContent>
          </Card>
        </div>

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
