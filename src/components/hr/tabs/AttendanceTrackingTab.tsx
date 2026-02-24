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
  ChevronLeft, ChevronRight, BarChart3,
  Table2, Upload, FileSpreadsheet, X, Loader2,
  UserCheck, UserX, Timer, Award, Sun, Moon
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, isSameDay, 
  getDay, getDaysInMonth, addMonths, subMonths, getYear, getMonth,
  isSaturday, isSunday, isFriday, parse
} from 'date-fns';
import { useAttendance, useMyAttendance, ATTENDANCE_STATUS_LABELS, AttendanceStatus } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
import { useEmployees } from '@/hooks/useEmployees';
import { useCompanies } from '@/hooks/useCompanies';
import { useCompanyPolicies } from '@/hooks/useCompanyPolicies';
import { buildPolicyValues, processAttendanceRecord } from '@/lib/timesheetProcessor';
import { buildClassifier, type ClassificationSummary } from '@/lib/attendanceClassifier';
import { isPublicHoliday, getMonthExpectedHours, getRwandanHolidays, countWorkingDays, type PublicHoliday } from '@/lib/rwandanHolidays';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';


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
  // Bold Excel-style colors: green=ON, red=OFF, yellow=½, blue=OT, gray=—
  if (isSunday(dayDate)) {
    if (record && (record.status === 'present' || record.status === 'late' || record.status === 'remote')) {
      return { label: 'OT', color: 'text-white font-bold', bg: 'bg-blue-500 dark:bg-blue-600' };
    }
    return { label: '—', color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-300 dark:bg-gray-600' };
  }
  if (isSaturday(dayDate)) {
    // Saturday always shows ½ in yellow (matching Excel)
    return { label: '½', color: 'text-gray-800 dark:text-gray-900 font-bold', bg: 'bg-yellow-300 dark:bg-yellow-500' };
  }
  if (!record || record.status === 'absent') {
    return { label: 'OFF', color: 'text-white font-bold', bg: 'bg-red-600 dark:bg-red-600' };
  }
  if (record.status === 'on_leave') {
    return { label: 'OFF', color: 'text-white font-bold', bg: 'bg-red-600 dark:bg-red-600' };
  }
  if (record.status === 'half_day') {
    return { label: '½', color: 'text-gray-800 dark:text-gray-900 font-bold', bg: 'bg-yellow-300 dark:bg-yellow-500' };
  }
  return { label: 'ON', color: 'text-white font-bold', bg: 'bg-green-500 dark:bg-green-600' };
}

const DAY_ABBREV = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─── KPI Summary Cards (DAILY counts — per selected date) ─── */
function AttendanceKPICards({ records, users, employees, selectedMonth, selectedYear, activeView, selectedDate }: {
  records: any[]; users: any[]; employees: any[]; selectedMonth: Date; selectedYear: number; activeView: string; selectedDate?: Date;
}) {
  const stats = useMemo(() => {
    // Use today if no selectedDate provided
    const targetDate = selectedDate || new Date();
    const targetStr = format(targetDate, 'yyyy-MM-dd');

    // Daily stats: only records matching the target date
    const dailyRecords = records.filter(r => {
      const dateStr = (r.date || r.attendance_date || '').substring(0, 10);
      return dateStr === targetStr;
    });

    const present = dailyRecords.filter(r => r.status === 'present' || r.status === 'remote').length;
    const late = dailyRecords.filter(r => r.status === 'late').length;
    const absent = dailyRecords.filter(r => r.status === 'absent').length;
    const onLeave = dailyRecords.filter(r => r.status === 'on_leave').length;
    const total = dailyRecords.length || 1;
    const attendanceRate = Math.round(((present + late) / total) * 100);
    const totalEmployees = employees.length > 0 ? employees.length : users.length;

    return { present, late, absent, onLeave, attendanceRate, totalEmployees, dateLabel: format(targetDate, 'EEE, dd MMM yyyy') };
  }, [records, employees, users, selectedDate]);

  const cards = [
    { title: 'Employees', value: stats.totalEmployees, icon: Users, color: 'bg-primary', iconColor: 'text-primary-foreground' },
    { title: 'Present', value: stats.present, icon: UserCheck, color: 'bg-emerald-500', iconColor: 'text-white' },
    { title: 'Late', value: stats.late, icon: Timer, color: 'bg-amber-500', iconColor: 'text-white' },
    { title: 'Absent', value: stats.absent, icon: UserX, color: 'bg-red-500', iconColor: 'text-white' },
    { title: 'On Leave', value: stats.onLeave, icon: CalendarIcon, color: 'bg-blue-500', iconColor: 'text-white' },
    { title: 'Rate', value: `${stats.attendanceRate}%`, icon: Award, color: 'bg-violet-500', iconColor: 'text-white' },
  ];

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground px-1 font-medium">Daily Summary — {stats.dateLabel}</p>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {cards.map((card) => (
          <div key={card.title} className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", card.color)}>
              <card.icon className={cn("h-4 w-4", card.iconColor)} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground truncate">{card.title}</p>
              <p className="text-sm font-bold leading-tight">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Performance Monitor ─── */
function AttendancePerformanceMonitor({ loadTimeMs, recordCount, isLoading }: {
  loadTimeMs: number | null; recordCount: number; isLoading: boolean;
}) {
  if (loadTimeMs === null && !isLoading) return null;
  const speedLabel = loadTimeMs !== null
    ? loadTimeMs < 1000 ? '🟢 Fast' : loadTimeMs < 3000 ? '🟡 Moderate' : '🔴 Slow'
    : '';
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-1.5 text-[10px] text-muted-foreground">
      <span className="font-semibold">⚡ Performance</span>
      {isLoading ? (
        <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Loading...</span>
      ) : loadTimeMs !== null ? (
        <>
          <span>{speedLabel} — <strong>{(loadTimeMs / 1000).toFixed(2)}s</strong></span>
          <span className="text-muted-foreground/60">|</span>
          <span>{recordCount.toLocaleString()} records loaded</span>
          <span className="text-muted-foreground/60">|</span>
          <span>{recordCount > 0 ? (loadTimeMs / recordCount).toFixed(1) : '0'}ms/record</span>
        </>
      ) : null}
    </div>
  );
}

