import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, Users, Calendar, Clock, Target, 
  UserPlus, BarChart3, Search, 
  Building2, Home, ArrowLeft,
  Globe, ChevronDown, ChevronRight
} from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { usePositions } from '@/hooks/usePositions';
import { useDepartments } from '@/hooks/useDepartments';
import { useAttendance } from '@/hooks/useAttendance';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

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
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'employees', label: 'People', icon: Users },
  { id: 'leave', label: 'Leave', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'performance', label: 'Performance', icon: Target },
  { id: 'onboarding', label: 'Onboarding', icon: UserPlus },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const COMPANY_COLORS: Record<string, string> = {
  'HQP': 'bg-blue-500',
  'HQPEAT': 'bg-emerald-500',
  'HQSVC': 'bg-amber-500',
  'FARM': 'bg-lime-600',
};

export function HRCommandCenter({ departmentId, departmentName, canManage }: HRCommandCenterProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  
  const { leaveRequests = [], isLoading: leaveLoading } = useLeaveRequests(undefined, true);
  const { users = [], loading: usersLoading } = useUsers();
  const { positions = [], isLoading: positionsLoading } = usePositions();
  const { departments = [], loading: departmentsLoading } = useDepartments();
  const { records: attendanceRecords = [], isLoading: attendanceLoading } = useAttendance();
  const { companies = [], parentCompanies = [], loading: companiesLoading } = useCompanies();
  const { employees = [] } = useEmployees();

  const selectedCompanyData = companies.find(c => c.id === selectedCompany);
  const selectedCompanyName = selectedCompany === 'all' ? 'All Companies' : selectedCompanyData?.name || 'All Companies';

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const pendingLeaveRequests = leaveRequests.filter(r => 
      r.status === 'pending' || r.status === 'manager_approved'
    ).length;

    const approvedThisMonth = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      const date = new Date(r.created_at);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    }).length;

    const rejectedThisMonth = leaveRequests.filter(r => {
      if (r.status !== 'rejected') return false;
      const date = new Date(r.created_at);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    }).length;

    const activeEmployees = employees.length || users.length;
    const openPositions = positions.filter(p => p.is_active).length;
    const departmentCount = departments.length;

    const employeesOnLeaveToday = leaveRequests.filter(r => {
      if (r.status !== 'approved') return false;
      try {
        const start = parseISO(r.start_date);
        const end = parseISO(r.end_date);
        return isWithinInterval(now, { start, end });
      } catch { return false; }
    }).length;

    return {
      pendingLeaveRequests, approvedThisMonth, rejectedThisMonth,
      activeEmployees, openPositions, departmentCount, employeesOnLeaveToday,
      employeeGrowth: 0, retentionRate: 0,
    };
  }, [leaveRequests, users, employees, positions, departments]);

  const urgentItems = useMemo(() => {
    const items: Array<{ type: string; title: string; priority: string; action: () => void }> = [];
    if (metrics.pendingLeaveRequests > 0) {
      items.push({
        type: 'leave', priority: 'high',
        title: `${metrics.pendingLeaveRequests} leave request${metrics.pendingLeaveRequests > 1 ? 's' : ''} pending`,
        action: () => setActiveTab('leave'),
      });
    }
    if (metrics.employeesOnLeaveToday > 0) {
      items.push({
        type: 'info', priority: 'medium',
        title: `${metrics.employeesOnLeaveToday} on leave today`,
        action: () => setActiveTab('leave'),
      });
    }
    return items;
  }, [metrics]);

  return (
    <div className="min-h-screen w-full bg-background">
      {/* ── Breadcrumb Bar ── */}
      <div className="border-b bg-card/60 backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-between h-12">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <button onClick={() => navigate('/')} className="hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Human Resources</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Company Selector */}
            {companies.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium bg-muted/60 hover:bg-muted transition-colors"
                >
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{selectedCompanyName}</span>
                  <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", companyDropdownOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {companyDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setCompanyDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1.5 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden p-1"
                      >
                        <button
                          onClick={() => { setSelectedCompany('all'); setCompanyDropdownOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                            selectedCompany === 'all' ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                          )}
                        >
                          <div className="h-2 w-2 rounded-full bg-foreground/30" />
                          <span className="text-xs font-medium">All Companies</span>
                        </button>

                        <div className="h-px bg-border my-1" />

                        {parentCompanies.map(c => (
                          <div key={c.id}>
                            <button
                              onClick={() => { setSelectedCompany(c.id); setCompanyDropdownOpen(false); }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                                selectedCompany === c.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                              )}
                            >
                              <div className={cn("h-2 w-2 rounded-full", COMPANY_COLORS[c.code] || 'bg-primary')} />
                              <span className="text-xs font-medium">{c.name}</span>
                            </button>
                            {companies.filter(sub => sub.parent_id === c.id).map(sub => (
                              <button
                                key={sub.id}
                                onClick={() => { setSelectedCompany(sub.id); setCompanyDropdownOpen(false); }}
                                className={cn(
                                  "w-full flex items-center gap-2.5 px-3 py-2 pl-7 rounded-lg text-sm text-left transition-colors",
                                  selectedCompany === sub.id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                                )}
                              >
                                <div className={cn("h-1.5 w-1.5 rounded-full", COMPANY_COLORS[sub.code] || 'bg-muted-foreground')} />
                                <span className="text-xs">{sub.name}</span>
                              </button>
                            ))}
                          </div>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Page Title ── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 pb-2">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Human Resources
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your workforce across {companies.length || 1} {companies.length > 1 ? 'companies' : 'company'}
        </p>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-0.5 overflow-x-auto mobile-scroll-x border-b">
            {NAVIGATION_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/70"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  
                  {item.id === 'leave' && metrics.pendingLeaveRequests > 0 && (
                    <span className={cn(
                      "h-5 min-w-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center",
                      isActive 
                        ? "bg-foreground text-background" 
                        : "bg-destructive text-destructive-foreground"
                    )}>
                      {metrics.pendingLeaveRequests}
                    </span>
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="hr-tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-[2px] bg-foreground rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'overview' && (
              <HROverviewTab 
                departmentId={departmentId}
                metrics={metrics}
                urgentItems={urgentItems}
                onNavigate={setActiveTab}
              />
            )}
            {activeTab === 'employees' && <EmployeeHubTab departmentId={departmentId} />}
            {activeTab === 'leave' && <LeaveManagementTab departmentId={departmentId} />}
            {activeTab === 'attendance' && <AttendanceTrackingTab departmentId={departmentId} />}
            {activeTab === 'performance' && <PerformanceTab departmentId={departmentId} />}
            {activeTab === 'onboarding' && <OnboardingTab departmentId={departmentId} />}
            {activeTab === 'analytics' && <HRAnalyticsTab departmentId={departmentId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
