import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSystemMonitor, SystemEvent, UserSession } from '@/hooks/useSystemMonitor';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Eye,
  FileText,
  Loader2,
  Monitor,
  RefreshCcw,
  Shield,
  User,
  Users,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Server,
  HardDrive,
  ArrowUpCircle,
  ArrowDownCircle,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const severityConfig: Record<string, { color: string; icon: React.ReactNode; bg: string }> = {
  critical: {
    color: 'text-red-500',
    icon: <XCircle className="w-4 h-4" />,
    bg: 'bg-red-500/10 border-red-500/30',
  },
  high: {
    color: 'text-orange-500',
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-orange-500/10 border-orange-500/30',
  },
  medium: {
    color: 'text-yellow-500',
    icon: <AlertCircle className="w-4 h-4" />,
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  low: {
    color: 'text-blue-500',
    icon: <Eye className="w-4 h-4" />,
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  info: {
    color: 'text-muted-foreground',
    icon: <Activity className="w-4 h-4" />,
    bg: 'bg-muted/50 border-muted',
  },
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  error: <XCircle className="w-4 h-4 text-red-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  suspicious: <Shield className="w-4 h-4 text-orange-500" />,
  performance: <Zap className="w-4 h-4 text-purple-500" />,
  auth_failure: <Shield className="w-4 h-4 text-red-500" />,
  info: <Activity className="w-4 h-4 text-blue-500" />,
};

export default function SystemHealth() {
  const {
    metrics,
    sessions,
    events,
    loading,
    lastRefresh,
    canView,
    refresh,
    resolveEvent,
    generateReport,
  } = useSystemMonitor(15000); // Refresh every 15 seconds

  const [activeTab, setActiveTab] = useState('overview');
  const [generatingReport, setGeneratingReport] = useState(false);

  const activeSessions = useMemo(
    () => sessions.filter((s) => s.is_active),
    [sessions]
  );

  const inactiveSessions = useMemo(
    () => sessions.filter((s) => !s.is_active),
    [sessions]
  );

  const unresolvedEvents = useMemo(
    () => events.filter((e) => !e.resolved),
    [events]
  );

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    await generateReport();
    setGeneratingReport(false);
  };

  if (!canView && !loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="w-5 h-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Only Super Admins can access System Health monitoring.
              </p>
              <Button onClick={() => (window.location.href = '/')} variant="outline" className="w-full">
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="System Health Monitor">
      <div className="space-y-4">
        {/* Header Bar */}
        <div className="flex items-center justify-between bg-card border rounded-lg px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-primary" />
              <span className="font-semibold">Real-Time Monitor</span>
            </div>
            
            {/* System Status Indicator */}
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
              metrics?.systemHealth.status === 'healthy' && 'bg-emerald-500/15 text-emerald-600',
              metrics?.systemHealth.status === 'degraded' && 'bg-yellow-500/15 text-yellow-600',
              metrics?.systemHealth.status === 'critical' && 'bg-red-500/15 text-red-600',
            )}>
              {metrics?.systemHealth.status === 'healthy' && <CheckCircle className="w-4 h-4" />}
              {metrics?.systemHealth.status === 'degraded' && <AlertTriangle className="w-4 h-4" />}
              {metrics?.systemHealth.status === 'critical' && <XCircle className="w-4 h-4" />}
              <span className="capitalize">{metrics?.systemHealth.status || 'Loading...'}</span>
            </div>

            {lastRefresh && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              disabled={generatingReport}
            >
              {generatingReport ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              Generate Report
            </Button>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCcw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-emerald-600">{activeSessions.length}</p>
                </div>
                <Wifi className="w-8 h-8 text-emerald-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-500/5 border-slate-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold text-slate-600">{inactiveSessions.length}</p>
                </div>
                <WifiOff className="w-8 h-8 text-slate-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-blue-600">{metrics?.totalUsers || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-500/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">DB Actions (24h)</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {(metrics?.dbStats.recentActivity.inserts24h || 0) +
                      (metrics?.dbStats.recentActivity.updates24h || 0) +
                      (metrics?.dbStats.recentActivity.deletes24h || 0)}
                  </p>
                </div>
                <Database className="w-8 h-8 text-purple-500/50" />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            unresolvedEvents.length > 0 
              ? 'bg-orange-500/5 border-orange-500/20' 
              : 'bg-muted/30'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Open Issues</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    unresolvedEvents.length > 0 ? 'text-orange-600' : 'text-muted-foreground'
                  )}>
                    {unresolvedEvents.length}
                  </p>
                </div>
                <AlertTriangle className={cn(
                  'w-8 h-8',
                  unresolvedEvents.length > 0 ? 'text-orange-500/50' : 'text-muted-foreground/30'
                )} />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            (metrics?.authMetrics.failedLogins24h || 0) > 0
              ? 'bg-red-500/5 border-red-500/20'
              : 'bg-muted/30'
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Failed Logins</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    (metrics?.authMetrics.failedLogins24h || 0) > 0 ? 'text-red-600' : 'text-muted-foreground'
                  )}>
                    {metrics?.authMetrics.failedLogins24h || 0}
                  </p>
                </div>
                <Shield className={cn(
                  'w-8 h-8',
                  (metrics?.authMetrics.failedLogins24h || 0) > 0 ? 'text-red-500/50' : 'text-muted-foreground/30'
                )} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Live Activity */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">
                  Active Users
                  {activeSessions.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                      {activeSessions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="events">
                  Events
                  {unresolvedEvents.length > 0 && (
                    <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                      {unresolvedEvents.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* System Health Issues */}
                {metrics?.systemHealth.issues.length ? (
                  <Card className="border-orange-500/30 bg-orange-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        Active Issues
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {metrics.systemHealth.issues.map((issue, i) => (
                          <li key={i} className="text-sm text-orange-700 dark:text-orange-400">
                            • {issue}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Activity Breakdown */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">24h Activity Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg">
                        <ArrowUpCircle className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Inserts</p>
                          <p className="text-lg font-semibold">{metrics?.dbStats.recentActivity.inserts24h || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
                        <Edit className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Updates</p>
                          <p className="text-lg font-semibold">{metrics?.dbStats.recentActivity.updates24h || 0}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Deletes</p>
                          <p className="text-lg font-semibold">{metrics?.dbStats.recentActivity.deletes24h || 0}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Events Preview */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Recent System Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {events.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No system events recorded yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {events.slice(0, 5).map((event) => (
                          <EventRow key={event.id} event={event} onResolve={resolveEvent} />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-emerald-500" />
                      Active Users ({activeSessions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      {activeSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No active users right now
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Current Page</TableHead>
                              <TableHead>Last Activity</TableHead>
                              <TableHead>Session Started</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {activeSessions.map((session) => (
                              <SessionRow key={session.id} session={session} isActive />
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                      Recently Inactive ({inactiveSessions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      {inactiveSessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No inactive sessions
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>User</TableHead>
                              <TableHead>Last Page</TableHead>
                              <TableHead>Last Seen</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {inactiveSessions.slice(0, 10).map((session) => (
                              <SessionRow key={session.id} session={session} isActive={false} />
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">All System Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      {events.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No system events recorded
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {events.map((event) => (
                            <EventRow key={event.id} event={event} onResolve={resolveEvent} expanded />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="database" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Database Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(metrics?.dbStats.totalRecords || {}).map(([table, count]) => (
                        <div key={table} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">{table.replace(/_/g, ' ')}</p>
                          <p className="text-lg font-semibold">{count.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Live Feed */}
          <div className="space-y-4">
            {/* Live Activity Feed */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary animate-pulse" />
                  Live Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {activeSessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No active sessions
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {activeSessions.map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg"
                        >
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.profiles?.full_name || session.profiles?.email || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {session.current_page || '/'}
                            </p>
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

            {/* Last Report */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Last System Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metrics?.lastReportAt ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Generated {formatDistanceToNow(new Date(metrics.lastReportAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(metrics.lastReportAt), 'PPpp')}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No reports generated yet</p>
                )}
              </CardContent>
            </Card>

            {/* Server Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  System Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Generated At</span>
                  <span className="text-sm font-medium">
                    {metrics?.generatedAt
                      ? format(new Date(metrics.generatedAt), 'HH:mm:ss')
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Refresh Rate</span>
                  <span className="text-sm font-medium">15s</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SessionRow({ session, isActive }: { session: UserSession; isActive: boolean }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            {isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {session.profiles?.full_name || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground">
              {session.profiles?.email}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm">{session.current_page || '/'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
      </TableCell>
      {isActive && (
        <TableCell className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(session.session_started), { addSuffix: true })}
        </TableCell>
      )}
    </TableRow>
  );
}

function EventRow({
  event,
  onResolve,
  expanded = false,
}: {
  event: SystemEvent;
  onResolve: (id: string) => void;
  expanded?: boolean;
}) {
  const config = severityConfig[event.severity] || severityConfig.info;
  const icon = eventTypeIcons[event.event_type] || eventTypeIcons.info;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        event.resolved ? 'bg-muted/20 opacity-60' : config.bg
      )}
    >
      <div className={cn('mt-0.5', config.color)}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{event.title}</p>
          <Badge variant="outline" className="text-xs">
            {event.event_type}
          </Badge>
          {event.resolved && (
            <Badge variant="secondary" className="text-xs">
              Resolved
            </Badge>
          )}
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
        </p>
      </div>
      {!event.resolved && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onResolve(event.id)}
          className="shrink-0"
        >
          <CheckCircle className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