/* ─── Monthly Grid ─── */
function MonthlyGrid({ records, selectedMonth, users, employees, departments, searchTerm, filterDepartment, filterEmployee }: {
  records: any[]; selectedMonth: Date; users: any[]; employees: any[]; departments: any[]; searchTerm: string; filterDepartment: string; filterEmployee: string;
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
      const matchesEmployee = !filterEmployee || filterEmployee === 'all' || u.attendanceKey === filterEmployee || u.id === filterEmployee;
      return matchesSearch && matchesDept && matchesEmployee;
    });
    const grouped = new Map<string, typeof filtered>();
    filtered.forEach(u => {
      const deptName = departments.find((d: any) => d.id === u.department_id)?.name || 'Unassigned';
      const list = grouped.get(deptName) || [];
      list.push(u);
      grouped.set(deptName, list);
    });
    return grouped;
  }, [mergedUsers, searchTerm, filterDepartment, filterEmployee, departments]);

  const getRecordForDay = (userId: string, day: Date) => {
    // Try both the employee id and attendanceKey
    const recs = userRecords.get(userId) || [];
    return recs.find(r => {
      const recDate = new Date(r.date || r.attendance_date);
      return isSameDay(recDate, day);
    });
  };

  const calculateMonthStats = (userId: string) => {
    let present = 0, absent = 0, ot = 0, satDays = 0, wkndFri = 0, holidaysWorked = 0;
    days.forEach(day => {
      const rec = getRecordForDay(userId, day);
      const holiday = isPublicHoliday(day);
      if (isSunday(day)) {
        // Sunday: rest day. If worked = Sunday OT
        if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'remote')) ot++;
      } else if (isSaturday(day)) {
        // Saturday: half day. Count separately
        if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'remote')) {
          satDays++;
        }
      } else if (isFriday(day)) {
        // Friday: check if it's a "weekend Friday" (some rotation schedules)
        if (rec && rec.status !== 'absent' && rec.status !== 'on_leave') {
          present++;
          if (holiday) holidaysWorked++;
        } else {
          absent++;
        }
      } else {
        // Mon-Thu: regular weekday
        if (rec && rec.status !== 'absent' && rec.status !== 'on_leave') {
          present++;
          if (holiday) holidaysWorked++;
        } else {
          absent++;
        }
      }
    });
    // Total = Present + (Saturday half-days * 0.5) + Sunday OT
    const total = present + (satDays * 0.5) + ot;
    // Expected hours: weekdays * 8 (from calendar)
    const { expectedHours: expHrs, weekdays } = getMonthExpectedHours(year, month);
    // Deductions: Weekend Friday hours (4hrs per Fri) → converted to days (÷8)
    const deductHrs = wkndFri * 4;
    const netDays = total - (deductHrs / 8);
    return { present, absent, ot, satDays, total, expHrs, wkndFri, deductHrs, netDays, holidaysWorked, weekdays };
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
            <span className="flex items-center gap-1"><span className="h-2.5 w-5 rounded-sm bg-green-500 inline-flex items-center justify-center text-[8px] text-white font-bold">ON</span> Present</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-5 rounded-sm bg-red-600 inline-flex items-center justify-center text-[8px] text-white font-bold">OFF</span> Absent</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-5 rounded-sm bg-yellow-300 inline-flex items-center justify-center text-[8px] text-gray-800 font-bold">½</span> Saturday</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-5 rounded-sm bg-blue-500 inline-flex items-center justify-center text-[8px] text-white font-bold">OT</span> Sunday Work</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-5 rounded-sm bg-gray-300 inline-flex items-center justify-center text-[8px] text-gray-700 font-bold">—</span> Rest Day</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[75vh]">
            <table className="text-[11px] border-collapse border border-slate-300 dark:border-slate-600" style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-30">
                <tr className="bg-blue-700 dark:bg-blue-800 text-white">
                  <th className="sticky left-0 z-40 bg-blue-700 dark:bg-blue-800 px-1 py-1.5 text-center font-semibold border border-blue-600 dark:border-blue-900" style={{ width: 40, minWidth: 40 }}>#</th>
                  <th className="sticky left-[40px] z-40 bg-blue-700 dark:bg-blue-800 px-2 py-1.5 text-left font-semibold border border-blue-600 dark:border-blue-900" style={{ width: 180, minWidth: 180 }}>Name</th>
                  <th className="sticky left-[220px] z-40 bg-blue-700 dark:bg-blue-800 px-1 py-1.5 text-center font-semibold border border-blue-600 dark:border-blue-900" style={{ width: 100, minWidth: 100 }}>Dept</th>
                  {days.map((day, i) => {
                    const holiday = isPublicHoliday(day);
                    return (
                    <th key={i} className={cn(
                      "text-center font-medium border border-blue-600 dark:border-blue-900",
                      isSunday(day) && "bg-gray-500 text-white",
                      isSaturday(day) && "bg-yellow-400 text-gray-900",
                      !isSunday(day) && !isSaturday(day) && "bg-blue-700 dark:bg-blue-800 text-white",
                      holiday && "bg-rose-600 text-white",
                    )} style={{ width: 38, minWidth: 38, padding: '2px 0' }}>
                      <div className="text-[8px] leading-none mb-0.5 opacity-80">{DAY_ABBREV[getDay(day)]}</div>
                      <div className={cn("text-[11px] font-bold")}>{i + 1}</div>
                      {holiday && <div className="text-[7px] leading-none mt-0.5" title={holiday.name}>🏛</div>}
                    </th>
                    );
                  })}
                  <th className="text-center font-bold bg-green-600 text-white border border-green-700 text-[8px]" style={{ width: 50, minWidth: 50, padding: '2px 0' }}>Present</th>
                  <th className="text-center font-bold bg-rose-500 text-white border border-rose-600 text-[8px]" style={{ width: 50, minWidth: 50, padding: '2px 0' }}>Absent</th>
                  <th className="text-center font-bold bg-blue-500 text-white border border-blue-600 text-[9px]" style={{ width: 38, minWidth: 38, padding: '2px 0' }}>Sun</th>
                  <th className="text-center font-bold bg-yellow-400 text-gray-900 border border-yellow-500" style={{ width: 38, minWidth: 38, padding: '2px 0' }}>Sat</th>
                  <th className="text-center font-bold bg-violet-600 text-white border border-violet-700 text-[9px]" style={{ width: 42, minWidth: 42, padding: '2px 0' }}>Total</th>
                  <th className="text-center font-bold bg-slate-500 text-white border border-slate-600 text-[9px]" style={{ width: 42, minWidth: 42, padding: '2px 0' }}>Exp<br/>Hrs</th>
                  <th className="text-center font-bold bg-amber-500 text-white border border-amber-600 text-[9px]" style={{ width: 38, minWidth: 38, padding: '2px 0' }}>Wk<br/>Fri</th>
                  <th className="text-center font-bold bg-pink-500 text-white border border-pink-600 text-[9px]" style={{ width: 42, minWidth: 42, padding: '2px 0' }}>Ded<br/>Hrs</th>
                  <th className="text-center font-bold bg-cyan-600 text-white border border-cyan-700 text-[9px]" style={{ width: 42, minWidth: 42, padding: '2px 0' }}>Net<br/>Days</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(employeeList.entries()).map(([deptName, deptUsers]) => (
                  <>
                    <tr key={`dept-${deptName}`} className="bg-blue-50 dark:bg-blue-950">
                      <td colSpan={daysInMonth + 12} className="sticky left-0 z-10 px-3 py-1.5 font-bold text-xs text-blue-800 dark:text-blue-200 border border-slate-300 dark:border-slate-600 bg-blue-50 dark:bg-blue-950">
                        ► {deptName.toUpperCase()} ({deptUsers.length})
                      </td>
                    </tr>
                    {deptUsers.map((user, idx) => {
                      const stats = calculateMonthStats(user.attendanceKey);
                      const rowBg = idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800/50';
                      return (
                        <tr key={user.id} className={cn(rowBg, "hover:bg-blue-50/50 dark:hover:bg-blue-950/30")}>
                          <td className={cn("sticky left-0 z-10 px-1 py-1 text-center text-[10px] border border-slate-300 dark:border-slate-600 font-medium", rowBg)}>{idx + 1}</td>
                          <td className={cn("sticky left-[40px] z-10 px-2 py-1 font-medium text-[11px] border border-slate-300 dark:border-slate-600 whitespace-nowrap overflow-hidden text-ellipsis", rowBg)} style={{ maxWidth: 180 }} title={user.full_name}>{user.full_name}</td>
                          <td className={cn("sticky left-[220px] z-10 px-1 py-1 text-center text-[9px] border border-slate-300 dark:border-slate-600 text-muted-foreground", rowBg)}>{deptName.length > 10 ? deptName.substring(0, 10) + '…' : deptName}</td>
                          {days.map((day, i) => {
                            const record = getRecordForDay(user.attendanceKey, day);
                            const notation = getExcelNotation(day, record);
                            return (
                              <td key={i} className={cn("text-center border border-slate-200 dark:border-slate-700", notation.bg)} style={{ padding: '2px 0' }}>
                                <span className={cn("text-[10px]", notation.color)}>{notation.label}</span>
                              </td>
                            );
                          })}
                          <td className="px-1 py-1 text-center font-bold text-emerald-700 bg-green-50 dark:bg-green-900/20 border border-slate-300 dark:border-slate-600">{stats.present}</td>
                          <td className="px-1 py-1 text-center font-bold text-red-700 bg-red-50 dark:bg-red-900/20 border border-slate-300 dark:border-slate-600">{stats.absent}</td>
                          <td className="px-1 py-1 text-center font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/20 border border-slate-300 dark:border-slate-600">{stats.ot}</td>
                          <td className="px-1 py-1 text-center font-bold text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 border border-slate-300 dark:border-slate-600">{stats.satDays}</td>
                          <td className="px-1 py-1 text-center font-extrabold text-violet-700 bg-violet-50 dark:bg-violet-900/20 border border-slate-300 dark:border-slate-600">{stats.total % 1 === 0 ? stats.total : stats.total.toFixed(1)}</td>
                          <td className="px-1 py-1 text-center font-medium text-slate-700 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-[10px]">{stats.expHrs}</td>
                          <td className="px-1 py-1 text-center font-medium text-amber-700 bg-amber-50 dark:bg-amber-900/20 border border-slate-300 dark:border-slate-600 text-[10px]">{stats.wkndFri}</td>
                          <td className="px-1 py-1 text-center font-medium text-pink-700 bg-pink-50 dark:bg-pink-900/20 border border-slate-300 dark:border-slate-600 text-[10px]">{stats.deductHrs}</td>
                          <td className="px-1 py-1 text-center font-extrabold text-cyan-700 bg-cyan-50 dark:bg-cyan-900/20 border border-slate-300 dark:border-slate-600">{stats.netDays % 1 === 0 ? stats.netDays : stats.netDays.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Annual Summary ─── */
function AnnualSummary({ records, users, employees, departments, searchTerm, filterDepartment, filterEmployee, selectedYear }: {
  records: any[]; users: any[]; employees: any[]; departments: any[]; searchTerm: string; filterDepartment: string; filterEmployee: string; selectedYear: number;
}) {
  const userMonthData = useMemo(() => {
    const map = new Map<string, Record<number, { present: number; absent: number; satDays: number; sunOT: number; total: number; wkndFri: number; holidaysWorked: number }>>();
    records.forEach(r => {
      const date = new Date(r.date || r.attendance_date);
      if (date.getFullYear() !== selectedYear) return;
      const month = date.getMonth();
      const userId = r.user_id;
      if (!map.has(userId)) map.set(userId, {});
      const userMap = map.get(userId)!;
      if (!userMap[month]) userMap[month] = { present: 0, absent: 0, satDays: 0, sunOT: 0, total: 0, wkndFri: 0, holidaysWorked: 0 };
      const mdata = userMap[month];
      const holiday = isPublicHoliday(date);
      
      if (isSunday(date)) {
        if (r.status === 'present' || r.status === 'late' || r.status === 'remote') mdata.sunOT++;
      } else if (isSaturday(date)) {
        if (r.status === 'present' || r.status === 'late' || r.status === 'remote') mdata.satDays++;
      } else {
        if (r.status !== 'absent' && r.status !== 'on_leave') {
          mdata.present++;
          if (holiday) mdata.holidaysWorked++;
        }
        else mdata.absent++;
      }
      // Recalculate total
      mdata.total = mdata.present + (mdata.satDays * 0.5) + mdata.sunOT;
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
      const matchesEmployee = !filterEmployee || filterEmployee === 'all' || u.attendanceKey === filterEmployee || u.id === filterEmployee;
      return matchesSearch && matchesDept && matchesEmployee;
    });
    const map = new Map<string, typeof filtered>();
    filtered.forEach(u => {
      const deptName = departments.find((d: any) => d.id === u.department_id)?.name || 'Unassigned';
      const list = map.get(deptName) || [];
      list.push(u);
      map.set(deptName, list);
    });
    return map;
  }, [mergedUsers, searchTerm, filterDepartment, filterEmployee, departments]);

  return (
    <Card className="shadow-corporate overflow-hidden">
      <CardHeader className="pb-2 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Staff Attendance Summary {selectedYear}
            </CardTitle>
            <CardDescription className="text-[10px] mt-1">
              P=Present days (Mon-Fri) | A=Absent | Sundays=Sunday OT | Sat=Saturday half-days | Rate=P÷(P+A) | OT=Sat+Sun+Holidays
            </CardDescription>
          </div>
          <CardDescription className="text-[10px]">Prepared: {format(new Date(), 'dd MMMM yyyy')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[1800px]">
              <thead>
                <tr className="bg-muted/40">
                  <th className="sticky left-0 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold w-8 border-b border-r">#</th>
                  <th className="sticky left-8 z-10 bg-muted/90 px-3 py-2.5 text-left font-semibold min-w-[160px] border-b border-r">Employee</th>
                  <th className="px-2 py-2.5 text-center font-semibold w-16 border-b border-r">Dept</th>
                  {MONTH_NAMES.map(m => (
                    <th key={m} className="px-2 py-2.5 text-center font-semibold w-10 border-b">{m}</th>
                  ))}
                  <th className="px-2 py-2.5 text-center font-bold bg-emerald-100/60 dark:bg-emerald-900/20 border-b border-l text-[10px]">Present</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-red-100/60 dark:bg-red-900/20 border-b text-[10px]">Absent</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-orange-100/60 dark:bg-orange-900/20 border-b text-[10px]">Sun<br/>days</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-slate-100/60 dark:bg-slate-800/20 border-b text-[10px]">Rate</th>
                  <th className="px-1 py-2.5 border-b w-2"></th>
                  <th className="px-2 py-2.5 text-center font-bold bg-cyan-100/60 dark:bg-cyan-900/20 border-b text-[10px]">Yr Days<br/>Worked</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-red-50/60 dark:bg-red-900/10 border-b text-[10px]">Yr Days<br/>OFF</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-amber-100/60 dark:bg-amber-900/20 border-b text-[10px]">Yr Wknd<br/>Fri</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-pink-100/60 dark:bg-pink-900/20 border-b text-[10px]">Yr Deduct<br/>Days</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-blue-100/60 dark:bg-blue-900/20 border-b text-[10px]">Sat OT<br/>Days</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-orange-100/60 dark:bg-orange-900/20 border-b text-[10px]">Sun OT<br/>Days</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-violet-100/60 dark:bg-violet-900/20 border-b text-[10px]">Total OT<br/>Days</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-rose-100/60 dark:bg-rose-900/20 border-b text-[10px]">Holidays<br/>Worked</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-emerald-200/60 dark:bg-emerald-800/30 border-b text-[10px]">Grand<br/>Total OT</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-teal-100/60 dark:bg-teal-900/20 border-b text-[10px]">OT<br/>Taken</th>
                  <th className="px-2 py-2.5 text-center font-bold bg-indigo-100/60 dark:bg-indigo-900/20 border-b text-[10px]">OT<br/>Balance</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(grouped.entries()).map(([deptName, deptUsers]) => (
                  <>
                    <tr key={`dept-${deptName}`} className="bg-primary/5">
                      <td colSpan={30} className="px-3 py-2 font-bold text-xs text-primary border-b">► {deptName.toUpperCase()}</td>
                    </tr>
                    {deptUsers.map((user, idx) => {
                      const monthData = userMonthData.get(user.attendanceKey) || {};
                      let totalPresent = 0, totalAbsent = 0, totalSunOT = 0, totalSatDays = 0, totalWkndFri = 0, totalHolidaysWorked = 0;
                      const monthValues = MONTH_NAMES.map((_, i) => {
                        const data = monthData[i] || { present: 0, absent: 0, satDays: 0, sunOT: 0, total: 0, wkndFri: 0, holidaysWorked: 0 };
                        totalPresent += data.present;
                        totalAbsent += data.absent;
                        totalSunOT += data.sunOT;
                        totalSatDays += data.satDays;
                        totalWkndFri += data.wkndFri;
                        totalHolidaysWorked += data.holidaysWorked;
                        return data.total;
                      });
                      const yrDaysWorked = totalPresent + (totalSatDays * 0.5) + totalSunOT;
                      const yrDaysOff = totalAbsent;
                      const yrDeductDays = totalWkndFri * 0.5; // Wknd Fri × 4hrs ÷ 8hrs/day
                      const totalOTDays = totalSatDays + totalSunOT;
                      const grandTotalOT = totalOTDays + totalHolidaysWorked;
                      const otTaken = 0; // Manually tracked
                      const otBalance = grandTotalOT - otTaken;
                      const rate = (totalPresent + totalAbsent) > 0 
                        ? (totalPresent / (totalPresent + totalAbsent)) 
                        : 0;
                      return (
                        <tr key={user.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-3 py-2 text-muted-foreground border-r text-center">{idx + 1}</td>
                          <td className="sticky left-8 z-10 bg-card px-3 py-2 font-medium truncate max-w-[160px] border-r">{user.full_name}</td>
                          <td className="px-2 py-2 text-center text-muted-foreground border-r text-[10px]">{deptName.substring(0, 8)}</td>
                          {monthValues.map((val, i) => (
                            <td key={i} className="px-2 py-2 text-center">
                              {val > 0 ? (
                                <span className="font-medium">{val % 1 === 0 ? val : val.toFixed(1)}</span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20 border-l">{totalPresent}</td>
                          <td className="px-2 py-2 text-center font-bold text-red-600 bg-red-50/50 dark:bg-red-900/20">{totalAbsent}</td>
                          <td className="px-2 py-2 text-center font-bold text-orange-600 bg-orange-50/50 dark:bg-orange-900/20">{totalSunOT}</td>
                          <td className={cn(
                            "px-2 py-2 text-center font-bold bg-slate-50/50 dark:bg-slate-800/20",
                            rate >= 0.85 ? "text-emerald-600" : rate >= 0.60 ? "text-amber-600" : "text-red-600"
                          )}>{(rate * 100).toFixed(1)}%</td>
                          <td className="px-1 py-2 border-b w-2"></td>
                          <td className="px-2 py-2 text-center font-extrabold text-cyan-700 bg-cyan-50/50 dark:bg-cyan-900/20">{yrDaysWorked % 1 === 0 ? yrDaysWorked : yrDaysWorked.toFixed(1)}</td>
                          <td className="px-2 py-2 text-center font-bold text-red-500 bg-red-50/30 dark:bg-red-900/10">{yrDaysOff}</td>
                          <td className="px-2 py-2 text-center font-medium text-amber-600 bg-amber-50/50 dark:bg-amber-900/20">{totalWkndFri}</td>
                          <td className="px-2 py-2 text-center font-medium text-pink-600 bg-pink-50/50 dark:bg-pink-900/20">{yrDeductDays % 1 === 0 ? yrDeductDays : yrDeductDays.toFixed(1)}</td>
                          <td className="px-2 py-2 text-center font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-900/20">{totalSatDays}</td>
                          <td className="px-2 py-2 text-center font-bold text-orange-600 bg-orange-50/50 dark:bg-orange-900/20">{totalSunOT}</td>
                          <td className="px-2 py-2 text-center font-bold text-violet-600 bg-violet-50/50 dark:bg-violet-900/20">{totalOTDays}</td>
                          <td className="px-2 py-2 text-center font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-900/20">{totalHolidaysWorked}</td>
                          <td className="px-2 py-2 text-center font-extrabold text-emerald-700 bg-emerald-100/50 dark:bg-emerald-800/30">{grandTotalOT % 1 === 0 ? grandTotalOT : grandTotalOT.toFixed(1)}</td>
                          <td className="px-2 py-2 text-center font-medium text-teal-600 bg-teal-50/50 dark:bg-teal-900/20">{otTaken}</td>
                          <td className={cn(
                            "px-2 py-2 text-center font-extrabold bg-indigo-50/50 dark:bg-indigo-900/20",
                            otBalance > 0 ? "text-indigo-700" : otBalance < 0 ? "text-red-600" : "text-muted-foreground"
                          )}>{otBalance % 1 === 0 ? otBalance : otBalance.toFixed(1)}</td>
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
/* ─── Quick Leave Calculator & Holidays ─── */
function QuickCalculator({ selectedYear }: { selectedYear: number }) {
  const [lastDayOfWork, setLastDayOfWork] = useState('');
  const [returnToWork, setReturnToWork] = useState('');

  const holidays = useMemo(() => getRwandanHolidays(selectedYear), [selectedYear]);

  const leaveCalc = useMemo(() => {
    if (!lastDayOfWork || !returnToWork) return null;
    const start = new Date(lastDayOfWork);
    const end = new Date(returnToWork);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    // Leave starts day after last workday, ends day before return
    const leaveStart = new Date(start);
    leaveStart.setDate(leaveStart.getDate() + 1);
    const leaveEnd = new Date(end);
    leaveEnd.setDate(leaveEnd.getDate() - 1);
    if (leaveEnd < leaveStart) return { totalDays: 0, workingDays: 0, weekends: 0, holidays: 0, holidayList: [] };
    return countWorkingDays(leaveStart, leaveEnd);
  }, [lastDayOfWork, returnToWork]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Leave Calculator */}
      <Card className="shadow-corporate border-l-4 border-l-info">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-info" />
            Quick Date Range Calculator
          </CardTitle>
          <CardDescription className="text-[10px]">
            Enter last day of work and return date to calculate leave days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Last Day of Work</label>
              <Input type="date" value={lastDayOfWork} onChange={e => setLastDayOfWork(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-1">Return to Work</label>
              <Input type="date" value={returnToWork} onChange={e => setReturnToWork(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
          {leaveCalc && (
            <div className="bg-muted/30 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{leaveCalc.totalDays}</div>
                  <div className="text-[9px] text-muted-foreground">Calendar Days</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">{leaveCalc.workingDays}</div>
                  <div className="text-[9px] text-muted-foreground">Working Days</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{leaveCalc.weekends}</div>
                  <div className="text-[9px] text-muted-foreground">Weekend Days</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-rose-600">{leaveCalc.holidays}</div>
                  <div className="text-[9px] text-muted-foreground">Public Holidays</div>
                </div>
              </div>
              {leaveCalc.holidayList.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Holidays in range:</p>
                  {leaveCalc.holidayList.map((h, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] mr-1 mb-1">
                      {format(h.date, 'dd MMM')} — {h.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rwandan Public Holidays */}
      <Card className="shadow-corporate border-l-4 border-l-rose-400">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            🇷🇼 Rwandan Public Holidays {selectedYear}
          </CardTitle>
          <CardDescription className="text-[10px]">
            {holidays.length} public holidays
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[300px]">
            <div className="px-4 pb-4 space-y-1">
              {holidays.map((h, i) => {
                const isPast = h.date < new Date();
                const isToday = isSameDay(h.date, new Date());
                return (
                  <div key={i} className={cn(
                    "flex items-center justify-between py-2 px-3 rounded-md text-xs",
                    isToday && "bg-primary/10 border border-primary/30",
                    isPast && !isToday && "opacity-60",
                  )}>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        isToday ? "bg-primary animate-pulse" : isPast ? "bg-muted-foreground" : "bg-rose-500"
                      )} />
                      <span className="font-medium">{h.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={h.type === 'moveable' ? 'secondary' : 'outline'} className="text-[9px]">
                        {h.type}
                      </Badge>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {format(h.date, 'EEE, dd MMM')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Main Component ─── */
export function AttendanceTrackingTab({ departmentId }: AttendanceTrackingTabProps) {
  const [activeView, setActiveView] = useState<'monthly' | 'annual' | 'calculator'>('monthly');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const [classificationSummary, setClassificationSummary] = useState<ClassificationSummary | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('none');
  const [previewGroupBy, setPreviewGroupBy] = useState<'company' | 'flat'>('company');
  const [uploadTargetDate, setUploadTargetDate] = useState<string>('');
  const [crossMidnightEnabled, setCrossMidnightEnabled] = useState(true);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const loadStartRef = useRef<number | null>(null);
  const [selectedKpiDate, setSelectedKpiDate] = useState<Date>(new Date());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { departments } = useDepartments();
  const { users } = useUsers();
  const { employees } = useEmployees();
  const { companies } = useCompanies();
  const { getPolicyValue } = useCompanyPolicies(null);
  const policyValues = useMemo(() => buildPolicyValues(getPolicyValue), [getPolicyValue]);

  // Compute date range for the query based on active view
  const dateRange = useMemo(() => {
    if (activeView === 'annual') {
      return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` };
    }
    // Monthly: use the selected month
    const y = selectedMonth.getFullYear();
    const m = selectedMonth.getMonth();
    const firstDay = format(new Date(y, m, 1), 'yyyy-MM-dd');
    const lastDay = format(new Date(y, m + 1, 0), 'yyyy-MM-dd');
    return { from: firstDay, to: lastDay };
  }, [activeView, selectedYear, selectedMonth]);

  // Track load start time when query params change
  useMemo(() => { loadStartRef.current = performance.now(); }, [dateRange, filterDepartment]);

  const { records, isLoading, refetch, bulkImportAttendance } = useAttendance(
    filterDepartment === 'all' ? undefined : filterDepartment,
    undefined,
    dateRange
  );

  // Measure load time when loading completes
  useMemo(() => {
    if (!isLoading && loadStartRef.current !== null) {
      setLoadTimeMs(Math.round(performance.now() - loadStartRef.current));
      loadStartRef.current = null;
    }
  }, [isLoading]);

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

      // ═══════════════════════════════════════════════════════════════════════
      // ADVANCED NAME MATCHING ENGINE (ported from import_attendance_v2.cjs)
      // Handles: reversed names, concatenated names, spelling variations,
      // truncated names, single-word names, and prevents false positives
      // from common given names like Jean, Pierre, Emmanuel, Claude etc.
      // ═══════════════════════════════════════════════════════════════════════

      const normalizeName = (n: string) =>
        n.toLowerCase().replace(/[._\-\/\\,;:()]+/g, ' ').replace(/\s+/g, ' ')
         .replace(/\b(xxx|mr|mrs|ms|dr)\b/gi, '').trim();

      // Levenshtein distance for fuzzy matching
      const levenshtein = (a: string, b: string): number => {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;
        const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++)
          for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        return dp[m][n];
      };

      // Common given names — should NOT match alone without a rare surname
      const COMMON_GIVEN_NAMES = new Set([
        'jean', 'pierre', 'emmanuel', 'claude', 'baptiste', 'marie', 'bosco',
        'damascene', 'joseph', 'eric', 'vincent', 'francois', 'alphonse',
        'alexandre', 'augustin', 'gaspard', 'alexis', 'janvier', 'celestin',
        'innocent', 'dieudonne', 'andre', 'david', 'daniel', 'paul', 'john',
        'peter', 'james', 'kumar', 'charles', 'aime', 'andrew', 'samuel',
        'de', 'dieu', 'nepomuscene', 'nepo', 'jmv', 'francoise', 'venuste',
        'simeon', 'anastase', 'marco',
      ]);

      const wordRarity = (w: string) => {
        if (COMMON_GIVEN_NAMES.has(w)) return 0.3;
        if (w.length <= 2) return 0.1;
        if (w.length <= 3) return 0.5;
        return 1.0;
      };

      const wordMatchScore = (a: string, b: string): number => {
        if (a === b) return 100;
        // Prefix match (truncation: "FABRI" ↔ "FABRICE")
        if (a.length >= 3 && b.length >= 3) {
          const minLen = Math.min(a.length, b.length);
          if (a.startsWith(b.substring(0, minLen)) || b.startsWith(a.substring(0, minLen))) {
            return Math.round((minLen / Math.max(a.length, b.length)) * 90);
          }
        }
        // Levenshtein fuzzy
        if (a.length >= 4 && b.length >= 4) {
          const maxLen = Math.max(a.length, b.length);
          const dist = levenshtein(a, b);
          const threshold = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;
          if (dist <= threshold) return Math.round(((maxLen - dist) / maxLen) * 85);
        }
        return 0;
      };

      // Build known tokens from all employee names for concatenated-name splitting
      const allTokens = new Set<string>();
      employeeLookup.forEach(e => {
        normalizeName(e.full_name || '').split(' ').filter((t: string) => t.length >= 3).forEach((t: string) => allTokens.add(t));
      });
      userLookup.forEach(u => {
        normalizeName(u.full_name || '').split(' ').filter((t: string) => t.length >= 3).forEach((t: string) => allTokens.add(t));
      });
      const knownTokens = [...allTokens];

      // Try to split concatenated tokens like "ishimwejpierre" → ["ishimwe", "pierre"]
      const trySplitConcatenated = (token: string): string[] => {
        if (token.length < 6) return [token];
        for (const known of knownTokens) {
          if (known.length < 3) continue;
          if (token.startsWith(known) && token.length > known.length) {
            const remainder = token.substring(known.length);
            if (remainder.length >= 2) {
              const rMatch = knownTokens.find(k => k === remainder || (k.length >= 4 && remainder.length >= 4 && levenshtein(k, remainder) <= 1));
              if (rMatch) return [known, rMatch];
              if (known.length >= 5 && remainder.length >= 4) return [known, remainder];
            }
          }
          if (token.endsWith(known) && token.length > known.length) {
            const prefix = token.substring(0, token.length - known.length);
            if (prefix.length >= 3) {
              const pMatch = knownTokens.find(k => k === prefix || (k.length >= 4 && prefix.length >= 4 && levenshtein(k, prefix) <= 1));
              if (pMatch) return [pMatch, known];
              if (known.length >= 5 && prefix.length >= 4) return [prefix, known];
            }
          }
        }
        return [token];
      };

      const tokenize = (name: string): string[] => {
        const tokens = normalizeName(name).split(' ').filter(t => t.length > 0);
        const expanded: string[] = [];
        for (const token of tokens) expanded.push(...trySplitConcatenated(token));
        return expanded;
      };

      // Score two token sets — handles reversed names, fuzzy, common-name penalty
      const matchScoreFn = (tokA: string[], tokB: string[]): number => {
        if (tokA.length === 0 || tokB.length === 0) return 0;
        const shorter = tokA.length <= tokB.length ? tokA : tokB;
        const longer = tokA.length <= tokB.length ? tokB : tokA;
        let totalWeightedScore = 0, totalWeight = 0;
        let rareWordMatched = false, unmatchedRealWords = 0;
        const usedIdx = new Set<number>();

        for (const word of shorter) {
          const rarity = wordRarity(word);
          let bestScore = 0, bestIdx = -1;
          for (let i = 0; i < longer.length; i++) {
            if (usedIdx.has(i)) continue;
            const s = wordMatchScore(word, longer[i]);
            if (s > bestScore) { bestScore = s; bestIdx = i; }
          }
          if (bestIdx >= 0 && bestScore >= 50) {
            usedIdx.add(bestIdx);
            totalWeightedScore += bestScore * rarity;
            totalWeight += rarity;
            if (rarity >= 0.8 && bestScore >= 70) rareWordMatched = true;
          } else {
            totalWeight += rarity;
            if (word.length >= 4) unmatchedRealWords++;
          }
        }

        if (totalWeight === 0) return 0;
        let avg = totalWeightedScore / totalWeight;

        // Prevent false positives from only common given names matching
        if (!rareWordMatched && shorter.length > 1) avg = Math.min(avg, 40);

        // Different-person-same-surname detection
        if (shorter.length >= 2 && unmatchedRealWords > 0) {
          const unusedFromLonger = longer.filter((_, i) => !usedIdx.has(i));
          if (unusedFromLonger.filter(w => w.length >= 4).length > 0) avg = Math.min(avg, 50);
        }

        const countPenalty = shorter.length === 1 && longer.length > 2 ? 10 : 0;
        const coverageBonus = usedIdx.size === shorter.length && usedIdx.size === longer.length ? 5 : 0;
        return Math.max(0, Math.min(100, avg - countPenalty + coverageBonus));
      };

      // Pre-tokenize employees and users
      const empTokenized = employeeLookup.map(e => ({ ...e, tokens: tokenize(e.full_name || ''), normalized: normalizeName(e.full_name || '') }));
      const userTokenized = userLookup.map(u => ({ ...u, tokens: tokenize(u.full_name || ''), normalized: normalizeName(u.full_name || '') }));

      // Returns { match, matchScore, nearestName, nearestScore } for rich match info
      const matchUser = (name: string, empNo?: string, excelDept?: string): {
        match: (typeof empTokenized[0] & { type: 'employee' | 'user' }) | null;
        matchScore: number;
        nearestName: string | null;
        nearestScore: number;
      } => {
        const noMatch = (nearestName: string | null, nearestScore: number) => ({ match: null, matchScore: 0, nearestName, nearestScore });
        const found = (m: any, type: 'employee' | 'user', score: number) => ({ match: { type, ...m }, matchScore: score, nearestName: null, nearestScore: 0 });

        let classifiedCompanyId: string | undefined;
        if (excelDept) {
          const cls = classifyDept(excelDept);
          classifiedCompanyId = cls.company?.companyId;
        }

        const searchNorm = normalizeName(name);
        const bioTokens = tokenize(name);

        // 1. Fingerprint + name cross-validation
        if (empNo) {
          const fp = empNo.trim();
          const candidatesFromFp: (typeof employeeLookup[0])[] = [];
          if (classifiedCompanyId) {
            const byCompanyFp = fingerprintByCompanyMap.get(`${classifiedCompanyId}:${fp}`);
            if (byCompanyFp) candidatesFromFp.push(byCompanyFp);
          }
          const byGlobalFp = fingerprintGlobalMap.get(fp);
          if (byGlobalFp && !candidatesFromFp.includes(byGlobalFp)) candidatesFromFp.push(byGlobalFp);

          for (const candidate of candidatesFromFp) {
            const cNorm = normalizeName(candidate.full_name || '');
            const cTokens = tokenize(candidate.full_name || '');
            const fpScore = cNorm === searchNorm ? 100 : matchScoreFn(bioTokens, cTokens);
            if (fpScore >= 55) return found(candidate, 'employee', fpScore);
          }
        }

        // 2. Exact normalized match (company-scoped first)
        const exactInScope = classifiedCompanyId
          ? empTokenized.find(e => e.company_id === classifiedCompanyId && e.normalized === searchNorm)
          : undefined;
        if (exactInScope) return found(exactInScope, 'employee', 100);

        const exactGlobal = empTokenized.find(e => e.normalized === searchNorm);
        if (exactGlobal) return found(exactGlobal, 'employee', 100);

        // 3. Score-based fuzzy matching
        let bestMatch: (typeof empTokenized[0]) | null = null;
        let bestScore = 0;
        const pool = classifiedCompanyId
          ? empTokenized.filter(e => e.company_id === classifiedCompanyId)
          : empTokenized;

        for (const emp of pool) {
          const s = matchScoreFn(bioTokens, emp.tokens);
          if (s > bestScore) { bestScore = s; bestMatch = emp; }
        }

        // If company-scoped didn't find a good match, try all employees
        if (bestScore < 60 && classifiedCompanyId) {
          for (const emp of empTokenized) {
            const s = matchScoreFn(bioTokens, emp.tokens);
            if (s > bestScore) { bestScore = s; bestMatch = emp; }
          }
        }

        // Single-word name matching (e.g., "KWIZERA" or "Rajbali")
        if (bioTokens.length === 1) {
          for (const emp of empTokenized) {
            if (emp.tokens.some(t => t === bioTokens[0] || (bioTokens[0].length >= 4 && levenshtein(t, bioTokens[0]) <= 1))) {
              const s = emp.tokens.length === 1 ? 95 : 75;
              if (s > bestScore) { bestScore = s; bestMatch = emp; }
            }
          }
        }

        if (bestScore >= 60 && bestMatch) return found(bestMatch, 'employee', bestScore);

        // Track the best near-miss for display (employee)
        const nearName = bestMatch?.full_name || null;
        const nearScore = bestScore;

        // 4. Try profiles/users
        const uExact = userTokenized.find(u => u.normalized === searchNorm);
        if (uExact) return found(uExact, 'user', 100);

        let bestUserMatch: (typeof userTokenized[0]) | null = null;
        let bestUserScore = 0;
        for (const u of userTokenized) {
          const s = matchScoreFn(bioTokens, u.tokens);
          if (s > bestUserScore) { bestUserScore = s; bestUserMatch = u; }
        }
        if (bestUserScore >= 60 && bestUserMatch) return found(bestUserMatch, 'user', bestUserScore);

        // Return near-miss info so the UI can show "Nearest: XXX (Score: 45)"
        const finalNearName = bestUserScore > nearScore ? (bestUserMatch?.full_name || null) : nearName;
        const finalNearScore = Math.max(nearScore, bestUserScore);
        return noMatch(finalNearName, finalNearScore);
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

          const { match: matchedUser, matchScore, nearestName, nearestScore } = matchUser(name, group.empNo, group.excelDept);
          const classification = classifyDept(group.excelDept);

          // Apply business rules from policy engine
          const processed = processAttendanceRecord(earliestIn, latestOut, policyValues);

          // Determine department: matched user's department > classification > leave unresolved (do NOT default to HR)
          let resolvedDeptId = matchedUser?.department_id || classification.departmentId || null;

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
            matchScore,
            nearestName,
            nearestScore,
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

          const { match: matchedUser, matchScore, nearestName, nearestScore } = matchUser(name, undefined, excelDept);
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

          // Determine department: matched user's department > classification > leave unresolved (do NOT default to HR)
          let resolvedDeptId = matchedUser?.department_id || classification.departmentId || null;

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
            matchScore,
            nearestName,
            nearestScore,
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
      console.error('Attendance upload parse error:', err);
      toast({ title: 'Failed to read file', description: String(err), variant: 'destructive' });
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [users, employees, departmentId, toast, companies, departments, classifier, policyValues, selectedCompanyId, crossMidnightEnabled]);

  // State for unmatched employees review
  const [showUnmatchedReview, setShowUnmatchedReview] = useState(false);
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

  const handleImport = async () => {
    if (!uploadPreview) return;
    // Filter to records that have ALL required fields: matched user, userId, AND department
    const validRecords = uploadPreview.filter(r => r.matched && r.userId && r.departmentId);
    const missingDeptCount = uploadPreview.filter(r => r.matched && r.userId && !r.departmentId).length;
    if (validRecords.length === 0) {
      toast({ 
        title: 'No importable records', 
        description: missingDeptCount > 0 
          ? `${missingDeptCount} matched employees have no department assigned. Please assign departments in the Employee Hub first.`
          : 'No employees could be matched from the Excel file.',
        variant: 'destructive' 
      });
      return;
    }
    if (missingDeptCount > 0) {
      toast({ 
        title: `${missingDeptCount} records skipped — no department`, 
        description: 'These employees need a department assigned in the Employee Hub.',
      });
    }

    // Check for unmatched employees (just inform, don't block import)
    if (unmatchedEmployees.length > 0 && !showUnmatchedReview && !unmatchedReviewed) {
      setShowUnmatchedReview(true);
      // Don't return — proceed with import immediately
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
    } catch (err: any) {
      console.error('Attendance import error:', err);
      const message = err?.message || String(err);
      toast({ 
        title: 'Import failed', 
        description: message.includes('department_id') 
          ? 'Some employees are missing department assignments. Please assign departments in the Employee Hub first.'
          : message,
        variant: 'destructive' 
      });
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
            {row.matchScore > 0 && row.matchScore < 100 && (
              <span className="text-emerald-400 ml-0.5">({row.matchScore}%)</span>
            )}
          </span>
        ) : (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 text-red-500 text-[10px] font-medium">
              <AlertCircle className="h-3 w-3" /> Not in System
            </span>
            {row.nearestName && row.nearestScore > 0 && (
              <span className="text-muted-foreground text-[9px] ml-4 truncate max-w-[200px]" title={`Nearest: ${row.nearestName} (${row.nearestScore}% match)`}>
                Nearest: {row.nearestName} ({row.nearestScore}%)
              </span>
            )}
          </div>
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
    <div className="space-y-2">
      {/* KPI Cards — Daily */}
      <AttendanceKPICards records={records} users={users} employees={employees} selectedMonth={selectedMonth} selectedYear={selectedYear} activeView={activeView} selectedDate={selectedKpiDate} />

      {/* Performance Monitor */}
      <AttendancePerformanceMonitor loadTimeMs={loadTimeMs} recordCount={records.length} isLoading={isLoading} />

      {/* Compact Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        {/* View Tabs */}
        <div className="flex items-center rounded-lg border p-0.5 shrink-0">
          <Button variant={activeView === 'monthly' ? 'default' : 'ghost'} size="sm" className="h-7 text-[11px] px-2.5" onClick={() => setActiveView('monthly')}>
            <Table2 className="h-3 w-3 mr-1" /> Monthly
          </Button>
          <Button variant={activeView === 'annual' ? 'default' : 'ghost'} size="sm" className="h-7 text-[11px] px-2.5" onClick={() => setActiveView('annual')}>
            <BarChart3 className="h-3 w-3 mr-1" /> Annual
          </Button>
          <Button variant={activeView === 'calculator' ? 'default' : 'ghost'} size="sm" className="h-7 text-[11px] px-2.5" onClick={() => setActiveView('calculator')}>
            <CalendarIcon className="h-3 w-3 mr-1" /> Calculator
          </Button>
        </div>

        <div className="h-5 w-px bg-border shrink-0" />

        {/* Date Navigation */}
        {activeView === 'monthly' && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-semibold min-w-[80px] text-center">{format(selectedMonth, 'MMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {(activeView === 'annual' || activeView === 'calculator') && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-bold min-w-[40px] text-center">{selectedYear}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedYear(y => y + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* KPI Date Picker */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">KPI Date:</span>
          <Input
            type="date"
            value={format(selectedKpiDate, 'yyyy-MM-dd')}
            onChange={(e) => e.target.value && setSelectedKpiDate(new Date(e.target.value + 'T00:00:00'))}
            className="h-7 w-[130px] text-[11px]"
          />
        </div>

        <div className="h-5 w-px bg-border shrink-0" />

        {/* Filters */}
        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-[140px] h-7 text-[11px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-[150px] h-7 text-[11px]"><SelectValue placeholder="All Employees" /></SelectTrigger>
          <SelectContent className="max-h-[300px]">
            <SelectItem value="all">All Employees</SelectItem>
            {employees
              .slice()
              .sort((a: any, b: any) => (a.full_name || '').localeCompare(b.full_name || ''))
              .map((emp: any) => (
                <SelectItem key={emp.id} value={emp.linked_user_id || emp.id}>{emp.full_name}</SelectItem>
              ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Actions */}
        <Button variant={showUpload ? 'default' : 'outline'} size="sm" className="h-7 text-[11px] px-2.5" onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-3 w-3 mr-1" /> Import
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => refetch()}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {/* Collapsible Upload Panel */}
      {showUpload && (
        <div className="border rounded-lg bg-muted/30 p-3 mx-1">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px]">
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Company</label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Auto-detect" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Auto-detect all</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <label className="text-[10px] text-muted-foreground font-medium mb-1 block">Date (ref)</label>
              <Input type="date" value={uploadTargetDate} onChange={e => setUploadTargetDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-medium h-8">
              <input type="checkbox" checked={crossMidnightEnabled} onChange={e => setCrossMidnightEnabled(e.target.checked)} className="rounded border-border" />
              Cross-midnight merge <Moon className="h-3 w-3 text-indigo-500" />
            </label>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} disabled={isParsing} />
            {isParsing ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground h-8">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{parseProgress}</span>
              </div>
            ) : (
              <Button size="sm" className="h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Upload Excel
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => setShowUpload(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

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
                    Import {uploadPreview.filter(r => r.matched).length} Matched
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
                    {unmatchedEmployees.length} Employees Not in System
                  </h4>
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowUnmatchedReview(false)}>
                  Dismiss
                </Button>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400 mb-3">
                These names from the Excel file don&apos;t match any employee in the system. 
                They will be automatically skipped during import. Only matched records are imported.
              </p>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {unmatchedEmployees.map((emp) => {
                    // Find nearest match info from upload preview
                    const previewRow = uploadPreview?.find(r => r.name === emp.name && !r.matched);
                    return (
                      <div
                        key={emp.name}
                        className="flex items-center gap-3 px-3 py-2 rounded-md bg-card border border-border text-sm"
                      >
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{emp.name}</span>
                          {emp.empNo && <span className="text-muted-foreground ml-2 text-xs">#{emp.empNo}</span>}
                          {previewRow?.nearestName && previewRow.nearestScore > 0 && (
                            <span className="block text-[10px] text-muted-foreground ml-0">
                              Nearest: {previewRow.nearestName} ({previewRow.nearestScore}% match — below 60% threshold)
                            </span>
                          )}
                          {(!previewRow?.nearestName || previewRow.nearestScore === 0) && (
                            <span className="block text-[10px] text-muted-foreground ml-0">
                              No matching employee found in the database
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">{emp.occurrences} entries</Badge>
                        {emp.classifiedCompany !== 'Unknown' && (
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/5 text-primary">{emp.classifiedCompany}</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
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
        <MonthlyGrid records={records} selectedMonth={selectedMonth} users={users} employees={employees} departments={departments} searchTerm={searchTerm} filterDepartment={filterDepartment} filterEmployee={filterEmployee} />
      ) : activeView === 'annual' ? (
        <AnnualSummary records={records} users={users} employees={employees} departments={departments} searchTerm={searchTerm} filterDepartment={filterDepartment} filterEmployee={filterEmployee} selectedYear={selectedYear} />
      ) : (
        <QuickCalculator selectedYear={selectedYear} />
      )}
    </div>
  );
}
