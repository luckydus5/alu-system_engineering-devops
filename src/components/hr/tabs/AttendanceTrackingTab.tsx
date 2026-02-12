import { useState, useMemo, useRef, useCallback } from 'react';
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
  UserCheck, UserX, Timer, Award
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

/* ─── KPI Summary Cards ─── */
function AttendanceKPICards({ records, users, selectedMonth }: { records: any[]; users: any[]; selectedMonth: Date }) {
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

    return { present, late, absent, onLeave, attendanceRate, totalEmployees: users.length, totalRecords: monthRecords.length };
  }, [records, users, selectedMonth]);

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
function MonthlyGrid({ records, selectedMonth, users, departments, searchTerm, filterDepartment }: {
  records: any[]; selectedMonth: Date; users: any[]; departments: any[]; searchTerm: string; filterDepartment: string;
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

  const employeeList = useMemo(() => {
    let filtered = users.filter(u => {
      const matchesSearch = !searchTerm || u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || u.department_id === filterDepartment;
      return matchesSearch && matchesDept;
    });
    const grouped = new Map<string, any[]>();
    filtered.forEach(u => {
      const deptName = departments.find(d => d.id === u.department_id)?.name || 'Unassigned';
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
    let present = 0, absent = 0, ot = 0;
    days.forEach(day => {
      const rec = getRecordForDay(userId, day);
      if (isSunday(day) || isSaturday(day)) {
        if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'remote')) ot++;
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
                      const stats = calculateMonthStats(user.id);
                      return (
                        <tr key={user.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-3 py-2 text-muted-foreground border-r text-center">{idx + 1}</td>
                          <td className="sticky left-8 z-10 bg-card px-3 py-2 font-medium truncate max-w-[160px] border-r">{user.full_name || user.email}</td>
                          <td className="px-2 py-2 text-center text-muted-foreground border-r text-[10px]">{deptName.substring(0, 8)}</td>
                          {days.map((day, i) => {
                            const record = getRecordForDay(user.id, day);
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
function AnnualSummary({ records, users, departments, searchTerm, filterDepartment, selectedYear }: {
  records: any[]; users: any[]; departments: any[]; searchTerm: string; filterDepartment: string; selectedYear: number;
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

  const grouped = useMemo(() => {
    const filtered = users.filter(u => {
      const matchesSearch = !searchTerm || u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = filterDepartment === 'all' || u.department_id === filterDepartment;
      return matchesSearch && matchesDept;
    });
    const map = new Map<string, any[]>();
    filtered.forEach(u => {
      const deptName = departments.find(d => d.id === u.department_id)?.name || 'Unassigned';
      const list = map.get(deptName) || [];
      list.push(u);
      map.set(deptName, list);
    });
    return map;
  }, [users, searchTerm, filterDepartment, departments]);

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
                        <tr key={user.id} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="sticky left-0 z-10 bg-card px-3 py-2 text-muted-foreground border-r text-center">{idx + 1}</td>
                          <td className="sticky left-8 z-10 bg-card px-3 py-2 font-medium truncate max-w-[160px] border-r">{user.full_name || user.email}</td>
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
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { departments } = useDepartments();
  const { users } = useUsers();
  const { employees } = useEmployees();
  const { companies } = useCompanies();
  const { records, isLoading, refetch, bulkImportAttendance } = useAttendance(
    filterDepartment === 'all' ? undefined : filterDepartment
  );

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

      // Company/department matching from Excel department column
      const matchCompany = (excelDept: string): { companyName: string | null; companyId: string | null; deptId: string | null } => {
        if (!excelDept) return { companyName: null, companyId: null, deptId: null };
        const search = excelDept.toLowerCase().trim();
        // Try to match against companies
        for (const c of companies) {
          const cName = c.name.toLowerCase();
          if (search.includes(cName) || cName.includes(search) || search.includes(c.code.toLowerCase())) {
            return { companyName: c.name, companyId: c.id, deptId: null };
          }
        }
        // Try keywords
        if (search.includes('farmer') || search.includes('peatshed') || search.includes('farm')) {
          const c = companies.find(co => co.code === 'FARM');
          if (c) return { companyName: c.name, companyId: c.id, deptId: null };
        }
        if (search.includes('peat') && !search.includes('farmer')) {
          const c = companies.find(co => co.code === 'HQPEAT');
          if (c) return { companyName: c.name, companyId: c.id, deptId: null };
        }
        if (search.includes('service') || search.includes('svc')) {
          const c = companies.find(co => co.code === 'HQSVC');
          if (c) return { companyName: c.name, companyId: c.id, deptId: null };
        }
        if (search.includes('power') || search.includes('hqp')) {
          const c = companies.find(co => co.code === 'HQP');
          if (c) return { companyName: c.name, companyId: c.id, deptId: null };
        }
        // Try department matching
        for (const d of departments) {
          const dName = d.name.toLowerCase();
          if (search.includes(dName) || dName.includes(search)) {
            return { companyName: null, companyId: null, deptId: d.id };
          }
        }
        return { companyName: excelDept, companyId: null, deptId: null };
      };

      const matchUser = (name: string, empNo?: string) => {
        const searchName = name.toLowerCase().trim();
        // Try exact employee number match first
        if (empNo) {
          const byNo = employeeLookup.find(e => e.employee_number === `EMP-${empNo.padStart(4, '0')}` || e.employee_number === empNo);
          if (byNo) return { type: 'employee' as const, ...byNo };
        }
        // Try exact name match against employees first
        let match = employeeLookup.find(e => e.nameLower === searchName);
        if (match) return { type: 'employee' as const, ...match };
        // Try partial match against employees
        match = employeeLookup.find(e => e.nameLower.includes(searchName) || searchName.includes(e.nameLower));
        if (match) return { type: 'employee' as const, ...match };
        // Try profiles/users
        let uMatch = userLookup.find(u => u.nameLower === searchName);
        if (uMatch) return { type: 'user' as const, ...uMatch };
        uMatch = userLookup.find(u => u.nameLower.includes(searchName) || searchName.includes(u.nameLower));
        if (uMatch) return { type: 'user' as const, ...uMatch };
        // Try last name only match (for single-name entries like "MANIRAKOZE")
        const parts = searchName.split(/\s+/);
        if (parts.length === 1) {
          match = employeeLookup.find(e => {
            const eParts = e.nameLower.split(/\s+/);
            return eParts.some(p => p === searchName);
          });
          if (match) return { type: 'employee' as const, ...match };
          uMatch = userLookup.find(u => {
            const uParts = u.nameLower.split(/\s+/);
            return uParts.some(p => p === searchName);
          });
          if (uMatch) return { type: 'user' as const, ...uMatch };
        }
        return null;
      };

      if (isMachineFormat) {
        // ── Machine format: each row is one event (C/In or C/Out) ──
        const grouped = new Map<string, { checkIns: Date[]; checkOuts: Date[]; excelDept: string; empNo: string }>();
        const CHUNK = 2000;

        for (let i = 0; i < jsonData.length; i += CHUNK) {
          const chunk = jsonData.slice(i, i + CHUNK) as Record<string, any>[];
          for (const row of chunk) {
            const name = String(row[nameCol!] || '').trim();
            const dtVal = row[dateTimeCol!];
            const statusVal = String(row[statusCol!] || '').trim().toLowerCase();
            if (!name || !dtVal) continue;

            const dateTime = parseDate(dtVal);
            if (!dateTime) continue;

            const excelDept = deptCol ? String(row[deptCol] || '').trim() : '';
            const empNo = noCol ? String(row[noCol] || '').trim() : '';

            const isCheckIn = /c\/in|c.in|check.?in|clock.?in|in$/i.test(statusVal);
            const dateKey = `${name}|||${format(dateTime, 'yyyy-MM-dd')}`;
            if (!grouped.has(dateKey)) grouped.set(dateKey, { checkIns: [], checkOuts: [], excelDept, empNo });
            const group = grouped.get(dateKey)!;
            if (isCheckIn) group.checkIns.push(dateTime);
            else group.checkOuts.push(dateTime);
            if (!group.excelDept && excelDept) group.excelDept = excelDept;
            if (!group.empNo && empNo) group.empNo = empNo;
          }

          setParseProgress(`Processed ${Math.min(i + CHUNK, jsonData.length).toLocaleString()} / ${jsonData.length.toLocaleString()} rows...`);
          await yieldToUI();
        }

        setParseProgress('Matching employees & departments...');
        await yieldToUI();

        const parsed: any[] = [];
        grouped.forEach((group, key) => {
          const [name, dateStr] = key.split('|||');
          const parsedDate = new Date(dateStr);
          const earliestIn = group.checkIns.length > 0 ? group.checkIns.sort((a, b) => a.getTime() - b.getTime())[0] : null;
          const latestOut = group.checkOuts.length > 0 ? group.checkOuts.sort((a, b) => b.getTime() - a.getTime())[0] : null;

          const matchedUser = matchUser(name, group.empNo);
          const companyMatch = matchCompany(group.excelDept);

          let status: AttendanceStatus = 'present';
          if (!earliestIn && !latestOut) status = 'absent';
          else if (earliestIn && earliestIn.getHours() >= 9) status = 'late';

          // Determine department: matched user's department > company match > fallback
          const resolvedDeptId = matchedUser?.department_id || companyMatch.deptId || departmentId;

          parsed.push({
            name, date: dateStr, dateDisplay: format(parsedDate, 'dd-MMM-yyyy'),
            clockIn: earliestIn ? format(earliestIn, 'HH:mm') : '—',
            clockOut: latestOut ? format(latestOut, 'HH:mm') : '—',
            clockInRaw: earliestIn?.toISOString() || null,
            clockOutRaw: latestOut?.toISOString() || null,
            status, matched: !!matchedUser, matchedUser,
            userId: matchedUser?.id,
            matchedUserName: matchedUser?.full_name || null,
            departmentId: resolvedDeptId,
            excelDept: group.excelDept,
            matchedCompany: companyMatch.companyName,
            empNo: group.empNo,
          });
        });

        if (parsed.length === 0) {
          toast({ title: 'No valid records', description: 'Could not parse any attendance records from the file', variant: 'destructive' });
          setIsParsing(false);
          return;
        }
        parsed.sort((a, b) => a.name.localeCompare(b.name) || a.date.localeCompare(b.date));
        setUploadPreview(parsed);
        toast({ title: `${parsed.length} daily records parsed from ${jsonData.length.toLocaleString()} events`, description: `${parsed.filter(p => p.matched).length} matched to employees` });

      } else {
        // ── Standard format ──
        const parsed: any[] = [];
        for (const row of jsonData as Record<string, any>[]) {
          const name = String(row[nameCol!] || '').trim();
          const dateVal = row[dateCol!];
          const checkIn = checkInCol ? String(row[checkInCol] || '').trim() : '';
          const checkOut = checkOutCol ? String(row[checkOutCol] || '').trim() : '';
          if (!name || !dateVal) continue;

          const parsedDate = parseDate(dateVal);
          if (!parsedDate) continue;

          const matchedUser = matchUser(name);

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

          const clockIn = parseTime(checkIn, parsedDate);
          const clockOut = parseTime(checkOut, parsedDate);

          let status: AttendanceStatus = 'present';
          if (!clockIn && !clockOut) status = 'absent';
          else if (clockIn && new Date(clockIn).getHours() >= 9) status = 'late';

          parsed.push({
            name, date: format(parsedDate, 'yyyy-MM-dd'), dateDisplay: format(parsedDate, 'dd-MMM-yyyy'),
            clockIn: clockIn ? format(new Date(clockIn), 'HH:mm') : '—',
            clockOut: clockOut ? format(new Date(clockOut), 'HH:mm') : '—',
            clockInRaw: clockIn, clockOutRaw: clockOut, status,
            matched: !!matchedUser, matchedUser, userId: matchedUser?.id,
            departmentId: matchedUser?.department_id || departmentId,
          });
        }

        if (parsed.length === 0) {
          toast({ title: 'No valid records', description: 'Could not parse any attendance records from the file', variant: 'destructive' });
          setIsParsing(false);
          return;
        }
        setUploadPreview(parsed);
        toast({ title: `${parsed.length} records parsed`, description: `${parsed.filter(p => p.matched).length} matched to employees` });
      }
    } catch (err) {
      toast({ title: 'Failed to read file', description: String(err), variant: 'destructive' });
    }
    setIsParsing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [users, departmentId, toast]);

  const handleImport = async () => {
    if (!uploadPreview) return;
    const validRecords = uploadPreview.filter(r => r.matched && r.userId);
    if (validRecords.length === 0) {
      toast({ title: 'No matched records to import', variant: 'destructive' });
      return;
    }
    setIsImporting(true);
    try {
      await bulkImportAttendance.mutateAsync(
        validRecords.map(r => ({
          user_id: r.userId, department_id: r.departmentId, attendance_date: r.date,
          clock_in: r.clockInRaw, clock_out: r.clockOutRaw, status: r.status, notes: 'Imported from Excel',
        }))
      );
      setUploadPreview(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <AttendanceKPICards records={records} users={users} selectedMonth={selectedMonth} />

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
                <p className="text-[10px] text-muted-foreground">Upload Excel from machine</p>
              </div>
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
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-info" />
                  Import Preview — {uploadPreview.length} records
                </CardTitle>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {uploadPreview.filter(r => r.matched).length} matched
                  </span>
                  <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {uploadPreview.filter(r => !r.matched).length} unmatched
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => setUploadPreview(null)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" className="h-8" onClick={handleImport} disabled={isImporting || uploadPreview.filter(r => r.matched).length === 0}>
                  {isImporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  Import {uploadPreview.filter(r => r.matched).length}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted/90">
                    <th className="px-3 py-2.5 text-left font-semibold border-b w-10">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[160px]">Name (Excel)</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[140px]">Matched Employee</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[140px]">Department (Excel)</th>
                    <th className="px-3 py-2.5 text-left font-semibold border-b min-w-[120px]">Matched Company</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[100px]">Date</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[80px]">Check In</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[80px]">Check Out</th>
                    <th className="px-3 py-2.5 text-center font-semibold border-b min-w-[80px]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadPreview.map((row, idx) => (
                    <tr key={idx} className={cn("border-b border-border/40 hover:bg-muted/20", !row.matched && "bg-red-50/30 dark:bg-red-900/10")}>
                      <td className="px-3 py-2.5 text-muted-foreground">{idx + 1}</td>
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
                      <td className="px-3 py-2.5 text-muted-foreground text-[10px]">{row.excelDept || '—'}</td>
                      <td className="px-3 py-2.5">
                        {row.matchedCompany ? (
                          <span className="inline-flex items-center gap-1 text-primary text-[10px] font-medium">
                            <CheckCircle2 className="h-3 w-3" /> {row.matchedCompany}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">{row.dateDisplay}</td>
                      <td className="px-3 py-2.5 text-center font-medium text-emerald-600">{row.clockIn}</td>
                      <td className="px-3 py-2.5 text-center font-medium text-info">{row.clockOut}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="outline" className={cn("text-[10px] border-0",
                          row.status === 'present' && "bg-emerald-500/10 text-emerald-600",
                          row.status === 'late' && "bg-amber-500/10 text-amber-600",
                          row.status === 'absent' && "bg-red-500/10 text-red-600",
                        )}>
                          {ATTENDANCE_STATUS_LABELS[row.status as AttendanceStatus]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Grid */}
      {activeView === 'monthly' ? (
        <MonthlyGrid records={records} selectedMonth={selectedMonth} users={users} departments={departments} searchTerm={searchTerm} filterDepartment={filterDepartment} />
      ) : (
        <AnnualSummary records={records} users={users} departments={departments} searchTerm={searchTerm} filterDepartment={filterDepartment} selectedYear={selectedYear} />
      )}
    </div>
  );
}
