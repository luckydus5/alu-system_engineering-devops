import { useState, useMemo, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Clock, Users, CalendarIcon, RefreshCw,
  TrendingUp, AlertCircle, CheckCircle2,
  ChevronLeft, ChevronRight, BarChart3, Search,
  Table2, Upload, FileSpreadsheet, X, Loader2,
  UserCheck, UserX, Timer, Award, Sun, Moon
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, isSameDay, 
  getDay, getDaysInMonth, addMonths, subMonths, getYear, getMonth,
  isSaturday, isSunday, parse
} from 'date-fns';
import { useAttendance, useMyAttendance, ATTENDANCE_STATUS_LABELS, AttendanceStatus } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { useCompanyPolicies } from '@/hooks/useCompanyPolicies';
import { buildPolicyValues, processAttendanceRecord } from '@/lib/timesheetProcessor';
import { buildClassifier, type ClassificationSummary } from '@/lib/attendanceClassifier';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

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

function getExcelNotation(dayDate: Date, record?: any): { label: string; color: string; bg: string } {
  if (isSunday(dayDate)) {
    if (record && (record.status === 'present' || record.status === 'late' || record.status === 'remote')) {
      return { label: 'OT', color: 'text-orange-700', bg: 'bg-orange-100 dark:bg-orange-900/30' };
    }
    return { label: '—', color: 'text-muted-foreground', bg: 'bg-slate-100 dark:bg-slate-800' };
  }
  if (isSaturday(dayDate)) {
    if (record && (record.status === 'present' || record.status === 'late' || record.status === 'remote')) {
      return { label: '½', color: 'text-emerald-700', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
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

/* ─── KPI Summary Cards ─── */
function AttendanceKPICards({ records, users, employees, selectedMonth }: { records: any[]; users: any[]; employees: any[]; selectedMonth: Date }) {
  const stats = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const monthRecords = records.filter(r => {
      const d = new Date(r.date || r.attendance_date);
      return d >= monthStart && d <= monthEnd;
    });

    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'remote').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const onLeave = monthRecords.filter(r => r.status === 'on_leave').length;
    const total = monthRecords.length || 1;
    const attendanceRate = Math.round(((present + late) / total) * 100);

    // Use employees count as primary, fall back to auth users if no employees
    const totalEmployees = employees.length > 0 ? employees.length : users.length;

    return { present, late, absent, onLeave, attendanceRate, totalEmployees, totalRecords: monthRecords.length };
  }, [records, users, employees, selectedMonth]);

  const cards = [
    { title: 'Total Employees', value: stats.totalEmployees, icon: Users, color: 'bg-primary', iconColor: 'text-primary-foreground' },
    { title: 'Present', value: stats.present, icon: UserCheck, color: 'bg-success', iconColor: 'text-success-foreground' },
    { title: 'Late Arrivals', value: stats.late, icon: Timer, color: 'bg-warning', iconColor: 'text-warning-foreground' },
    { title: 'Absent', value: stats.absent, icon: UserX, color: 'bg-destructive', iconColor: 'text-destructive-foreground' },
    { title: 'On Leave', value: stats.onLeave, icon: CalendarIcon, color: 'bg-info', iconColor: 'text-info-foreground' },
    { title: 'Attendance Rate', value: `${stats.attendanceRate}%`, icon: Award, color: 'bg-chart-5', iconColor: 'text-white' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="shadow-corporate hover:shadow-corporate-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
              </div>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", card.color)}>
                <card.icon className={cn("h-5 w-5", card.iconColor)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ─── Attendance Charts Row ─── */
function AttendanceCharts({ records, selectedMonth }: { records: any[]; selectedMonth: Date }) {
  const { pieData, barData } = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const monthRecords = records.filter(r => {
      const d = new Date(r.date || r.attendance_date);
      return d >= monthStart && d <= monthEnd;
    });

    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'remote').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const onLeave = monthRecords.filter(r => r.status === 'on_leave').length;

    const pie = [
      { name: 'Present', value: present, color: 'hsl(160, 70%, 40%)' },
      { name: 'Late', value: late, color: 'hsl(40, 85%, 55%)' },
      { name: 'Absent', value: absent, color: 'hsl(0, 72%, 51%)' },
      { name: 'On Leave', value: onLeave, color: 'hsl(280, 65%, 55%)' },
    ].filter(d => d.value > 0);

    // Weekly breakdown
    const weeks: Record<string, { present: number; late: number; absent: number }> = {};
    monthRecords.forEach(r => {
      const d = new Date(r.date || r.attendance_date);
      const weekNum = `Week ${Math.ceil(d.getDate() / 7)}`;
      if (!weeks[weekNum]) weeks[weekNum] = { present: 0, late: 0, absent: 0 };
      if (r.status === 'present' || r.status === 'remote') weeks[weekNum].present++;
      else if (r.status === 'late') weeks[weekNum].late++;
      else if (r.status === 'absent') weeks[weekNum].absent++;
    });

    const bar = Object.entries(weeks).map(([week, data]) => ({ week, ...data }));

    return { pieData: pie, barData: bar };
  }, [records, selectedMonth]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Pie Chart */}
      <Card className="shadow-corporate">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Attendance Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="h-[160px] w-[160px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2.5 flex-1">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="shadow-corporate">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-info" />
            Weekly Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', fontSize: '12px' }} />
                <Bar dataKey="present" fill="hsl(160, 70%, 40%)" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="hsl(40, 85%, 55%)" radius={[4, 4, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Monthly Grid ─── */
function MonthlyGrid({ records, selectedMonth, users, employees, departments, searchTerm, filterDepartment }: {
  records: any[]; selectedMonth: Date; users: any[]; employees: any[]; departments: any[]; searchTerm: string; filterDepartment: string;
}) {
  const daysInMonth = getDaysInMonth(selectedMonth);
  const year = getYear(selectedMonth);
  const month = getMonth(selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  const userRecords = useMemo(() => {
    const map = new Map<string, any[]>();
    records.forEach(r => {
      const list = map.get(r.user_id) || [];
      list.push(r);
      map.set(r.user_id, list);
    });
    return map;
  }, [records]);

  // Merge employees and auth users into a unified list
  // Employees with linked_user_id use that for attendance lookup; others use their own id
  const mergedUsers = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; attendanceKey: string; full_name: string; department_id: string | null }[] = [];
    
    // Add employees first (primary source)
    employees.forEach((e: any) => {
      const attendanceKey = e.linked_user_id || e.id;
      if (!seen.has(attendanceKey)) {
        seen.add(attendanceKey);
        result.push({ id: e.id, attendanceKey, full_name: e.full_name, department_id: e.department_id });
      }
    });
    
    // Add auth users who aren't already represented by an employee record
    users.forEach((u: any) => {
      if (!seen.has(u.id)) {
        seen.add(u.id);
        result.push({ id: u.id, attendanceKey: u.id, full_name: u.full_name || u.email, department_id: u.department_id });
      }
    });
    
    return result;
  }, [employees, users]);

  const employeeList = useMemo(() => {
    let filtered = mergedUsers.filter(u => {
      const matchesSearch = !searchTerm || u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || u.department_id === filterDepartment;
      return matchesSearch && matchesDept;
    });
    const grouped = new Map<string, typeof filtered>();
    filtered.forEach(u => {
      const deptName = departments.find((d: any) => d.id === u.department_id)?.name || 'Unassigned';
      const list = grouped.get(deptName) || [];
      list.push(u);
      grouped.set(deptName, list);
    });
    return grouped;
  }, [mergedUsers, searchTerm, filterDepartment, departments]);

  const getRecordForDay = (userId: string, day: Date) => {
    // Try both the employee id and attendanceKey
    const recs = userRecords.get(userId) || [];
    return recs.find(r => {
      const recDate = new Date(r.date || r.attendance_date);
      return isSameDay(recDate, day);
    });
  };

  const calculateMonthStats = (userId: string) => {
    let present = 0, absent = 0, ot = 0;
    days.forEach(day => {
      const rec = getRecordForDay(userId, day);
      if (isSunday(day)) {
        if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'remote')) ot++;
      } else if (isSaturday(day)) {
        // Saturday always counts as ½ — never OT
        if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'remote')) present += 0.5;
      } else {
        if (rec && rec.status !== 'absent' && rec.status !== 'on_leave') present++;
        else absent++;
      }
    });
    return { present, absent, ot };
  };

  return (
    <Card className="shadow-corporate overflow-hidden">
      <CardHeader className="pb-2 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Table2 className="h-4 w-4 text-primary" />
            {format(selectedMonth, 'MMMM yyyy')} — Staff Attendance
          </CardTitle>
          <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> ON</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500 inline-block" /> OFF</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500 inline-block" /> ½ Day</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500 inline-block" /> OT</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold w-8 border-b border-r">#</th>
                  <th className="sticky left-8 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold min-w-[160px] border-b border-r">Employee</th>
                  <th className="px-2 py-2.5 text-center font-semibold w-16 border-b border-r">Dept</th>
                  {days.map((day, i) => (
                    <th key={i} className={cn(
                      "px-0.5 py-1.5 text-center font-medium w-8 min-w-[28px] border-b",
                      isSunday(day) && "bg-slate-200/60 dark:bg-slate-700/40",
                      isSaturday(day) && "bg-blue-50/60 dark:bg-blue-900/20",
                    )}>
                      <div className="text-[9px] text-muted-foreground leading-none mb-0.5">{DAY_ABBREV[getDay(day)]}</div>
                      <div className="text-[11px]">{i + 1}</div>
                    </th>
                  ))}
                  <th className="px-2 py-2.5 text-center font-bold bg-emerald-100/60 dark:bg-emerald-900/20 border-b border-l w-8">P</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-red-100/60 dark:bg-red-900/20 border-b w-8">A</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-orange-100/60 dark:bg-orange-900/20 border-b w-8">OT</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(employeeList.entries()).map(([deptName, deptUsers]) => (
                  <>
                    <tr key={`dept-${deptName}`} className="bg-primary/5">
                      <td colSpan={daysInMonth + 6} className="px-3 py-2 font-bold text-xs text-primary border-b">
                        ► {deptName.toUpperCase()}
                      </td>
                    </tr>
                    {deptUsers.map((user, idx) => {
                      const stats = calculateMonthStats(user.attendanceKey);
                      return (
                        <tr key={user.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-3 py-2 text-muted-foreground border-r text-center">{idx + 1}</td>
                          <td className="sticky left-8 z-10 bg-card px-3 py-2 font-medium truncate max-w-[160px] border-r">{user.full_name}</td>
                          <td className="px-2 py-2 text-center text-muted-foreground border-r text-[10px]">{deptName.substring(0, 8)}</td>
                          {days.map((day, i) => {
                            const record = getRecordForDay(user.attendanceKey, day);
                            const notation = getExcelNotation(day, record);
                            return (
                              <td key={i} className={cn("px-0 py-1.5 text-center", notation.bg)}>
                                <span className={cn("text-[10px] font-bold", notation.color)}>{notation.label}</span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20 border-l">{stats.present}</td>
                          <td className="px-2 py-2 text-center font-bold text-red-600 bg-red-50/50 dark:bg-red-900/20">{stats.absent}</td>
                          <td className="px-2 py-2 text-center font-bold text-orange-600 bg-orange-50/50 dark:bg-orange-900/20">{stats.ot}</td>
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

/* ─── Annual Summary ─── */
function AnnualSummary({ records, users, employees, departments, searchTerm, filterDepartment, selectedYear }: {
  records: any[]; users: any[]; employees: any[]; departments: any[]; searchTerm: string; filterDepartment: string; selectedYear: number;
}) {
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
        if (r.status === 'present' || r.status === 'late' || r.status === 'remote') userMap[month].ot++;
      } else {
        if (r.status !== 'absent' && r.status !== 'on_leave') userMap[month].present++;
        else userMap[month].absent++;
      }
    });
    return map;
  }, [records, selectedYear]);

  // Merge employees and auth users
  const mergedUsers = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; attendanceKey: string; full_name: string; department_id: string | null }[] = [];
    employees.forEach((e: any) => {
      const key = e.linked_user_id || e.id;
      if (!seen.has(key)) { seen.add(key); result.push({ id: e.id, attendanceKey: key, full_name: e.full_name, department_id: e.department_id }); }
    });
    users.forEach((u: any) => {
      if (!seen.has(u.id)) { seen.add(u.id); result.push({ id: u.id, attendanceKey: u.id, full_name: u.full_name || u.email, department_id: u.department_id }); }
    });
    return result;
  }, [employees, users]);

  const grouped = useMemo(() => {
    const filtered = mergedUsers.filter(u => {
      const matchesSearch = !searchTerm || u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || u.department_id === filterDepartment;
      return matchesSearch && matchesDept;
    });
    const map = new Map<string, typeof filtered>();
    filtered.forEach(u => {
      const deptName = departments.find((d: any) => d.id === u.department_id)?.name || 'Unassigned';
      const list = map.get(deptName) || [];
      list.push(u);
      map.set(deptName, list);
    });
    return map;
  }, [mergedUsers, searchTerm, filterDepartment, departments]);

  const totalWorkingDays = 287;

  return (
    <Card className="shadow-corporate overflow-hidden">
      <CardHeader className="pb-2 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Staff Attendance Summary {selectedYear}
          </CardTitle>
          <CardDescription className="text-[10px]">Prepared: {format(new Date(), 'dd MMMM yyyy')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold w-8 border-b border-r">#</th>
                  <th className="sticky left-8 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold min-w-[160px] border-b border-r">Employee</th>
                  <th className="px-2 py-2.5 text-center font-semibold w-16 border-b border-r">Dept</th>
                  {MONTH_NAMES.map(m => (
                    <th key={m} className="px-2 py-2.5 text-center font-semibold w-10 border-b">{m}</th>
                  ))}
                  <th className="px-2 py-2.5 text-center font-bold bg-emerald-100/60 dark:bg-emerald-900/20 border-b border-l">Present</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-red-100/60 dark:bg-red-900/20 border-b">Absent</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-orange-100/60 dark:bg-orange-900/20 border-b">OT</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-blue-100/60 dark:bg-blue-900/20 border-b">Rate</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(grouped.entries()).map(([deptName, deptUsers]) => (
                  <>
                    <tr key={`dept-${deptName}`} className="bg-primary/5">
                      <td colSpan={19} className="px-3 py-2 font-bold text-xs text-primary border-b">► {deptName.toUpperCase()}</td>
                    </tr>
                    {deptUsers.map((user, idx) => {
                      const monthData = userMonthData.get(user.attendanceKey) || {};
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
                        <tr key={user.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-3 py-2 text-muted-foreground border-r text-center">{idx + 1}</td>
                          <td className="sticky left-8 z-10 bg-card px-3 py-2 font-medium truncate max-w-[160px] border-r">{user.full_name}</td>
                          <td className="px-2 py-2 text-center text-muted-foreground border-r text-[10px]">{deptName.substring(0, 8)}</td>
                          {monthValues.map((val, i) => (
                            <td key={i} className="px-2 py-2 text-center">{val || <span className="text-muted-foreground/40">—</span>}</td>
                          ))}
                          <td className="px-2 py-2 text-center font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20 border-l">{totalPresent}</td>
                          <td className="px-2 py-2 text-center font-bold text-red-600 bg-red-50/50 dark:bg-red-900/20">{totalAbsent}</td>
                          <td className="px-2 py-2 text-center font-bold text-orange-600 bg-orange-50/50 dark:bg-orange-900/20">{totalOT}</td>
                          <td className={cn(
                            "px-2 py-2 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20",
                            rate >= 85 ? "text-emerald-600" : rate >= 60 ? "text-amber-600" : "text-red-600"
                          )}>{rate}%</td>
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

/* ─── Main Component ─── */
export function AttendanceTrackingTab({ departmentId }: AttendanceTrackingTabProps) {
  const [activeView, setActiveView] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const [classificationSummary, setClassificationSummary] = useState<ClassificationSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [previewGroupBy, setPreviewGroupBy] = useState<'company' | 'flat'>('company');
  const [uploadTargetDate, setUploadTargetDate] = useState<string>('');
  const [crossMidnightEnabled, setCrossMidnightEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { departments } = useDepartments();
  const { users } = useUsers();
  const { employees } = useEmployees();
  const { companies } = useCompanies();
  const { getPolicyValue } = useCompanyPolicies(null);
  const policyValues = useMemo(() => buildPolicyValues(getPolicyValue), [getPolicyValue]);
  const { records, isLoading, refetch, bulkImportAttendance } = useAttendance(
    filterDepartment === 'all' ? undefined : filterDepartment
  );

  // Build the multi-company classifier
  const classifier = useMemo(() => buildClassifier(companies, departments), [companies, departments]);

  // Normalize column name for flexible matching
  const normalizeCol = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s/]+/g, " ").trim();

  const findCol = (headers: string[], patterns: RegExp[]) => {
    const normalized = headers.map(h => h ? normalizeCol(String(h)) : '');
    for (const pat of patterns) {
      const idx = normalized.findIndex(h => pat.test(h));
      if (idx !== -1) return headers[idx];
    }
    return null;
  };

  // Yield to UI thread
  const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

  // Parse Excel file — async with progress to prevent freezing
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseProgress('Reading file...');

    // Yield so the loading UI renders before heavy work
    await yieldToUI();

    try {
      const data = await file.arrayBuffer();
      setParseProgress('Parsing spreadsheet...');
      await yieldToUI();

      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      
      if (jsonData.length === 0) {
        toast({ title: 'Empty file', description: 'The Excel file has no data rows', variant: 'destructive' });
        setIsParsing(false);
        return;
      }

      setParseProgress(`Processing ${jsonData.length.toLocaleString()} rows...`);
      await yieldToUI();

      const headers = Object.keys(jsonData[0] as object);
      const nameCol = findCol(headers, [/^name$/, /name/, /employee/, /staff/]);
      const statusCol = findCol(headers, [/^status$/, /status/]);
      const dateTimeCol = findCol(headers, [/date.?time/, /date.*time/, /time.*date/]);
      const dateCol = findCol(headers, [/^date$/, /date/, /day/, /attendance/]);
      const checkInCol = findCol(headers, [/check.?in/, /clock.?in/, /in.?time/, /arrival/]);
      const checkOutCol = findCol(headers, [/check.?out/, /clock.?out/, /out.?time/, /departure/]);
      const deptCol = findCol(headers, [/^department$/, /department/, /dept/, /division/, /section/]);
      const noCol = findCol(headers, [/^no\.?$/, /^no$/, /^number$/, /employee.?no/, /emp.?no/, /id.?no/]);

      const isMachineFormat = !!statusCol && !!dateTimeCol;

      if (!nameCol) {
        toast({ title: 'Invalid format', description: 'Could not find a Name/Employee column. Found: ' + headers.join(', '), variant: 'destructive' });
        setIsParsing(false);
        return;
      }
      if (!isMachineFormat && !dateCol) {
        toast({ title: 'Invalid format', description: 'Could not find a Date column. Found: ' + headers.join(', '), variant: 'destructive' });
        setIsParsing(false);
        return;
      }

      // Helper to parse date strings
      const parseDate = (val: any): Date | null => {
        if (!val) return null;
        if (val instanceof Date && !isNaN(val.getTime())) return val;
        if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000);
        const str = String(val).trim();
        for (const fmt of ['dd-MMM-yy HH:mm:ss', 'dd-MMM-yyyy HH:mm:ss', 'yyyy-MM-dd HH:mm:ss', 'dd/MM/yyyy HH:mm:ss', 'MM/dd/yyyy HH:mm:ss', 'yyyy-MM-dd', 'dd/MM/yyyy', 'dd-MM-yyyy', 'dd-MMM-yyyy', 'dd-MMM-yy']) {
          try {
            const d = parse(str, fmt, new Date());
            if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d;
          } catch { /* skip */ }
        }
        const fallback = new Date(str);
        return isNaN(fallback.getTime()) ? null : fallback;
      };

      // Pre-build lookup maps for fast matching
      const userLookup = users.map(u => ({ ...u, nameLower: u.full_name?.toLowerCase().trim() || '' }));
      const employeeLookup = employees.map(e => ({ ...e, nameLower: e.full_name?.toLowerCase().trim() || '' }));

      // Build fingerprint number lookup map — keyed by "companyId:fingerprint" for company-aware matching
      // Also keep a global fallback map for cases where company can't be determined
      const fingerprintByCompanyMap = new Map<string, typeof employeeLookup[0]>();
      const fingerprintGlobalMap = new Map<string, typeof employeeLookup[0]>();
      for (const e of employeeLookup) {
        if (e.fingerprint_number) {
          const fp = e.fingerprint_number.trim();
          if (e.company_id) {
            fingerprintByCompanyMap.set(`${e.company_id}:${fp}`, e);
          }
          // Global map: only set if not already set (first wins — less reliable)
          if (!fingerprintGlobalMap.has(fp)) {
            fingerprintGlobalMap.set(fp, e);
          }
        }
      }

      // Company/department classification using advanced classifier
      const fallbackCo = selectedCompanyId && selectedCompanyId !== 'none' ? selectedCompanyId : undefined;
      const classifyDept = (excelDept: string) => classifier.classify(excelDept, fallbackCo);

      // Normalize name: remove dots/punctuation, collapse spaces, lowercase
      const normalizeName = (n: string) => n.toLowerCase().replace(/[._-]/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Check if two names refer to the same person using word-level matching
      // Stricter: requires at least 2 matching words (or all words if shorter has only 1)
      const namesMatch = (a: string, b: string): boolean => {
        const aParts = normalizeName(a).split(' ').filter(p => p.length > 2);
        const bParts = normalizeName(b).split(' ').filter(p => p.length > 2);
        if (aParts.length === 0 || bParts.length === 0) return false;
        // Count how many words from the shorter name appear in the longer name
        const shorter = aParts.length <= bParts.length ? aParts : bParts;
        const longer = aParts.length <= bParts.length ? bParts : aParts;
        let matched = 0;
        for (const word of shorter) {
          if (longer.some(w => w === word || (word.length >= 5 && w.startsWith(word)) || (w.length >= 5 && word.startsWith(w)))) {
            matched++;
          }
        }
        // Require at least 2 matched words, or if single-word name require exact match in other
        if (shorter.length === 1) return matched === 1 && longer.length === 1;
        return matched >= 2;
      };

      const matchUser = (name: string, empNo?: string, excelDept?: string) => {
        // Determine the company from the Excel department for scoped fingerprint matching
        let classifiedCompanyId: string | undefined;
        if (excelDept) {
          const cls = classifyDept(excelDept);
          classifiedCompanyId = cls.company?.companyId;
        }

        const searchNorm = normalizeName(name);

        // 1. Try fingerprint + name dual validation (most accurate)
        //    Fingerprint alone is NOT enough — same IDs exist across different biometric devices.
        //    We accept a fingerprint match ONLY if the name also matches.
        if (empNo) {
          const fp = empNo.trim();
          const candidatesFromFp: (typeof employeeLookup[0])[] = [];

          // Gather fingerprint candidates (company-scoped first, then global)
          if (classifiedCompanyId) {
            const byCompanyFp = fingerprintByCompanyMap.get(`${classifiedCompanyId}:${fp}`);
            if (byCompanyFp) candidatesFromFp.push(byCompanyFp);
          }
          const byGlobalFp = fingerprintGlobalMap.get(fp);
          if (byGlobalFp && !candidatesFromFp.includes(byGlobalFp)) {
            candidatesFromFp.push(byGlobalFp);
          }

          // Accept fingerprint match ONLY if name also validates
          for (const candidate of candidatesFromFp) {
            if (normalizeName(candidate.full_name || '') === searchNorm || namesMatch(name, candidate.full_name || '')) {
              return { type: 'employee' as const, ...candidate };
            }
          }
          // If fingerprint matched but name didn't — DON'T trust it, fall through to name matching
        }

        // 2. Try name-based matching against employees (scoped by company if available)
        //    Prefer employees in the same company as the Excel department
        if (classifiedCompanyId) {
          const companyEmployees = employeeLookup.filter(e => e.company_id === classifiedCompanyId);
          let match = companyEmployees.find(e => normalizeName(e.full_name || '') === searchNorm);
          if (match) return { type: 'employee' as const, ...match };
          match = companyEmployees.find(e => namesMatch(name, e.full_name || ''));
          if (match) return { type: 'employee' as const, ...match };
        }

        // 3. Try all employees (any company)
        let match = employeeLookup.find(e => normalizeName(e.full_name || '') === searchNorm);
        if (match) return { type: 'employee' as const, ...match };
        match = employeeLookup.find(e => namesMatch(name, e.full_name || ''));
        if (match) return { type: 'employee' as const, ...match };

        // 4. Try profiles/users
        let uMatch = userLookup.find(u => normalizeName(u.full_name || '') === searchNorm);
        if (uMatch) return { type: 'user' as const, ...uMatch };
        uMatch = userLookup.find(u => namesMatch(name, u.full_name || ''));
        if (uMatch) return { type: 'user' as const, ...uMatch };
        return null;
      };

      if (isMachineFormat) {
        // ── Machine format: each row is one event ──
        // IMPORTANT: We collect ALL timestamps as generic "events" regardless of C/In or C/Out label.
        // Many biometric devices mark EVERYTHING as "C/In" even for check-outs.
        // We use First-In / Last-Out logic: earliest event = clock-in, latest event = clock-out.
        const grouped = new Map<string, { events: Date[]; excelDept: string; empNo: string }>();
        const CHUNK = 2000;

        for (let i = 0; i < jsonData.length; i += CHUNK) {
          const chunk = jsonData.slice(i, i + CHUNK) as Record<string, any>[];
          for (const row of chunk) {
            const name = String(row[nameCol!] || '').trim();
            const dtVal = row[dateTimeCol!];
            if (!name || !dtVal) continue;

            const dateTime = parseDate(dtVal);
            if (!dateTime) continue;

            const excelDept = deptCol ? String(row[deptCol] || '').trim() : '';
            const empNo = noCol ? String(row[noCol] || '').trim() : '';

            const dateKey = `${name}|||${format(dateTime, 'yyyy-MM-dd')}`;
            if (!grouped.has(dateKey)) grouped.set(dateKey, { events: [], excelDept, empNo });
            const group = grouped.get(dateKey)!;
            group.events.push(dateTime);
            if (!group.excelDept && excelDept) group.excelDept = excelDept;
            if (!group.empNo && empNo) group.empNo = empNo;
          }

          setParseProgress(`Processed ${Math.min(i + CHUNK, jsonData.length).toLocaleString()} / ${jsonData.length.toLocaleString()} rows...`);
          await yieldToUI();
        }

        // ── Cross-midnight consolidation (when enabled) ──
        // Night shifts: person checks in on day X (afternoon/evening) and checks out on day X+1 (morning).
        // The device records all as separate events. We detect this pattern:
        //   Day X: has event(s) with latest time >= 16:00 (afternoon/evening)
        //   Day X+1: has event(s) with earliest time <= 12:00 (morning) AND only 1 event
        // When detected, merge day X+1's events into day X to form one complete shift record.
        if (crossMidnightEnabled) {
          setParseProgress('Consolidating cross-midnight shifts...');
          await yieldToUI();

          const personNames = new Set<string>();
          grouped.forEach((_, key) => personNames.add(key.split('|||')[0]));

          for (const personName of personNames) {
            const personKeys = Array.from(grouped.keys())
              .filter(k => k.startsWith(`${personName}|||`))
              .sort((a, b) => a.localeCompare(b));

            for (let ki = 0; ki < personKeys.length - 1; ki++) {
              const currentKey = personKeys[ki];
              const nextKey = personKeys[ki + 1];
              const currentGroup = grouped.get(currentKey)!;
              const nextGroup = grouped.get(nextKey)!;

              // Verify consecutive dates
              const currentDateStr = currentKey.split('|||')[1];
              const nextDateStr = nextKey.split('|||')[1];
              const dayDiff = (new Date(nextDateStr).getTime() - new Date(currentDateStr).getTime()) / (1000 * 60 * 60 * 24);
              if (dayDiff !== 1) continue;

              // Sort events for analysis
              const currentSorted = [...currentGroup.events].sort((a, b) => a.getTime() - b.getTime());
              const nextSorted = [...nextGroup.events].sort((a, b) => a.getTime() - b.getTime());

              // Pattern detection for night shifts:
              // A complete DAY shift has events spanning morning-to-afternoon (e.g. 07:55 in, 16:52 out)
              // A night shift START has all events in the afternoon/evening with NO morning event
              // Next day's morning-only events are the night shift END
              const firstCurrentHour = currentSorted[0].getHours();
              const lastCurrentHour = currentSorted[currentSorted.length - 1].getHours();
              const firstNextHour = nextSorted[0].getHours();
              const lastNextHour = nextSorted[nextSorted.length - 1].getHours();

              // Current day is a complete day shift if it has an event before 12:00 AND an event after 14:00
              // (e.g., check-in 07:55 + check-out 16:52) — never merge these
              const currentHasMorningEvent = firstCurrentHour < 12;
              const currentHasAfternoonEvent = lastCurrentHour >= 14;
              const currentIsCompleteDayShift = currentHasMorningEvent && currentHasAfternoonEvent;

              // Current looks like night shift start: all events are afternoon/evening (no morning event)
              const currentIsNightStart = !currentIsCompleteDayShift && lastCurrentHour >= 14;

              // Next day looks like night shift end: all events are morning-only (before noon)
              const nextIsMorningOnly = lastNextHour < 12;

              if (currentIsNightStart && nextIsMorningOnly) {
                // Merge next day's events into current day
                currentGroup.events.push(...nextGroup.events);
                grouped.delete(nextKey);
                personKeys.splice(ki + 1, 1);
                ki--; // Re-check
              }
            }
          }
        }

        setParseProgress('Matching employees & departments...');
        await yieldToUI();

        const parsed: any[] = [];
        grouped.forEach((group, key) => {
          const [name, dateStr] = key.split('|||');
          // If user specified an upload target date, use it for context (but actual date comes from Excel)
          const parsedDate = new Date(dateStr);
          // First-In / Last-Out: sort all events chronologically, use first as clock-in, last as clock-out
          const sortedEvents = [...group.events].sort((a, b) => a.getTime() - b.getTime());
          const earliestIn = sortedEvents.length > 0 ? sortedEvents[0] : null;
          const latestOut = sortedEvents.length > 1 ? sortedEvents[sortedEvents.length - 1] : null;

          const matchedUser = matchUser(name, group.empNo, group.excelDept);
          const classification = classifyDept(group.excelDept);

          // Apply business rules from policy engine
          const processed = processAttendanceRecord(earliestIn, latestOut, policyValues);

          // Determine department: matched user's department > classification > fallback
          let resolvedDeptId = matchedUser?.department_id || classification.departmentId;
          if (!resolvedDeptId) resolvedDeptId = departmentId;

          parsed.push({
            name, date: dateStr, dateDisplay: format(parsedDate, 'dd-MMM-yyyy'),
            clockIn: earliestIn ? format(earliestIn, 'HH:mm') : '—',
            clockOut: latestOut ? format(latestOut, 'HH:mm') : '—',
            clockInRaw: earliestIn?.toISOString() || null,
            clockOutRaw: latestOut?.toISOString() || null,
            status: processed.status,
            shiftType: processed.shiftType,
            totalHours: processed.totalHours,
            regularHours: processed.regularHours,
            overtimeHours: processed.overtimeHours,
            matched: !!matchedUser, matchedUser,
            userId: matchedUser?.id,
            matchedUserName: matchedUser?.full_name || null,
            departmentId: resolvedDeptId,
            excelDept: group.excelDept,
            classifiedCompany: classification.company?.companyName || null,
            classifiedCompanyId: classification.company?.companyId || null,
            classificationConfidence: classification.confidence,
            empNo: group.empNo,
          });
        });

        if (parsed.length === 0) {
          toast({ title: 'No valid records', description: 'Could not parse any attendance records from the file', variant: 'destructive' });
          setIsParsing(false);
          return;
        }
        parsed.sort((a, b) => (a.classifiedCompany || '').localeCompare(b.classifiedCompany || '') || a.name.localeCompare(b.name) || a.date.localeCompare(b.date));
        
        // Build classification summary
        const deptTexts = parsed.map(r => r.excelDept || '');
        const { summary } = classifier.classifyBatch(deptTexts, fallbackCo);
        setClassificationSummary(summary);
        setUploadPreview(parsed);
        const companyNames = Object.values(summary.byCompany).map(c => c.companyName).join(', ');
        toast({ title: `${parsed.length} records parsed · ${Object.keys(summary.byCompany).length} companies detected`, description: companyNames || 'No companies detected' });

      } else {
        // ── Standard format ──
        const parsed: any[] = [];
        for (const row of jsonData as Record<string, any>[]) {
          const name = String(row[nameCol!] || '').trim();
          const dateVal = row[dateCol!];
          const checkIn = checkInCol ? String(row[checkInCol] || '').trim() : '';
          const checkOut = checkOutCol ? String(row[checkOutCol] || '').trim() : '';
          const excelDept = deptCol ? String(row[deptCol] || '').trim() : '';
          if (!name || !dateVal) continue;

          const parsedDate = parseDate(dateVal);
          if (!parsedDate) continue;

          const matchedUser = matchUser(name, undefined, excelDept);
          const classification = classifyDept(excelDept);

          const parseTime = (timeStr: string, dateBase: Date): string | null => {
            if (!timeStr || timeStr === '-' || timeStr === '--:--') return null;
            if (!isNaN(Number(timeStr)) && Number(timeStr) < 1) {
              const totalMinutes = Math.round(Number(timeStr) * 24 * 60);
              const d = new Date(dateBase);
              d.setHours(Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
              return d.toISOString();
            }
            const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
            if (match) {
              const d = new Date(dateBase);
              d.setHours(parseInt(match[1]), parseInt(match[2]), 0, 0);
              return d.toISOString();
            }
            return null;
          };

          const clockInISO = parseTime(checkIn, parsedDate);
          const clockOutISO = parseTime(checkOut, parsedDate);

          const clockInDate = clockInISO ? new Date(clockInISO) : null;
          const clockOutDate = clockOutISO ? new Date(clockOutISO) : null;
          const processed = processAttendanceRecord(clockInDate, clockOutDate, policyValues);

          let resolvedDeptId = matchedUser?.department_id || classification.departmentId;
          if (!resolvedDeptId) resolvedDeptId = departmentId;

          parsed.push({
            name, date: format(parsedDate, 'yyyy-MM-dd'), dateDisplay: format(parsedDate, 'dd-MMM-yyyy'),
            clockIn: clockInISO ? format(new Date(clockInISO), 'HH:mm') : '—',
            clockOut: clockOutISO ? format(new Date(clockOutISO), 'HH:mm') : '—',
            clockInRaw: clockInISO, clockOutRaw: clockOutISO,
            status: processed.status,
            shiftType: processed.shiftType,
            totalHours: processed.totalHours,
            regularHours: processed.regularHours,
            overtimeHours: processed.overtimeHours,
            matched: !!matchedUser, matchedUser, userId: matchedUser?.id,
            departmentId: resolvedDeptId,
            excelDept,
            classifiedCompany: classification.company?.companyName || null,
            classifiedCompanyId: classification.company?.companyId || null,
            classificationConfidence: classification.confidence,
          });
        }

        if (parsed.length === 0) {
          toast({ title: 'No valid records', description: 'Could not parse any attendance records from the file', variant: 'destructive' });
          setIsParsing(false);
          return;
        }
        const deptTextsStd = parsed.map(r => r.excelDept || '');
        const { summary: summaryStd } = classifier.classifyBatch(deptTextsStd, fallbackCo);
        setClassificationSummary(summaryStd);
        setUploadPreview(parsed);
        const companyNamesStd = Object.values(summaryStd.byCompany).map(c => c.companyName).join(', ');
        toast({ title: `${parsed.length} records parsed · ${Object.keys(summaryStd.byCompany).length} companies`, description: companyNamesStd || 'No companies detected' });
      }
    } catch (err) {
      toast({ title: 'Failed to read file', description: String(err), variant: 'destructive' });
    }
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [users, employees, departmentId, toast, companies, departments, classifier, policyValues, selectedCompanyId, crossMidnightEnabled]);

  // State for unmatched employees review
  const [showUnmatchedReview, setShowUnmatchedReview] = useState(false);
  const [unmatchedToAdd, setUnmatchedToAdd] = useState<Set<string>>(new Set());
  const [isAddingEmployees, setIsAddingEmployees] = useState(false);
  const [unmatchedReviewed, setUnmatchedReviewed] = useState(false);

  const unmatchedEmployees = useMemo(() => {
    if (!uploadPreview) return [];
    const seen = new Set<string>();
    return uploadPreview
      .filter(r => !r.matched)
      .filter(r => {
        const key = r.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(r => ({
        name: r.name,
        excelDept: r.excelDept || '',
        classifiedCompany: r.classifiedCompany || 'Unknown',
        empNo: r.empNo || '',
        occurrences: uploadPreview.filter(row => row.name.toLowerCase().trim() === r.name.toLowerCase().trim()).length,
      }));
  }, [uploadPreview]);

  const toggleUnmatchedEmployee = (name: string) => {
    setUnmatchedToAdd(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAllUnmatched = () => {
    if (unmatchedToAdd.size === unmatchedEmployees.length) {
      setUnmatchedToAdd(new Set());
    } else {
      setUnmatchedToAdd(new Set(unmatchedEmployees.map(e => e.name)));
    }
  };

  const handleAddUnmatchedToHub = async () => {
    if (unmatchedToAdd.size === 0) return;
    setIsAddingEmployees(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const toAdd = unmatchedEmployees.filter(e => unmatchedToAdd.has(e.name));
      
      for (const emp of toAdd) {
        // Find a department for this employee from their classified data
        const previewRow = uploadPreview?.find(r => r.name === emp.name);
        const deptId = previewRow?.departmentId || departmentId;
        
        const { error } = await supabase.from('employees').insert({
          full_name: emp.name,
          employee_number: '', // auto-generated by trigger
          fingerprint_number: emp.empNo || null, // Store fingerprint number from Excel
          department_id: deptId,
          created_by: currentUser?.id || null,
          employment_status: 'active',
          employment_type: 'full_time',
        });
        if (error) console.error('Failed to add employee:', emp.name, error);
      }

      toast({ 
        title: `${unmatchedToAdd.size} employees added to Employee Hub`, 
        description: 'Please re-upload the file to match them with attendance records.' 
      });
      setUnmatchedToAdd(new Set());
      setShowUnmatchedReview(false);
      setUploadPreview(null);
      setClassificationSummary(null);
    } catch (err) {
      toast({ title: 'Failed to add employees', description: String(err), variant: 'destructive' });
    } finally {
      setIsAddingEmployees(false);
    }
  };

  const handleImport = async () => {
    if (!uploadPreview) return;
    const validRecords = uploadPreview.filter(r => r.matched && r.userId);
    if (validRecords.length === 0) {
      toast({ title: 'No matched records to import', variant: 'destructive' });
      return;
    }

    // Check for unmatched employees first (only show review once)
    if (unmatchedEmployees.length > 0 && !showUnmatchedReview && !unmatchedReviewed) {
      setShowUnmatchedReview(true);
      return;
    }

    setIsImporting(true);
    try {
      // ── Smart duplicate merge ──
      // Fetch existing records for the same user+date combos so we can merge intelligently
      const uniqueKeys = [...new Set(validRecords.map(r => `${r.userId}|${r.date}`))];
      const userIds = [...new Set(validRecords.map(r => r.userId))];
      const dates = [...new Set(validRecords.map(r => r.date))];

      // Fetch existing records in batches
      const existingMap = new Map<string, any>();
      const FETCH_BATCH = 50;
      for (let i = 0; i < userIds.length; i += FETCH_BATCH) {
        const batchUserIds = userIds.slice(i, i + FETCH_BATCH);
        const { data: existing } = await supabase
          .from('attendance_records')
          .select('user_id, attendance_date, clock_in, clock_out, status, shift_type, total_hours, regular_hours, overtime_hours')
          .in('user_id', batchUserIds)
          .in('attendance_date', dates);
        
        existing?.forEach(rec => {
          existingMap.set(`${rec.user_id}|${rec.attendance_date}`, rec);
        });
      }

      // Merge new data with existing: pick earliest clock_in, latest clock_out
      // Skip true duplicates — only import if record is missing, has no clock_out, or has different hours
      let skippedDuplicates = 0;
      const importData: any[] = [];
      
      for (const r of validRecords) {
        const key = `${r.userId}|${r.date}`;
        const existing = existingMap.get(key);

        let mergedClockIn = r.clockInRaw;
        let mergedClockOut = r.clockOutRaw;

        if (existing) {
          // Check if the existing record is already complete and matches
          const existingComplete = existing.clock_in && existing.clock_out;
          const newClockIn = mergedClockIn ? new Date(mergedClockIn) : null;
          const newClockOut = mergedClockOut ? new Date(mergedClockOut) : null;
          const existingClockIn = existing.clock_in ? new Date(existing.clock_in) : null;
          const existingClockOut = existing.clock_out ? new Date(existing.clock_out) : null;

          // True duplicate: existing has both clock_in and clock_out, and times match (within 1 minute)
          const timesMatch = existingComplete && newClockIn && newClockOut &&
            Math.abs(existingClockIn!.getTime() - newClockIn.getTime()) < 60000 &&
            Math.abs(existingClockOut!.getTime() - newClockOut.getTime()) < 60000;

          if (timesMatch) {
            skippedDuplicates++;
            continue; // Skip — nothing new to add
          }

          // Not a true duplicate — merge: fill missing clock_out, keep earliest in / latest out
          if (existing.clock_in && mergedClockIn) {
            mergedClockIn = new Date(existing.clock_in) < new Date(mergedClockIn) ? existing.clock_in : mergedClockIn;
          } else if (existing.clock_in && !mergedClockIn) {
            mergedClockIn = existing.clock_in;
          }

          if (existing.clock_out && mergedClockOut) {
            mergedClockOut = new Date(existing.clock_out) > new Date(mergedClockOut) ? existing.clock_out : mergedClockOut;
          } else if (existing.clock_out && !mergedClockOut) {
            mergedClockOut = existing.clock_out;
          }
        }

        // Re-process with merged times for accurate shift/OT calculation
        const clockInDate = mergedClockIn ? new Date(mergedClockIn) : null;
        const clockOutDate = mergedClockOut ? new Date(mergedClockOut) : null;
        const reprocessed = processAttendanceRecord(clockInDate, clockOutDate, policyValues);

        importData.push({
          user_id: r.userId,
          department_id: r.departmentId,
          attendance_date: r.date,
          clock_in: mergedClockIn,
          clock_out: mergedClockOut,
          status: reprocessed.status,
          shift_type: reprocessed.shiftType || 'day',
          total_hours: reprocessed.totalHours || 0,
          regular_hours: reprocessed.regularHours || 0,
          overtime_hours: reprocessed.overtimeHours || 0,
          notes: `Imported from Excel | ${r.classifiedCompany || 'Unclassified'} | ${(reprocessed.shiftType || 'day').toUpperCase()} shift | OT: ${reprocessed.overtimeHours || 0}h`,
        });
      }

      // Deduplicate: if multiple rows for same user+date, keep the one with most data
      const deduped = new Map<string, typeof importData[0]>();
      importData.forEach(rec => {
        const key = `${rec.user_id}|${rec.attendance_date}`;
        const existing = deduped.get(key);
        if (!existing) {
          deduped.set(key, rec);
        } else {
          // Merge: keep earliest clock_in, latest clock_out
          const mergedIn = existing.clock_in && rec.clock_in
            ? (new Date(existing.clock_in) < new Date(rec.clock_in) ? existing.clock_in : rec.clock_in)
            : existing.clock_in || rec.clock_in;
          const mergedOut = existing.clock_out && rec.clock_out
            ? (new Date(existing.clock_out) > new Date(rec.clock_out) ? existing.clock_out : rec.clock_out)
            : existing.clock_out || rec.clock_out;
          
          const ci = mergedIn ? new Date(mergedIn) : null;
          const co = mergedOut ? new Date(mergedOut) : null;
          const reproc = processAttendanceRecord(ci, co, policyValues);
          
          deduped.set(key, {
            ...rec,
            clock_in: mergedIn,
            clock_out: mergedOut,
            status: reproc.status,
            shift_type: reproc.shiftType || 'day',
            total_hours: reproc.totalHours || 0,
            regular_hours: reproc.regularHours || 0,
            overtime_hours: reproc.overtimeHours || 0,
          });
        }
      });

      const finalData = Array.from(deduped.values());
      const mergedCount = importData.length - finalData.length;

      if (finalData.length === 0 && skippedDuplicates > 0) {
        toast({ 
          title: 'No new records to import',
          description: `${skippedDuplicates} records already exist with matching data. Only missing or incomplete records are imported.`
        });
        setIsImporting(false);
        return;
      }

      if (finalData.length > 0) {
        await bulkImportAttendance.mutateAsync(finalData);
      }

      // Auto-save fingerprint numbers for matched employees that don't have one yet
      const fingerprintUpdates: { id: string; fingerprint_number: string }[] = [];
      if (uploadPreview) {
        const seen = new Set<string>();
        for (const r of uploadPreview) {
          if (r.matched && r.matchedUser && r.empNo && r.matchedUser.type === 'employee') {
            const empId = r.matchedUser.id;
            if (!seen.has(empId) && !r.matchedUser.fingerprint_number) {
              seen.add(empId);
              fingerprintUpdates.push({ id: empId, fingerprint_number: r.empNo.trim() });
            }
          }
        }
      }
      if (fingerprintUpdates.length > 0) {
        for (const upd of fingerprintUpdates) {
          await supabase.from('employees').update({ fingerprint_number: upd.fingerprint_number }).eq('id', upd.id);
        }
        console.log(`Auto-saved ${fingerprintUpdates.length} fingerprint numbers to employees`);
      }

      const parts: string[] = [];
      if (skippedDuplicates > 0) parts.push(`${skippedDuplicates} duplicates skipped`);
      if (existingMap.size > 0) parts.push(`${existingMap.size - skippedDuplicates} existing records updated`);
      if (mergedCount > 0) parts.push(`${mergedCount} rows consolidated`);
      if (fingerprintUpdates.length > 0) parts.push(`${fingerprintUpdates.length} fingerprint IDs saved`);

      toast({ 
        title: `${finalData.length} records imported successfully`,
        description: parts.join(', ') || 'All records imported'
      });
      
      setUploadPreview(null);
      setClassificationSummary(null);
      setShowUnmatchedReview(false);
      setUnmatchedReviewed(false);
    } catch (err) {
      toast({ title: 'Import failed', description: String(err), variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const renderPreviewRow = (row: any, idx: number) => (
    <tr key={`row-${idx}`} className={cn("border-b border-border/40 hover:bg-muted/20", !row.matched && "bg-red-50/30 dark:bg-red-900/10")}>
      <td className="px-3 py-2.5 text-muted-foreground">{idx}</td>
      <td className="px-3 py-2.5 font-medium">{row.name}</td>
      <td className="px-3 py-2.5">
        {row.matched ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-medium">
            <CheckCircle2 className="h-3 w-3" /> {row.matchedUserName || row.matchedUser?.full_name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-red-500 text-[10px] font-medium">
            <AlertCircle className="h-3 w-3" /> Not Found
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {row.classifiedCompany ? (
          <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary">{row.classifiedCompany}</Badge>
        ) : (
          <span className="text-muted-foreground text-[10px]">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-muted-foreground text-[10px]">{row.excelDept || '—'}</td>
      <td className="px-3 py-2.5 text-center">{row.dateDisplay}</td>
      <td className="px-3 py-2.5 text-center font-medium text-emerald-600">{row.clockIn}</td>
      <td className="px-3 py-2.5 text-center font-medium text-info">{row.clockOut}</td>
      <td className="px-3 py-2.5 text-center">
        <Badge variant="outline" className={cn("text-[10px] border-0",
          row.shiftType === 'day' ? "bg-amber-500/10 text-amber-600" : "bg-indigo-500/10 text-indigo-600"
        )}>
          {row.shiftType === 'day' ? <Sun className="h-3 w-3 mr-0.5 inline" /> : <Moon className="h-3 w-3 mr-0.5 inline" />}
          {row.shiftType === 'day' ? 'Day' : 'Night'}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-center font-bold">{row.totalHours?.toFixed(1) || '0'}h</td>
      <td className="px-3 py-2.5 text-center">
        {(row.overtimeHours || 0) > 0 ? (
          <span className="font-bold text-orange-600">{row.overtimeHours?.toFixed(2)}h</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-center">
        <Badge variant="outline" className={cn("text-[10px] border-0",
          row.status === 'present' && "bg-emerald-500/10 text-emerald-600",
          row.status === 'late' && "bg-amber-500/10 text-amber-600",
          row.status === 'absent' && "bg-red-500/10 text-red-600",
          row.status === 'half_day' && "bg-blue-500/10 text-blue-600",
        )}>
          {ATTENDANCE_STATUS_LABELS[row.status as AttendanceStatus] || row.status}
        </Badge>
      </td>
    </tr>
  );

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <AttendanceKPICards records={records} users={users} employees={employees} selectedMonth={selectedMonth} />

      {/* Charts Row */}
      <AttendanceCharts records={records} selectedMonth={selectedMonth} />

      {/* Upload + Controls Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upload Card - Compact tile style like reference */}
        <Card className="shadow-corporate border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Import Attendance</h3>
                <p className="text-[10px] text-muted-foreground">Upload mixed-company Excel · auto-classifies</p>
              </div>
            </div>
            <div className="flex gap-2 mb-2">
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Company (auto)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Auto-detect all</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mb-2">
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Attendance Date (for reference)</label>
              <Input
                type="date"
                value={uploadTargetDate}
                onChange={e => setUploadTargetDate(e.target.value)}
                className="h-9 text-xs"
                placeholder="Select date..."
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Uses First-In / Last-Out (ignores C/In vs C/Out labels)
              </p>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crossMidnightEnabled}
                  onChange={e => setCrossMidnightEnabled(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-[10px] font-medium">Cross-midnight shift merge</span>
              </label>
              <Moon className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} disabled={isParsing} />
            {isParsing ? (
              <div className="w-full text-center space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{parseProgress}</span>
                </div>
              </div>
            ) : (
              <Button size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Upload Excel
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
              Auto-detects HQ Power, HQ Peat, HQ Service, Farmers
            </p>
          </CardContent>
        </Card>

        {/* Controls Card */}
        <Card className="shadow-corporate lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search employee..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-9" />
                </div>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {activeView === 'monthly' && (
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[110px] text-center">{format(selectedMonth, 'MMM yyyy')}</span>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg border p-0.5">
                  <Button variant={activeView === 'monthly' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs" onClick={() => setActiveView('monthly')}>
                    <Table2 className="h-3.5 w-3.5 mr-1.5" /> Monthly
                  </Button>
                  <Button variant={activeView === 'annual' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs" onClick={() => setActiveView('annual')}>
                    <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Annual
                  </Button>
                </div>
                <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Preview */}
      {uploadPreview && (
        <Card className="shadow-corporate border-l-4 border-l-info">
          <CardHeader className="pb-2 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-info" />
                  Import Preview — {uploadPreview.length} records
                </CardTitle>
                {/* Company classification chips */}
                {classificationSummary && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(classificationSummary.byCompany).map(([companyId, info]) => (
                      <Badge key={companyId} variant="secondary" className="text-[10px] font-semibold">
                        {info.companyName}: {info.count}
                      </Badge>
                    ))}
                    {classificationSummary.unclassified > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        Unclassified: {classificationSummary.unclassified}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex gap-3 flex-wrap">
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {uploadPreview.filter(r => r.matched).length} matched
                  </span>
                  <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {uploadPreview.filter(r => !r.matched).length} unmatched
                  </span>
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Sun className="h-3 w-3" /> {uploadPreview.filter(r => r.shiftType === 'day').length} day
                  </span>
                  <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                    <Moon className="h-3 w-3" /> {uploadPreview.filter(r => r.shiftType === 'night').length} night
                  </span>
                  <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {uploadPreview.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1)}h total OT
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => { setUploadPreview(null); setClassificationSummary(null); setShowUnmatchedReview(false); }}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="h-8" onClick={handleImport} disabled={isImporting || uploadPreview.filter(r => r.matched).length === 0}>
                    {isImporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                    {unmatchedEmployees.length > 0 && !showUnmatchedReview ? 'Review & Import' : `Import ${uploadPreview.filter(r => r.matched).length}`}
                  </Button>
                </div>
                <div className="flex items-center rounded-md border p-0.5">
                  <Button variant={previewGroupBy === 'company' ? 'default' : 'ghost'} size="sm" className="h-6 text-[10px] px-2" onClick={() => setPreviewGroupBy('company')}>
                    By Company
                  </Button>
                  <Button variant={previewGroupBy === 'flat' ? 'default' : 'ghost'} size="sm" className="h-6 text-[10px] px-2" onClick={() => setPreviewGroupBy('flat')}>
                    Flat
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Unmatched Employees Review */}
          {showUnmatchedReview && unmatchedEmployees.length > 0 && (
            <div className="mx-4 my-3 p-4 rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-amber-600" />
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {unmatchedEmployees.length} Employees Not Found in System
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={selectAllUnmatched}>
                    {unmatchedToAdd.size === unmatchedEmployees.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">
                These employees were found in the Excel file but don't exist in the Employee Hub. 
                Select employees to add to the Hub, then re-upload to match their attendance.
                Unselected employees will be skipped during import.
              </p>
              <ScrollArea className="max-h-[250px]">
                <div className="space-y-1">
                  {unmatchedEmployees.map((emp) => {
                    const isSelected = unmatchedToAdd.has(emp.name);
                    return (
                      <button
                        key={emp.name}
                        onClick={() => toggleUnmatchedEmployee(emp.name)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors text-sm",
                          isSelected ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700" : "bg-card border border-border hover:bg-muted/60"
                        )}
                      >
                        <div className={cn(
                          "h-5 w-5 rounded border-2 flex items-center justify-center shrink-0",
                          isSelected ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{emp.name}</span>
                          {emp.empNo && <span className="text-muted-foreground ml-2 text-xs">#{emp.empNo}</span>}
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{emp.excelDept || 'No dept'}</Badge>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{emp.occurrences} entries</Badge>
                        {emp.classifiedCompany !== 'Unknown' && (
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5 text-primary">{emp.classifiedCompany}</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                <Button variant="outline" size="sm" onClick={() => { setShowUnmatchedReview(false); setUnmatchedReviewed(true); }} className="text-xs">
                  Skip Unmatched & Continue Import
                </Button>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="text-xs gap-1.5"
                    disabled={unmatchedToAdd.size === 0 || isAddingEmployees}
                    onClick={handleAddUnmatchedToHub}
                  >
                    {isAddingEmployees ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                    Add {unmatchedToAdd.size} to Employee Hub
                  </Button>
                </div>
              </div>
            </div>
          )}

          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/90">
                    <th className="px-3 py-2.5 text-left font-semibold border-b w-10">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[160px]">Name (Excel)</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[140px]">Matched Employee</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[100px]">Company</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[100px]">Dept (Excel)</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[100px]">Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[80px]">Check In</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[80px]">Check Out</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[70px]">Shift</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[70px]">Total Hrs</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[60px]">OT Hrs</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[80px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    if (previewGroupBy === 'company') {
                      // Group rows by classified company
                      const grouped = new Map<string, any[]>();
                      uploadPreview.forEach(row => {
                        const key = row.classifiedCompany || 'Unclassified';
                        if (!grouped.has(key)) grouped.set(key, []);
                        grouped.get(key)!.push(row);
                      });
                      let globalIdx = 0;
                      return Array.from(grouped.entries()).map(([companyName, rows]) => (
                        <>
                          <tr key={`company-${companyName}`} className="bg-primary/5">
                            <td colSpan={12} className="px-3 py-2 font-bold text-xs text-primary border-b">
                              ► {companyName.toUpperCase()} — {rows.length} records · {rows.filter(r => r.matched).length} matched
                            </td>
                          </tr>
                          {rows.map((row) => {
                            globalIdx++;
                            return renderPreviewRow(row, globalIdx);
                          })}
                        </>
                      ));
                    }
                    return uploadPreview.map((row, idx) => renderPreviewRow(row, idx + 1));
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Grid */}
      {activeView === 'monthly' ? (
        <MonthlyGrid records={records} selectedMonth={selectedMonth} users={users} employees={employees} departments={departments} searchTerm={searchTerm} filterDepartment={filterDepartment} />
      ) : (
        <AnnualSummary records={records} users={users} employees={employees} departments={departments} searchTerm={searchTerm} filterDepartment={filterDepartment} selectedYear={selectedYear} />
      )}
    </div>
  );
}
