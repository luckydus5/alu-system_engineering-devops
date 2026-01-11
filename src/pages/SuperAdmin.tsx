import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserRole } from '@/hooks/useUserRole';
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
  User
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
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const tables = [
    'inventory_items',
    'fleets',
    'maintenance_records',
    'reports',
    'user_roles',
    'departments',
    'stock_transactions',
  ];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (highestRole === 'super_admin' || highestRole === 'admin') {
      fetchLogs();
    }
  }, [highestRole, tableFilter, actionFilter]);

  // Check if user is super_admin or admin
  if (!roleLoading && highestRole !== 'super_admin' && highestRole !== 'admin') {
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
                You do not have permission to access this page. Only Super Admins can view audit logs.
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Super Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor all system activity and audit logs
            </p>
          </div>
          <Button onClick={fetchLogs} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-500" /> Inserts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {logs.filter((l) => l.action === 'INSERT').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-500" /> Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {logs.filter((l) => l.action === 'UPDATE').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" /> Deletes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {logs.filter((l) => l.action === 'DELETE').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Audit Logs
                </CardTitle>
                <CardDescription>
                  Complete history of all system changes
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Filter by table" />
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
                  <SelectTrigger className="w-[140px]">
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
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No audit logs found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLogs.map((log) => (
                        <>
                          <TableRow 
                            key={log.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                          >
                            <TableCell className="font-mono text-xs">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                {format(new Date(log.created_at), 'MMM dd, HH:mm:ss')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium text-sm">
                                    {log.user_name || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {log.user_email}
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
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedLog === log.id && (
                            <TableRow>
                              <TableCell colSpan={5} className="bg-muted/30 p-4">
                                <div className="space-y-3">
                                  {log.action === 'UPDATE' && (
                                    <div>
                                      <h4 className="font-semibold text-sm mb-2">Changed Fields:</h4>
                                      <div className="space-y-2">
                                        {getChangedFields(log.old_data, log.new_data).map((change) => (
                                          <div key={change.field} className="flex gap-4 text-sm">
                                            <span className="font-mono font-medium w-32">{change.field}:</span>
                                            <span className="text-red-600 line-through">
                                              {JSON.stringify(change.oldValue)}
                                            </span>
                                            <span className="text-green-600">
                                              → {JSON.stringify(change.newValue)}
                                            </span>
                                          </div>
                                        ))}
                                        {getChangedFields(log.old_data, log.new_data).length === 0 && (
                                          <span className="text-muted-foreground">No field changes detected</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {log.action === 'INSERT' && log.new_data && (
                                    <div>
                                      <h4 className="font-semibold text-sm mb-2">New Record:</h4>
                                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                                        {JSON.stringify(log.new_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {log.action === 'DELETE' && log.old_data && (
                                    <div>
                                      <h4 className="font-semibold text-sm mb-2">Deleted Record:</h4>
                                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                                        {JSON.stringify(log.old_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  <div className="text-xs text-muted-foreground">
                                    Record ID: <code>{log.record_id}</code>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
