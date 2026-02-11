import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, LogIn, LogOut, Users, CalendarIcon, RefreshCw,
  Timer, TrendingUp, AlertCircle, CheckCircle2, Coffee,
  ChevronLeft, ChevronRight, BarChart3, Search, Download,
  Table2, LayoutGrid
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  getDay, getDaysInMonth, addMonths, subMonths, getYear, getMonth,
  isWeekend, isSaturday, isSunday
} from 'date-fns';
import { useAttendance, useMyAttendance, ATTENDANCE_STATUS_LABELS, AttendanceStatus } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

interface AttendanceTrackingTabProps {
  departmentId: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, { color: string; bgColor: string; dotColor: string }> = {
  present: { color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', dotColor: 'bg-emerald-500' },
  late: { color: 'text-amber-600', bgColor: 'bg-amber-500/10', dotColor: 'bg-amber-500' },
  absent: { color: 'text-red-600', bgColor: 'bg-red-500/10', dotColor: 'bg-red-500' },
  half_day: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', dotColor: 'bg-blue-500' },
  on_leave: { color: 'text-violet-600', bgColor: 'bg-violet-500/10', dotColor: 'bg-violet-500' },
  remote: { color: 'text-teal-600', bgColor: 'bg-teal-500/10', dotColor: 'bg-teal-500' },
};

// Excel-like notation mapping
function getExcelNotation(dayDate: Date, record?: any): { label: string; color: string; bg: string } {
  if (isSunday(dayDate)) {
    if (record && (record.status === 'present' || record.status === 'late' || record.status === 'remote')) {
      return { label: 'OT', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30' };
    }
    return { label: '—', color: 'text-muted-foreground', bg: 'bg-slate-100 dark:bg-slate-800' };
  }
  if (isSaturday(dayDate)) {
    if (record && (record.status === 'present' || record.status === 'late' || record.status === 'remote')) {
      return { label: 'OT', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30' };
    }
    return { label: '½', color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' };
  }
  if (!record || record.status === 'absent') {
    return { label: 'OFF', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
  }
  if (record.status === 'on_leave') {
    return { label: 'OFF', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' };
  }
  if (record.status === 'half_day') {
    return { label: '½', color: 'text-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20' };
  }
  return { label: 'ON', color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
}

const DAY_ABBREV = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Monthly attendance grid view (like Excel pages 5+)
function MonthlyGrid({ records, selectedMonth, users, departments, searchTerm, filterDepartment }: {
  records: any[];
  selectedMonth: Date;
  users: any[];
  departments: any[];
  searchTerm: string;
  filterDepartment: string;
}) {
  const daysInMonth = getDaysInMonth(selectedMonth);
  const year = getYear(selectedMonth);
  const month = getMonth(selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  // Group records by user
  const userRecords = useMemo(() => {
    const map = new Map<string, any[]>();
    records.forEach(r => {
      const list = map.get(r.user_id) || [];
      list.push(r);
      map.set(r.user_id, list);
    });
    return map;
  }, [records]);

  // Build employee list with department grouping
  const employeeList = useMemo(() => {
    let filtered = users.filter(u => {
      const matchesSearch = !searchTerm || 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || u.departmentId === filterDepartment;
      return matchesSearch && matchesDept;
    });

    // Group by department
    const grouped = new Map<string, any[]>();
    filtered.forEach(u => {
      const deptName = departments.find(d => d.id === u.departmentId)?.name || 'Unassigned';
      const list = grouped.get(deptName) || [];
      list.push(u);
      grouped.set(deptName, list);
    });

    return grouped;
  }, [users, searchTerm, filterDepartment, departments]);

  const getRecordForDay = (userId: string, day: Date) => {
    const recs = userRecords.get(userId) || [];
    return recs.find(r => {
      const recDate = new Date(r.date || r.attendance_date);
      return isSameDay(recDate, day);
    });
  };

  const calculateMonthStats = (userId: string) => {
    const recs = userRecords.get(userId) || [];
    let present = 0, absent = 0, ot = 0;

    days.forEach(day => {
      const rec = getRecordForDay(userId, day);
      if (isSunday(day)) {
        if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'remote')) ot++;
      } else if (isSaturday(day)) {
        if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'remote')) ot++;
      } else {
        if (rec && rec.status !== 'absent' && rec.status !== 'on_leave') present++;
        else absent++;
      }
    });

    return { present, absent, ot };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 className="h-5 w-5 text-primary" />
              {format(selectedMonth, 'MMMM yyyy')} — Staff Attendance
            </CardTitle>
            <CardDescription>
              ON = Present | OFF = Absent | ½ = Saturday (Half Day) | — = Sunday (Rest) | OT = Overtime
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="sticky left-0 z-10 bg-muted/90 px-2 py-2 text-left font-semibold w-8">No</th>
                  <th className="sticky left-8 z-10 bg-muted/90 px-2 py-2 text-left font-semibold min-w-[160px]">Name</th>
                  <th className="px-1 py-2 text-center font-semibold w-14">Dept</th>
                  {days.map((day, i) => (
                    <th key={i} className={cn(
                      "px-0.5 py-1 text-center font-medium w-8 min-w-[28px]",
                      isSunday(day) && "bg-slate-200 dark:bg-slate-700",
                      isSaturday(day) && "bg-blue-50 dark:bg-blue-900/20",
                    )}>
                      <div className="text-[10px] text-muted-foreground">{DAY_ABBREV[getDay(day)]}</div>
                      <div>{i + 1}</div>
                    </th>
                  ))}
                  <th className="px-1 py-2 text-center font-semibold bg-emerald-50 dark:bg-emerald-900/20 w-8">P</th>
                  <th className="px-1 py-2 text-center font-semibold bg-red-50 dark:bg-red-900/20 w-8">A</th>
                  <th className="px-1 py-2 text-center font-semibold bg-orange-50 dark:bg-orange-900/20 w-8">OT</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(employeeList.entries()).map(([deptName, deptUsers]) => (
                  <>
                    <tr key={`dept-${deptName}`} className="bg-primary/5 border-b">
                      <td colSpan={daysInMonth + 6} className="px-2 py-1.5 font-bold text-sm text-primary">
                        ► {deptName.toUpperCase()}
                      </td>
                    </tr>
                    {deptUsers.map((user, idx) => {
                      const stats = calculateMonthStats(user.id);
                      return (
                        <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="sticky left-0 z-10 bg-background px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                          <td className="sticky left-8 z-10 bg-background px-2 py-1.5 font-medium truncate max-w-[160px]">{user.full_name || user.email}</td>
                          <td className="px-1 py-1.5 text-center text-muted-foreground">{deptName.substring(0, 6)}</td>
                          {days.map((day, i) => {
                            const record = getRecordForDay(user.id, day);
                            const notation = getExcelNotation(day, record);
                            return (
                              <td key={i} className={cn("px-0 py-1 text-center", notation.bg)}>
                                <span className={cn("text-[11px] font-semibold", notation.color)}>
                                  {notation.label}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-1 py-1.5 text-center font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">{stats.present}</td>
                          <td className="px-1 py-1.5 text-center font-bold text-red-600 bg-red-50 dark:bg-red-900/20">{stats.absent}</td>
                          <td className="px-1 py-1.5 text-center font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20">{stats.ot}</td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Annual summary view (like Excel page 1)
function AnnualSummary({ records, users, departments, searchTerm, filterDepartment, selectedYear }: {
  records: any[];
  users: any[];
  departments: any[];
  searchTerm: string;
  filterDepartment: string;
  selectedYear: number;
}) {
  // Group records by user and month
  const userMonthData = useMemo(() => {
    const map = new Map<string, Record<number, { present: number; absent: number; ot: number }>>();

    records.forEach(r => {
      const date = new Date(r.date || r.attendance_date);
      if (date.getFullYear() !== selectedYear) return;
      const month = date.getMonth();
      const userId = r.user_id;

      if (!map.has(userId)) map.set(userId, {});
      const userMap = map.get(userId)!;
      if (!userMap[month]) userMap[month] = { present: 0, absent: 0, ot: 0 };

      if (isSunday(date) || isSaturday(date)) {
        if (r.status === 'present' || r.status === 'late' || r.status === 'remote') {
          userMap[month].ot++;
        }
      } else {
        if (r.status !== 'absent' && r.status !== 'on_leave') {
          userMap[month].present++;
        } else {
          userMap[month].absent++;
        }
      }
    });

    return map;
  }, [records, selectedYear]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !searchTerm || 
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || u.departmentId === filterDepartment;
      return matchesSearch && matchesDept;
    });
  }, [users, searchTerm, filterDepartment]);

  // Group by department
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredUsers.forEach(u => {
      const deptName = departments.find(d => d.id === u.departmentId)?.name || 'Unassigned';
      const list = map.get(deptName) || [];
      list.push(u);
      map.set(deptName, list);
    });
    return map;
  }, [filteredUsers, departments]);

  // Total working days per month (Mon-Fri only)
  const totalWorkingDays = 287; // As per Excel: 287.0 working days in 2025

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Staff Attendance Summary {selectedYear}
            </CardTitle>
            <CardDescription>Prepared: {format(new Date(), 'dd MMMM yyyy')} | Staff Only | Organized by Department</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Legend: <span className="text-emerald-600 font-bold ml-1">ON</span> Present | 
              <span className="text-red-600 font-bold ml-1">OFF</span> Absent | 
              <span className="text-blue-600 font-bold ml-1">½</span> Saturday | 
              <span className="text-muted-foreground font-bold ml-1">—</span> Sunday | 
              <span className="text-orange-600 font-bold ml-1">OT</span> Overtime
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="sticky left-0 z-10 bg-muted/90 px-2 py-2 text-left font-semibold w-8">No</th>
                  <th className="sticky left-8 z-10 bg-muted/90 px-2 py-2 text-left font-semibold min-w-[160px]">Name</th>
                  <th className="px-1 py-2 text-center font-semibold w-14">Dept</th>
                  {MONTH_NAMES.map(m => (
                    <th key={m} className="px-1 py-2 text-center font-semibold w-10">{m}</th>
                  ))}
                  <th className="px-2 py-2 text-center font-semibold bg-emerald-50 dark:bg-emerald-900/20">Present</th>
                  <th className="px-2 py-2 text-center font-semibold bg-red-50 dark:bg-red-900/20">Absent</th>
                  <th className="px-2 py-2 text-center font-semibold bg-orange-50 dark:bg-orange-900/20">OT</th>
                  <th className="px-2 py-2 text-center font-semibold bg-blue-50 dark:bg-blue-900/20">Rate</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(grouped.entries()).map(([deptName, deptUsers]) => (
                  <>
                    <tr key={`dept-${deptName}`} className="bg-primary/5 border-b">
                      <td colSpan={19} className="px-2 py-1.5 font-bold text-sm text-primary">
                        ► {deptName.toUpperCase()}
                      </td>
                    </tr>
                    {deptUsers.map((user, idx) => {
                      const monthData = userMonthData.get(user.id) || {};
                      let totalPresent = 0, totalAbsent = 0, totalOT = 0;

                      const monthValues = MONTH_NAMES.map((_, i) => {
                        const data = monthData[i] || { present: 0, absent: 0, ot: 0 };
                        totalPresent += data.present;
                        totalAbsent += data.absent;
                        totalOT += data.ot;
                        return data.present;
                      });

                      const rate = totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 0;

                      return (
                        <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="sticky left-0 z-10 bg-background px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                          <td className="sticky left-8 z-10 bg-background px-2 py-1.5 font-medium truncate max-w-[160px]">{user.full_name || user.email}</td>
                          <td className="px-1 py-1.5 text-center text-muted-foreground">{deptName.substring(0, 6)}</td>
                          {monthValues.map((val, i) => (
                            <td key={i} className="px-1 py-1.5 text-center">{val}</td>
                          ))}
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">{totalPresent}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-red-600 bg-red-50 dark:bg-red-900/20">{totalAbsent}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20">{totalOT}</td>
                          <td className={cn(
                            "px-2 py-1.5 text-center font-bold bg-blue-50 dark:bg-blue-900/20",
                            rate >= 85 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600"
                          )}>
                            {rate}%
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function AttendanceTrackingTab({ departmentId }: AttendanceTrackingTabProps) {
  const [activeView, setActiveView] = useState<'monthly' | 'annual' | 'my'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { departments } = useDepartments();
  const { users } = useUsers();
  const { records, isLoading, refetch, clockIn, clockOut } = useAttendance(
    filterDepartment === 'all' ? undefined : filterDepartment
  );
  const { todayRecord } = useMyAttendance();

  const canClockIn = !todayRecord?.clock_in;
  const canClockOut = todayRecord?.clock_in && !todayRecord?.clock_out;

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '--:--';
    return format(new Date(timestamp), 'h:mm a');
  };

  return (
    <div className="space-y-6">
      {/* My Attendance Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 overflow-hidden relative">
        <CardContent className="p-6 relative">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Clock className="h-8 w-8" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Today's Status</p>
                <h2 className="text-2xl font-bold">
                  {todayRecord ? (
                    <>
                      {formatTime(todayRecord.clock_in)} 
                      {todayRecord.clock_out && ` - ${formatTime(todayRecord.clock_out)}`}
                    </>
                  ) : 'Not clocked in'}
                </h2>
                {todayRecord && (
                  <Badge className="bg-white/20 text-white border-0 mt-1">
                    {ATTENDANCE_STATUS_LABELS[todayRecord.status]}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              {canClockIn && (
                <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90"
                  onClick={() => clockIn.mutateAsync(departmentId)} disabled={clockIn.isPending}>
                  <LogIn className="h-5 w-5 mr-2" /> Clock In
                </Button>
              )}
              {canClockOut && (
                <Button size="lg" className="bg-white/20 hover:bg-white/30 text-white border-white/30" variant="outline"
                  onClick={() => clockOut.mutateAsync()} disabled={clockOut.isPending}>
                  <LogOut className="h-5 w-5 mr-2" /> Clock Out
                </Button>
              )}
              {todayRecord?.clock_out && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" /><span className="font-medium">Day Complete</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {activeView === 'monthly' && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">{format(selectedMonth, 'MMMM yyyy')}</span>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border p-1">
                <Button variant={activeView === 'monthly' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('monthly')}>
                  <Table2 className="h-4 w-4 mr-2" /> Monthly Grid
                </Button>
                <Button variant={activeView === 'annual' ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveView('annual')}>
                  <BarChart3 className="h-4 w-4 mr-2" /> Annual Summary
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeView === 'monthly' ? (
        <MonthlyGrid
          records={records}
          selectedMonth={selectedMonth}
          users={users}
          departments={departments}
          searchTerm={searchTerm}
          filterDepartment={filterDepartment}
        />
      ) : (
        <AnnualSummary
          records={records}
          users={users}
          departments={departments}
          searchTerm={searchTerm}
          filterDepartment={filterDepartment}
          selectedYear={selectedYear}
        />
      )}
    </div>
  );
}
