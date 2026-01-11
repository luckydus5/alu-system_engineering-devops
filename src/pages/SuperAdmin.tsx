import { useState, useEffect, useCallback, useRef } from 'react';
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
import { WarehouseTransactionHistory } from '@/components/warehouse/WarehouseTransactionHistory';
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
  User,
  Users,
  Database,
  Download,
  Building2,
  ChevronRight,
  FileText,
  Settings,
  BarChart3,
  History,
  AlertTriangle,
  CheckCircle,
  Layers,
  Wifi,
  WifiOff,
  Bell,
  Timer,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, formatDistanceToNow } from 'date-fns';
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
import { Progress } from '@/components/ui/progress';

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
  activeNow: number;
}

interface UserWithDepartment {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  department_name: string | null;
  department_id: string | null;
}

interface ActiveSession {
  id: string;
  user_id: string;
  is_active: boolean;
  current_page: string | null;
  last_activity: string;
  full_name?: string | null;
  email?: string;
}

interface SystemReport {
  id: string;
  report_type: string;
  summary: unknown;
  issues_detected: number;
  created_at: string;
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

const sidebarTools = [
  { id: 'audit', label: 'Audit Logs', icon: History, description: 'System activity history' },
  { id: 'users', label: 'User Overview', icon: Users, description: 'All system users' },
  { id: 'departments', label: 'Departments', icon: Building2, description: 'Department management' },
  { id: 'warehouse', label: 'Warehouse', icon: Database, description: 'Stock transactions' },
  { id: 'live', label: 'Live Monitor', icon: Activity, description: 'Real-time activity' },
  { id: 'reports', label: 'System Reports', icon: FileText, description: 'Auto-generated reports' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Usage statistics' },
];

const AUTO_REPORT_INTERVAL = 10 * 60 * 1000; // 10 minutes

export default function SuperAdmin() {
  const { highestRole, loading: roleLoading } = useUserRole();
  const { departments } = useDepartments();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserWithDepartment[]>([]);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [reports, setReports] = useState<SystemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [activeTool, setActiveTool] = useState('audit');
  const [autoReportEnabled, setAutoReportEnabled] = useState(true);
  const [nextReportIn, setNextReportIn] = useState(AUTO_REPORT_INTERVAL);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalDepartments: 0,
    activeUsers24h: 0,
    totalActions: 0,
    insertsCount: 0,
    updatesCount: 0,
    deletesCount: 0,
    activeNow: 0,
  });

