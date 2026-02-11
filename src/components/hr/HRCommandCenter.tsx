import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LayoutDashboard, Users, Calendar, Clock, Target, 
  UserPlus, BarChart3, Bell, Search, Settings, 
  Building2, AlertCircle, Home, ArrowLeft, Sun, Moon, Sunrise,
  Globe
} from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { usePositions } from '@/hooks/usePositions';
import { useDepartments } from '@/hooks/useDepartments';
import { useAttendance } from '@/hooks/useAttendance';
import { useCompanies } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

// Import sub-components
import { HROverviewTab } from './tabs/HROverviewTab';
import { EmployeeHubTab } from './tabs/EmployeeHubTab';
import { LeaveManagementTab } from './tabs/LeaveManagementTab';
import { AttendanceTrackingTab } from './tabs/AttendanceTrackingTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { OnboardingTab } from './tabs/OnboardingTab';
import { HRAnalyticsTab } from './tabs/HRAnalyticsTab';

interface HRCommandCenterProps {
  departmentId: string;
  departmentName: string;
  canManage: boolean;
}

const NAVIGATION_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, color: 'text-blue-500' },
  { id: 'employees', label: 'Employee Hub', icon: Users, color: 'text-emerald-500' },
  { id: 'leave', label: 'Leave Management', icon: Calendar, color: 'text-violet-500' },
  { id: 'attendance', label: 'Time & Attendance', icon: Clock, color: 'text-amber-500' },
  { id: 'performance', label: 'Performance', icon: Target, color: 'text-rose-500' },
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus, color: 'text-cyan-500' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'text-indigo-500' },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sunrise, color: 'text-amber-500' };
  if (hour < 17) return { text: 'Good afternoon', icon: Sun, color: 'text-orange-500' };
  return { text: 'Good evening', icon: Moon, color: 'text-indigo-500' };
}

export function HRCommandCenter({ departmentId, departmentName, canManage }: HRCommandCenterProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  
  // Real data from hooks
  const { leaveRequests = [], isLoading: leaveLoading } = useLeaveRequests(undefined, true);
  const { users = [], loading: usersLoading } = useUsers();
  const { positions = [], isLoading: positionsLoading } = usePositions();
  const { departments = [], loading: departmentsLoading } = useDepartments();
  const { records: attendanceRecords = [], isLoading: attendanceLoading } = useAttendance();
  const { companies = [], parentCompanies = [], loading: companiesLoading } = useCompanies();

  const greeting = getGreeting();

  // Calculate real metrics from actual data
  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Pending leave requests (status pending or manager_approved waiting for HR)
    const pendingLeaveRequests = leaveRequests.filter(r => 
      r.status === 'pending' || r.status === 'manager_approved'
    ).length;

    // Approved this month
    const approvedThisMonth = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      const date = new Date(r.created_at);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    }).length;

    // Rejected this month
    const rejectedThisMonth = leaveRequests.filter(r => {
      if (r.status !== 'rejected') return false;
      const date = new Date(r.created_at);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    }).length;

    // Active employees count
    const activeEmployees = users.length;

    // Open/active positions count
    const openPositions = positions.filter(p => p.is_active).length;

    // Department count
    const departmentCount = departments.length;

    // Employees on leave today (from approved leave requests)
    const employeesOnLeaveToday = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      try {
        const start = parseISO(r.start_date);
        const end = parseISO(r.end_date);
        return isWithinInterval(now, { start, end });
      } catch {
        return false;
      }
    }).length;

    return {
      pendingLeaveRequests,
      approvedThisMonth,
      rejectedThisMonth,
      activeEmployees,
      openPositions,
      departmentCount,
      employeesOnLeaveToday,
      employeeGrowth: 0,
      retentionRate: 0,
    };
  }, [leaveRequests, users, positions, departments]);

  // Get urgent items that need attention
  const urgentItems = useMemo(() => {
    const items: Array<{ type: string; title: string; priority: string; action: () => void }> = [];
    
    if (metrics.pendingLeaveRequests > 0) {
      items.push({
        type: 'leave',
        title: `${metrics.pendingLeaveRequests} leave request${metrics.pendingLeaveRequests > 1 ? 's' : ''} pending approval`,
        priority: 'high',
        action: () => setActiveTab('leave'),
      });
    }

    if (metrics.employeesOnLeaveToday > 0) {
      items.push({
        type: 'info',
        title: `${metrics.employeesOnLeaveToday} employee${metrics.employeesOnLeaveToday > 1 ? 's' : ''} on leave today`,
        priority: 'medium',
        action: () => setActiveTab('leave'),
      });
    }

    return items;
  }, [metrics]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="flex h-14 items-center px-4 gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Home</span>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-lg font-semibold text-foreground">{departmentName}</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="w-full">
        {/* HR Command Center Header */}
        <div className="bg-white dark:bg-slate-900 border-b shadow-sm">
          <div className="px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <greeting.icon className={cn("h-5 w-5", greeting.color)} />
                    <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
                      HR Command Center
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {greeting.text}! Manage your workforce with intelligence.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Company Selector */}
                {companies.length > 0 && (
                  <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="w-[180px] bg-muted/50 border-0 rounded-full h-9">
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {parentCompanies.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          🏢 {c.name}
                        </SelectItem>
                      ))}
                      {companies.filter(c => c.parent_id).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          └ {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Real Stats Pills */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Users className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {metrics.activeEmployees} Employees
                    </span>
                  </div>
                  {metrics.pendingLeaveRequests > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        {metrics.pendingLeaveRequests} Pending
                      </span>
                    </div>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-2">
                  <Separator orientation="vertical" className="h-8" />
                  <Button variant="outline" size="icon" className="rounded-xl">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-xl relative">
                    <Bell className="h-4 w-4" />
                    {urgentItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-medium">
                        {urgentItems.length}
                      </span>
                    )}
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-xl">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-4 md:px-6 bg-slate-50/50 dark:bg-slate-800/50">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 -mx-1 px-1">
              {NAVIGATION_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    activeTab === item.id
                      ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-md"
                      : "text-muted-foreground hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.label.split(' ')[0]}</span>
                  {item.id === 'leave' && metrics.pendingLeaveRequests > 0 && (
                    <Badge className={cn(
                      "h-5 min-w-5 px-1.5 border-0 text-xs",
                      activeTab === item.id 
                        ? "bg-white/20 hover:bg-white/20 text-white" 
                        : "bg-amber-500 hover:bg-amber-500 text-white"
                    )}>
                      {metrics.pendingLeaveRequests}
                    </Badge>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overview' && (
                <HROverviewTab 
                  departmentId={departmentId}
                  metrics={metrics}
                  urgentItems={urgentItems}
                  onNavigate={setActiveTab}
                />
              )}
              {activeTab === 'employees' && (
                <EmployeeHubTab departmentId={departmentId} />
              )}
              {activeTab === 'leave' && (
                <LeaveManagementTab departmentId={departmentId} />
              )}
              {activeTab === 'attendance' && (
                <AttendanceTrackingTab departmentId={departmentId} />
              )}
              {activeTab === 'performance' && (
                <PerformanceTab departmentId={departmentId} />
              )}
              {activeTab === 'onboarding' && (
                <OnboardingTab departmentId={departmentId} />
              )}
              {activeTab === 'analytics' && (
                <HRAnalyticsTab departmentId={departmentId} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
