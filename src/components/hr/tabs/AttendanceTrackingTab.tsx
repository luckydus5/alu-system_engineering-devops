import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Clock, LogIn, LogOut, Users, CalendarIcon, RefreshCw,
  Timer, TrendingUp, AlertCircle, CheckCircle2, Coffee,
  ChevronLeft, ChevronRight, BarChart3, Zap
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, addWeeks } from 'date-fns';
import { useAttendance, useMyAttendance, ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, AttendanceStatus } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
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

function TimelineBar({ record }: { record: any }) {
  if (!record.clock_in) return null;
  
  const startHour = 8; // 8 AM
  const endHour = 18; // 6 PM
  const totalHours = endHour - startHour;
  
  const clockIn = new Date(record.clock_in);
  const clockOut = record.clock_out ? new Date(record.clock_out) : new Date();
  
  const startOffset = Math.max(0, (clockIn.getHours() + clockIn.getMinutes() / 60 - startHour) / totalHours * 100);
  const duration = Math.min(100 - startOffset, ((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60)) / totalHours * 100);
  
  return (
    <div className="relative h-6 bg-muted rounded-full overflow-hidden">
      {/* Time markers */}
      <div className="absolute inset-0 flex justify-between px-2 items-center">
        <span className="text-[10px] text-muted-foreground">8AM</span>
        <span className="text-[10px] text-muted-foreground">12PM</span>
        <span className="text-[10px] text-muted-foreground">6PM</span>
      </div>
      {/* Work duration bar */}
      <div 
        className={cn(
          "absolute h-full rounded-full",
          record.status === 'late' ? 'bg-amber-500' : 'bg-emerald-500'
        )}
        style={{ left: `${startOffset}%`, width: `${duration}%` }}
      />
    </div>
  );
}

function WeeklyOverview({ records, selectedWeek, onWeekChange }: {
  records: any[];
  selectedWeek: Date;
  onWeekChange: (date: Date) => void;
}) {
  const weekStart = startOfWeek(selectedWeek);
  const weekEnd = endOfWeek(selectedWeek);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getRecordsForDay = (day: Date) => {
    return records.filter(r => isSameDay(new Date(r.date), day));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Weekly Overview</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => onWeekChange(subWeeks(selectedWeek, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[200px] text-center">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={() => onWeekChange(addWeeks(selectedWeek, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => {
            const dayRecords = getRecordsForDay(day);
            const isToday = isSameDay(day, new Date());
            const presentCount = dayRecords.filter(r => r.status === 'present' || r.status === 'late').length;
            
            return (
              <div 
                key={day.toISOString()}
                className={cn(
                  "p-3 rounded-xl text-center transition-all",
                  isToday ? "bg-primary/10 border-2 border-primary" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                <p className={cn("text-lg font-bold", isToday && "text-primary")}>{format(day, 'd')}</p>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {presentCount} present
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function AttendanceTrackingTab({ departmentId }: AttendanceTrackingTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const { departments } = useDepartments();
  const { records, isLoading, refetch, clockIn, clockOut } = useAttendance(
    filterDepartment === 'all' ? undefined : filterDepartment,
    selectedDate
  );
  const { todayRecord } = useMyAttendance();

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '--:--';
    return format(new Date(timestamp), 'h:mm a');
  };

  const calculateHours = (clockInTime: string | null, clockOutTime: string | null) => {
    if (!clockInTime || !clockOutTime) return '0.0';
    const inTime = new Date(clockInTime);
    const outTime = new Date(clockOutTime);
    const hours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  const stats = useMemo(() => {
    const present = records.filter(r => r.status === 'present').length;
    const late = records.filter(r => r.status === 'late').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const onLeave = records.filter(r => r.status === 'on_leave').length;
    const total = present + late + absent + onLeave;
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    
    return { present, late, absent, onLeave, total, attendanceRate };
  }, [records]);

  const isToday = isSameDay(selectedDate, new Date());
  const canClockIn = isToday && !todayRecord?.clock_in;
  const canClockOut = isToday && todayRecord?.clock_in && !todayRecord?.clock_out;

  return (
    <div className="space-y-6">
      {/* My Attendance Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-violet-600 text-white border-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
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
                  ) : (
                    'Not clocked in'
                  )}
                </h2>
                {todayRecord && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn("bg-white/20 text-white border-0", todayRecord.status === 'late' && "bg-amber-500/30")}>
                      {ATTENDANCE_STATUS_LABELS[todayRecord.status]}
                    </Badge>
                    {todayRecord.clock_out && (
                      <span className="text-white/80 text-sm">
                        Total: {calculateHours(todayRecord.clock_in, todayRecord.clock_out)}h
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              {canClockIn && (
                <Button 
                  size="lg" 
                  className="bg-white text-blue-600 hover:bg-white/90"
                  onClick={() => clockIn.mutateAsync(departmentId)}
                  disabled={clockIn.isPending}
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Clock In
                </Button>
              )}
              {canClockOut && (
                <Button 
                  size="lg" 
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  variant="outline"
                  onClick={() => clockOut.mutateAsync()}
                  disabled={clockOut.isPending}
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Clock Out
                </Button>
              )}
              {todayRecord?.clock_out && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Day Complete</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Present</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.present}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Late</p>
                <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Absent</p>
                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold text-violet-600">{stats.onLeave}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Coffee className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold text-blue-600">{stats.attendanceRate}%</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <WeeklyOverview 
        records={records}
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
      />

      {/* Attendance Records */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Attendance Records</CardTitle>
            <CardDescription>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {format(selectedDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-lg font-medium">No attendance records</p>
              <p className="text-sm text-muted-foreground">No records found for the selected date</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {records.map(record => {
                  const statusConfig = STATUS_CONFIG[record.status as AttendanceStatus];
                  const initials = record.user?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?';
                  
                  return (
                    <div 
                      key={record.id}
                      className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{record.user?.full_name || 'Unknown'}</p>
                          <div className={cn("h-2 w-2 rounded-full", statusConfig.dotColor)} />
                          <Badge className={cn("text-xs", statusConfig.bgColor, statusConfig.color)}>
                            {ATTENDANCE_STATUS_LABELS[record.status as AttendanceStatus]}
                          </Badge>
                        </div>
                        <TimelineBar record={record} />
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatTime(record.clock_in)} - {formatTime(record.clock_out)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {record.clock_in && record.clock_out 
                            ? `${calculateHours(record.clock_in, record.clock_out)} hours`
                            : 'In progress'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
