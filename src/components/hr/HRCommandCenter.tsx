import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard, Users, Calendar, Clock, Target, 
  UserPlus, BarChart3, Bell, Search, Settings, 
  Building2, AlertCircle, Home, ArrowLeft, Sun, Moon, Sunrise,
  Globe, ChevronDown, Sparkles, Shield, Activity
} from 'lucide-react';
import { useLeaveRequests } from '@/hooks/useLeaveRequests';
import { useUsers } from '@/hooks/useUsers';
import { usePositions } from '@/hooks/usePositions';
import { useDepartments } from '@/hooks/useDepartments';
import { useAttendance } from '@/hooks/useAttendance';
import { useCompanies } from '@/hooks/useCompanies';
import { useEmployees } from '@/hooks/useEmployees';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

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
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: LayoutDashboard },
  { id: 'employees', label: 'Employee Hub', shortLabel: 'Employees', icon: Users },
  { id: 'leave', label: 'Leave Management', shortLabel: 'Leave', icon: Calendar },
  { id: 'attendance', label: 'Time & Attendance', shortLabel: 'Attendance', icon: Clock },
  { id: 'performance', label: 'Performance', shortLabel: 'Perform', icon: Target },
  { id: 'onboarding', label: 'Onboarding', shortLabel: 'Onboard', icon: UserPlus },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3 },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', icon: Sunrise };
  if (hour < 17) return { text: 'Good afternoon', icon: Sun };
  return { text: 'Good evening', icon: Moon };
}

const COMPANY_COLORS: Record<string, string> = {
  'HQP': 'from-blue-600 to-indigo-700',
  'HQPEAT': 'from-emerald-600 to-teal-700',
  'HQSVC': 'from-amber-500 to-orange-600',
  'FARM': 'from-lime-600 to-green-700',
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

  const greeting = getGreeting();

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
      {/* ═══════════════ PREMIUM HEADER ═══════════════ */}
      <header className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAzIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        
        <div className="relative z-10">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 md:px-8 py-3">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" size="sm" 
                onClick={() => navigate(-1)} 
                className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Back</span>
              </Button>
              <div className="h-5 w-px bg-white/20" />
              <Button 
                variant="ghost" size="sm" 
                onClick={() => navigate('/')} 
                className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Dashboard</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9 rounded-xl">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9 rounded-xl relative">
                <Bell className="h-4 w-4" />
                {urgentItems.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                    {urgentItems.length}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10 h-9 w-9 rounded-xl">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Hero section */}
          <div className="px-4 md:px-8 pb-6 pt-2">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl gradient-gold shadow-gold flex items-center justify-center shrink-0">
                  <Shield className="h-8 w-8 md:h-10 md:w-10 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <greeting.icon className="h-5 w-5 text-secondary" />
                    <span className="text-white/60 text-sm">{greeting.text}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    HR Command Center
                  </h1>
                  <p className="text-white/50 text-sm mt-1 max-w-md">
                    Unified workforce management across all companies
                  </p>
                </div>
              </div>

              {/* Stats pills + Company selector */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                {/* Company Selector - Custom dropdown */}
                {companies.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                        "bg-white/10 hover:bg-white/15 text-white border border-white/10",
                        "backdrop-blur-sm"
                      )}
                    >
                      <Globe className="h-4 w-4 text-secondary" />
                      <span>{selectedCompanyName}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", companyDropdownOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {companyDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setCompanyDropdownOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-64 bg-card border rounded-xl shadow-corporate-lg z-50 overflow-hidden"
                          >
                            <div className="p-2">
                              <button
                                onClick={() => { setSelectedCompany('all'); setCompanyDropdownOpen(false); }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                  selectedCompany === 'all' ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                                )}
                              >
                                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                  <Globe className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium">All Companies</p>
                                  <p className="text-xs text-muted-foreground">{employees.length} employees total</p>
                                </div>
                              </button>

                              <div className="h-px bg-border my-1.5" />

                              {parentCompanies.map(c => (
                                <div key={c.id}>
                                  <button
                                    onClick={() => { setSelectedCompany(c.id); setCompanyDropdownOpen(false); }}
                                    className={cn(
                                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                                      selectedCompany === c.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                                    )}
                                  >
                                    <div className={cn("h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center", COMPANY_COLORS[c.code] || 'from-primary to-accent')}>
                                      <Building2 className="h-4 w-4 text-white" />
                                    </div>
                                    <div>
                                      <p className="font-medium">{c.name}</p>
                                      <p className="text-xs text-muted-foreground">Parent company</p>
                                    </div>
                                  </button>

                                  {/* Subsidiaries */}
                                  {companies.filter(sub => sub.parent_id === c.id).map(sub => (
                                    <button
                                      key={sub.id}
                                      onClick={() => { setSelectedCompany(sub.id); setCompanyDropdownOpen(false); }}
                                      className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 pl-8 rounded-lg text-sm transition-colors text-left",
                                        selectedCompany === sub.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                                      )}
                                    >
                                      <div className={cn("h-7 w-7 rounded-lg bg-gradient-to-br flex items-center justify-center", COMPANY_COLORS[sub.code] || 'from-muted to-muted-foreground/20')}>
                                        <Building2 className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{sub.name}</p>
                                        <p className="text-xs text-muted-foreground">Subsidiary</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Quick stats */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">{metrics.activeEmployees}</span>
                  <span className="text-xs text-white/50">staff</span>
                </div>
                
                {metrics.pendingLeaveRequests > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 animate-pulse">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-200">{metrics.pendingLeaveRequests}</span>
                    <span className="text-xs text-amber-300/70">pending</span>
                  </div>
                )}

                {metrics.employeesOnLeaveToday > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 backdrop-blur-sm border border-violet-500/30">
                    <Calendar className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-sm font-semibold text-violet-200">{metrics.employeesOnLeaveToday}</span>
                    <span className="text-xs text-violet-300/70">on leave</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════ NAVIGATION ═══════════════ */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b shadow-sm">
        <div className="px-4 md:px-8">
          <nav className="flex items-center gap-0.5 overflow-x-auto py-1 -mx-1 px-1 mobile-scroll-x">
            {NAVIGATION_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                  
                  {item.id === 'leave' && metrics.pendingLeaveRequests > 0 && (
                    <Badge 
                      className={cn(
                        "h-5 min-w-5 px-1.5 text-[10px] font-bold border-0",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-destructive text-destructive-foreground"
                      )}
                    >
                      {metrics.pendingLeaveRequests}
                    </Badge>
                  )}

                  {/* Active indicator line */}
                  {isActive && (
                    <motion.div
                      layoutId="hr-tab-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ═══════════════ CONTENT ═══════════════ */}
      <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
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
