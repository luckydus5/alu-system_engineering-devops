import { useState, useMemo, useRef, useCallback } from 'react';
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
  Table2, LayoutGrid, Upload, FileSpreadsheet, X, Loader2
} from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, 
  getDay, getDaysInMonth, addMonths, subMonths, getYear, getMonth,
  isWeekend, isSaturday, isSunday, parse
} from 'date-fns';
import { useAttendance, useMyAttendance, ATTENDANCE_STATUS_LABELS, AttendanceStatus } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
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
      const matchesDept = filterDepartment === 'all' || u.department_id === filterDepartment;
      return matchesSearch && matchesDept;
    });

    // Group by department
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
      const matchesDept = filterDepartment === 'all' || u.department_id === filterDepartment;
      return matchesSearch && matchesDept;
    });
  }, [users, searchTerm, filterDepartment]);

  // Group by department
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredUsers.forEach(u => {
      const deptName = departments.find(d => d.id === u.department_id)?.name || 'Unassigned';
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
  const [activeView, setActiveView] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedYear] = useState(new Date().getFullYear());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { departments } = useDepartments();
  const { users } = useUsers();
  const { records, isLoading, refetch, bulkImportAttendance } = useAttendance(
    filterDepartment === 'all' ? undefined : filterDepartment
  );

  // Parse Excel file
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      
      if (jsonData.length === 0) {
        toast({ title: 'Empty file', description: 'The Excel file has no data rows', variant: 'destructive' });
        return;
      }

      // Parse rows - expected columns: Name/Employee, Date, Check In, Check Out (flexible matching)
      const parsed: any[] = [];
      const headers = Object.keys(jsonData[0] as object).map(h => h.toLowerCase().trim());
      
      // Find column indices by flexible matching
      const nameCol = Object.keys(jsonData[0] as object).find(h => 
        /name|employee|staff|person/i.test(h));
      const dateCol = Object.keys(jsonData[0] as object).find(h => 
        /date|day|attendance/i.test(h));
      const checkInCol = Object.keys(jsonData[0] as object).find(h => 
        /check.?in|clock.?in|in.?time|arrival|start/i.test(h));
      const checkOutCol = Object.keys(jsonData[0] as object).find(h => 
        /check.?out|clock.?out|out.?time|departure|end|leave/i.test(h));

      if (!nameCol || !dateCol) {
        toast({ 
          title: 'Invalid format', 
          description: 'Excel must have columns for Name/Employee and Date. Found: ' + Object.keys(jsonData[0] as object).join(', '), 
          variant: 'destructive' 
        });
        return;
      }

      for (const row of jsonData as Record<string, any>[]) {
        const name = String(row[nameCol!] || '').trim();
        const dateVal = row[dateCol!];
        const checkIn = checkInCol ? String(row[checkInCol] || '').trim() : '';
        const checkOut = checkOutCol ? String(row[checkOutCol] || '').trim() : '';

        if (!name || !dateVal) continue;

        // Parse date (handle Excel serial numbers and various formats)
        let parsedDate: Date | null = null;
        if (typeof dateVal === 'number') {
          // Excel serial date
          parsedDate = new Date((dateVal - 25569) * 86400 * 1000);
        } else {
          const dateStr = String(dateVal).trim();
          // Try common formats
          for (const fmt of ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd-MM-yyyy', 'dd-MMM-yyyy']) {
            try {
              parsedDate = parse(dateStr, fmt, new Date());
              if (!isNaN(parsedDate.getTime())) break;
              parsedDate = null;
            } catch { parsedDate = null; }
          }
          if (!parsedDate) {
            parsedDate = new Date(dateStr);
            if (isNaN(parsedDate.getTime())) parsedDate = null;
          }
        }

        if (!parsedDate) continue;

        // Match user by name
        const matchedUser = users.find(u => 
          u.full_name?.toLowerCase() === name.toLowerCase() ||
          u.full_name?.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(u.full_name?.toLowerCase() || '___')
        );

        // Parse time strings
        const parseTime = (timeStr: string, dateBase: Date): string | null => {
          if (!timeStr || timeStr === '-' || timeStr === '--:--') return null;
          // Handle Excel decimal time (e.g., 0.354166...)
          if (!isNaN(Number(timeStr)) && Number(timeStr) < 1) {
            const totalMinutes = Math.round(Number(timeStr) * 24 * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const d = new Date(dateBase);
            d.setHours(hours, minutes, 0, 0);
            return d.toISOString();
          }
          // Handle HH:mm or H:mm format
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

        // Determine status
        let status: AttendanceStatus = 'present';
        if (!clockIn && !clockOut) {
          status = isSunday(parsedDate) || isSaturday(parsedDate) ? 'absent' : 'absent';
        } else if (clockIn) {
          const inHour = new Date(clockIn).getHours();
          if (inHour >= 9) status = 'late';
        }

        parsed.push({
          name,
          date: format(parsedDate, 'yyyy-MM-dd'),
          dateDisplay: format(parsedDate, 'dd-MMM-yyyy'),
          clockIn: clockIn ? format(new Date(clockIn), 'HH:mm') : '—',
          clockOut: clockOut ? format(new Date(clockOut), 'HH:mm') : '—',
          clockInRaw: clockIn,
          clockOutRaw: clockOut,
          status,
          matched: !!matchedUser,
          matchedUser,
          userId: matchedUser?.id,
          departmentId: matchedUser?.department_id || departmentId,
        });
      }

      if (parsed.length === 0) {
        toast({ title: 'No valid records', description: 'Could not parse any attendance records from the file', variant: 'destructive' });
        return;
      }

      setUploadPreview(parsed);
      toast({ title: `${parsed.length} records parsed`, description: `${parsed.filter(p => p.matched).length} matched to employees` });
    } catch (err) {
      toast({ title: 'Failed to read file', description: String(err), variant: 'destructive' });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [users, departmentId, toast]);

  // Import parsed records
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
          user_id: r.userId,
          department_id: r.departmentId,
          attendance_date: r.date,
          clock_in: r.clockInRaw,
          clock_out: r.clockOutRaw,
          status: r.status,
          notes: 'Imported from Excel',
        }))
      );
      setUploadPreview(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Excel Section */}
      <Card className="bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <FileSpreadsheet className="h-8 w-8" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Attendance Machine Data</p>
                <h2 className="text-2xl font-bold">Upload Excel File</h2>
                <p className="text-white/60 text-xs mt-1">
                  Columns: Name/Employee, Date, Check In, Check Out
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button size="lg" className="bg-white text-blue-600 hover:bg-white/90"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-5 w-5 mr-2" /> Upload Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Preview */}
      {uploadPreview && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  Import Preview — {uploadPreview.length} records
                </CardTitle>
                <CardDescription>
                  <span className="text-emerald-600 font-medium">{uploadPreview.filter(r => r.matched).length} matched</span>
                  {' · '}
                  <span className="text-red-600 font-medium">{uploadPreview.filter(r => !r.matched).length} unmatched</span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setUploadPreview(null)}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleImport} disabled={isImporting || uploadPreview.filter(r => r.matched).length === 0}>
                  {isImporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Import {uploadPreview.filter(r => r.matched).length} Records
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[400px]">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="px-3 py-2 text-left font-semibold">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Name (Excel)</th>
                    <th className="px-3 py-2 text-left font-semibold">Matched Employee</th>
                    <th className="px-3 py-2 text-center font-semibold">Date</th>
                    <th className="px-3 py-2 text-center font-semibold">Check In</th>
                    <th className="px-3 py-2 text-center font-semibold">Check Out</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadPreview.map((row, idx) => (
                    <tr key={idx} className={cn(
                      "border-b hover:bg-muted/30",
                      !row.matched && "bg-red-50/50 dark:bg-red-900/10"
                    )}>
                      <td className="px-3 py-1.5 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-medium">{row.name}</td>
                      <td className="px-3 py-1.5">
                        {row.matched ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" />
                            {row.matchedUser?.full_name}
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600 text-[10px]">
                            <AlertCircle className="h-3 w-3 mr-0.5" />
                            Not Found
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">{row.dateDisplay}</td>
                      <td className="px-3 py-1.5 text-center font-medium text-emerald-600">{row.clockIn}</td>
                      <td className="px-3 py-1.5 text-center font-medium text-blue-600">{row.clockOut}</td>
                      <td className="px-3 py-1.5 text-center">
                        <Badge className={cn(
                          "text-[10px]",
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
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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
