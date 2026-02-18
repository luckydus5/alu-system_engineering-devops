import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, Users, Calendar, Clock,
  BarChart3, CalendarDays,
  Home, ChevronRight, Globe, ChevronDown
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
import { HRAnalyticsTab } from './tabs/HRAnalyticsTab';
import { WeekendRotationTab } from './tabs/WeekendRotationTab';

interface HRCommandCenterProps {
  departmentId: string;
  departmentName: string;
  canManage: boolean;
}

const NAVIGATION_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'employees', label: 'Employee Hub', icon: Users },
  { id: 'leave', label: 'Leave Management', icon: Calendar },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'weekend', label: 'Weekend & Rotation', icon: CalendarDays },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const COMPANY_COLORS: Record<string, string> = {
  'HQP': 'bg-primary',
  'HQPEAT': 'bg-success',
  'HQSVC': 'bg-warning',
  'FARM': 'bg-chart-4',
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
      {/* ── Hero Header ── */}
      <div className="gradient-hero text-primary-foreground">
        <div className="max-w-[1400px] mx-auto px-3 md:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center justify-between pt-3 pb-2">
            <div className="flex items-center gap-1.5 text-sm text-primary-foreground/60">
              <button onClick={() => navigate('/')} className="hover:text-primary-foreground transition-colors">
                <Home className="h-4 w-4" />
              </button>
              <ChevronRight className="h-3 w-3" />
              <span className="text-primary-foreground font-medium">Human Resources</span>
            </div>

            {/* Company Selector */}
            {companies.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                  className="flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground transition-colors border border-primary-foreground/10"
                >
                  <Globe className="h-3.5 w-3.5 text-secondary" />
                  <span>{selectedCompanyName}</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", companyDropdownOpen && "rotate-180")} />
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
                        className="absolute right-0 top-full mt-1.5 w-56 bg-card text-card-foreground border border-border rounded-xl shadow-corporate-lg z-50 overflow-hidden p-1"
                      >
                        <button
                          onClick={() => { setSelectedCompany('all'); setCompanyDropdownOpen(false); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                            selectedCompany === 'all' ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                          )}
                        >
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                          <span className="text-xs font-medium">All Companies</span>
                        </button>

                        <div className="h-px bg-border my-1" />

                        {parentCompanies.map(c => (
                          <div key={c.id}>
                            <button
                              onClick={() => { setSelectedCompany(c.id); setCompanyDropdownOpen(false); }}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                                selectedCompany === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
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
                                  selectedCompany === sub.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
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
          </div>

          {/* Title */}
          <div className="pt-3 pb-5">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              Human Resources
            </h1>
            <p className="text-primary-foreground/60 text-xs md:text-sm mt-1">
              Manage your workforce across {companies.length || 1} {companies.length > 1 ? 'companies' : 'company'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="sticky top-0 z-40 bg-card border-b shadow-corporate">
        <div className="max-w-[1400px] mx-auto">
          <nav
            className="flex items-center gap-1 px-2 md:px-8 overflow-x-auto py-1.5"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {NAVIGATION_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap rounded-lg transition-all shrink-0 touch-manipulation",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60 active:bg-muted"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 shrink-0" />
                  <span>{item.label}</span>
                  
                  {item.id === 'leave' && metrics.pendingLeaveRequests > 0 && (
                    <span className={cn(
                      "h-4 min-w-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center leading-none",
                      isActive 
                        ? "bg-primary-foreground text-primary" 
                        : "bg-destructive text-destructive-foreground"
                    )}>
                      {metrics.pendingLeaveRequests}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-[1400px] mx-auto px-3 md:px-8 py-4 md:py-8 pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
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
            {activeTab === 'employees' && <EmployeeHubTab departmentId={departmentId} />}
            {activeTab === 'leave' && <LeaveManagementTab departmentId={departmentId} />}
            {activeTab === 'attendance' && <AttendanceTrackingTab departmentId={departmentId} />}
            {activeTab === 'weekend' && <WeekendRotationTab departmentId={departmentId} />}
            {activeTab === 'analytics' && <HRAnalyticsTab departmentId={departmentId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