  const autoReportRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const tables = [
    'inventory_items',
    'fleets',
    'maintenance_records',
    'reports',
    'user_roles',
    'departments',
    'stock_transactions',
    'profiles',
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch audit logs
      let logsQuery = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (tableFilter !== 'all') logsQuery = logsQuery.eq('table_name', tableFilter);
      if (actionFilter !== 'all') logsQuery = logsQuery.eq('action', actionFilter);
      if (departmentFilter !== 'all') logsQuery = logsQuery.eq('department_id', departmentFilter);

      const { data: logsData, error: logsError } = await logsQuery;
      if (logsError) throw logsError;
      setLogs(logsData || []);

      // Fetch users with roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, department_id, departments(name)');

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role, department_id, departments(name)');

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

      // Fetch active sessions
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .order('last_activity', { ascending: false });

      const sessionsList = sessionsData || [];
      const userIds = sessionsList.map(s => s.user_id);
      const { data: sessionProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((sessionProfiles || []).map(p => [p.id, p]));
      const enrichedSessions: ActiveSession[] = sessionsList.map(s => ({
        ...s,
        full_name: profileMap.get(s.user_id)?.full_name,
        email: profileMap.get(s.user_id)?.email,
      }));
      setSessions(enrichedSessions);

      // Fetch system reports
      const { data: reportsData } = await supabase
        .from('system_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setReports(reportsData || []);

      // Calculate stats
      const allLogs = logsData || [];
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeUserIds = new Set(
        allLogs.filter((log) => new Date(log.created_at) > yesterday).map((log) => log.user_id)
      );

      setStats({
        totalUsers: usersData.length,
        totalDepartments: departments.length,
        activeUsers24h: activeUserIds.size,
        totalActions: allLogs.length,
        insertsCount: allLogs.filter((l) => l.action === 'INSERT').length,
        updatesCount: allLogs.filter((l) => l.action === 'UPDATE').length,
        deletesCount: allLogs.filter((l) => l.action === 'DELETE').length,
        activeNow: enrichedSessions.filter(s => s.is_active).length,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [tableFilter, actionFilter, departmentFilter, departments.length]);

  const generateSystemReport = useCallback(async () => {
    setGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('system-monitor', {
        body: { action: 'generate_report' },
      });

      if (error) throw error;
      
      toast.success('System report generated successfully');
      fetchData();
      setNextReportIn(AUTO_REPORT_INTERVAL);
    } catch (err) {
      console.error('Failed to generate report:', err);
      toast.error('Failed to generate system report');
    } finally {
      setGeneratingReport(false);
    }
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (highestRole === 'super_admin') {
      fetchData();
    }
  }, [highestRole, fetchData]);

  // Auto-report timer
  useEffect(() => {
    if (!autoReportEnabled || highestRole !== 'super_admin') return;

    autoReportRef.current = setInterval(() => {
      generateSystemReport();
    }, AUTO_REPORT_INTERVAL);

    countdownRef.current = setInterval(() => {
      setNextReportIn((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => {
      if (autoReportRef.current) clearInterval(autoReportRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoReportEnabled, highestRole, generateSystemReport]);

  // Real-time subscriptions
  useEffect(() => {
    if (highestRole !== 'super_admin') return;

    const channel = supabase
      .channel('super-admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [highestRole, fetchData]);

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
                This page is restricted to Super Admins only.
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
        changes.push({ field: key, oldValue: oldObj[key], newValue: newObj[key] });
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
      'Department': getDepartmentName(log.department_id),
      'Action': log.action,
      'Table': log.table_name,
      'Timestamp': format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
    }));

    const headers = Object.keys(exportData[0] || {}).join(',');
    const rows = exportData.map((row) =>
      Object.values(row).map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();
    toast.success('Audit logs exported');
  };

  const formatCountdown = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const activeSessions = sessions.filter(s => s.is_active);
  const inactiveSessions = sessions.filter(s => !s.is_active);

  const renderMainContent = () => {
    switch (activeTool) {
      case 'live':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                Live Activity Monitor
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
                  <Wifi className="w-3 h-3 mr-1" />
                  {activeSessions.length} online
                </Badge>
                <Badge variant="outline" className="bg-slate-500/10 text-slate-600">
                  <WifiOff className="w-3 h-3 mr-1" />
                  {inactiveSessions.length} offline
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Active Users */}
              <Card className="border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-500" />
                    Active Users ({activeSessions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {activeSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No active users</p>
                    ) : (
                      <div className="space-y-2">
                        {activeSessions.map((session) => (
                          <div key={session.id} className="flex items-center gap-3 p-2 bg-emerald-500/5 rounded-lg">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{session.full_name || session.email || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground truncate">{session.current_page || '/'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recently Inactive */}
              <Card className="border-slate-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <WifiOff className="w-4 h-4 text-slate-500" />
                    Recently Inactive ({inactiveSessions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {inactiveSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No inactive sessions</p>
                    ) : (
                      <div className="space-y-2">
                        {inactiveSessions.slice(0, 15).map((session) => (
                          <div key={session.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{session.full_name || session.email || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground truncate">Last: {session.current_page || '/'}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">System Reports</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Timer className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Next report in:</span>
                  <Badge variant="outline">{formatCountdown(nextReportIn)}</Badge>
                </div>
                <Button
                  size="sm"
                  onClick={generateSystemReport}
                  disabled={generatingReport}
                >
                  {generatingReport ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                  Generate Now
                </Button>
              </div>
            </div>

            {/* Auto-report progress */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3">
                <div className="flex items-center gap-4">
                  <Bell className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Auto-Report Timer</span>
                      <span className="text-xs text-muted-foreground">Every 10 minutes</span>
                    </div>
                    <Progress value={((AUTO_REPORT_INTERVAL - nextReportIn) / AUTO_REPORT_INTERVAL) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <ScrollArea className="h-[400px]">
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No reports generated yet</p>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <Card key={report.id} className="hover:bg-muted/30 transition-colors">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center',
                              report.issues_detected > 0 ? 'bg-orange-500/10' : 'bg-emerald-500/10'
                            )}>
                              {report.issues_detected > 0 ? (
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {report.report_type === 'periodic' ? 'Periodic Report' : 'Manual Report'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(report.created_at), 'PPpp')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={report.issues_detected > 0 ? 'destructive' : 'secondary'}>
                              {report.issues_detected} issues
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        );

      case 'analytics':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">System Analytics</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-emerald-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <ArrowUpCircle className="w-8 h-8 text-emerald-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.insertsCount}</p>
                      <p className="text-xs text-muted-foreground">Inserts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <Edit className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.updatesCount}</p>
                      <p className="text-xs text-muted-foreground">Updates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <ArrowDownCircle className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.deletesCount}</p>
                      <p className="text-xs text-muted-foreground">Deletes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalActions}</p>
                      <p className="text-xs text-muted-foreground">Total Actions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Activity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Inserts</span>
                      <span className="text-sm text-muted-foreground">{stats.insertsCount}</span>
                    </div>
                    <Progress value={(stats.insertsCount / Math.max(stats.totalActions, 1)) * 100} className="h-2 bg-muted" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Updates</span>
                      <span className="text-sm text-muted-foreground">{stats.updatesCount}</span>
                    </div>
                    <Progress value={(stats.updatesCount / Math.max(stats.totalActions, 1)) * 100} className="h-2 bg-muted" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Deletes</span>
                      <span className="text-sm text-muted-foreground">{stats.deletesCount}</span>
                    </div>
                    <Progress value={(stats.deletesCount / Math.max(stats.totalActions, 1)) * 100} className="h-2 bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

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
                  {users.map((user, index) => {
                    const isOnline = activeSessions.some(s => s.user_id === user.id);
                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              {isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                              )}
                            </div>
                            <span className="font-medium">{user.full_name || 'No Name'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
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
                        <TableCell><span className="text-sm">{user.department_name || '—'}</span></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <div className={cn('w-2 h-2 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-slate-400')} />
                            <span className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        );

      case 'warehouse':
        return <WarehouseTransactionHistory departments={departments} />;

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
              <Badge variant="secondary">{filteredLogs.length} records</Badge>
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
                          <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
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
                                <div className="font-medium text-sm leading-tight">{log.user_name || 'System'}</div>
                                <div className="text-xs text-muted-foreground">{log.user_email?.split('@')[0] || 'system'}</div>
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
                            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">{log.table_name}</code>
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

          <div className="flex items-center gap-3 px-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">{stats.activeNow} online</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px] h-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="h-9 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading} className="h-9 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-1 px-1 py-2 bg-slate-100 dark:bg-slate-900 rounded-lg mb-4 overflow-x-auto">
          <Button variant={tableFilter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setTableFilter('all')} className="shrink-0">
            All Tables
          </Button>
          {tables.slice(0, 5).map((table) => (
            <Button key={table} variant={tableFilter === table ? 'default' : 'ghost'} size="sm" onClick={() => setTableFilter(table)} className="shrink-0 capitalize">
              {table.replace(/_/g, ' ')}
            </Button>
          ))}
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depts</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main Content */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left Sidebar */}
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
                      activeTool === tool.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <tool.icon className="w-4 h-4 shrink-0" />
                    <span className="text-sm">{tool.label}</span>
                    {activeTool === tool.id && <ChevronRight className="w-4 h-4 ml-auto" />}
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
                    <Wifi className="w-4 h-4" />
                    <span>Online Now</span>
                  </div>
                  <span className="font-bold text-emerald-600">{stats.activeNow}</span>
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

          {/* Main Content Area */}
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
              <DialogDescription>Complete details of the selected action</DialogDescription>
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
