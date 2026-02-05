import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, LogIn, LogOut, Users, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAttendance, useMyAttendance, ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, AttendanceStatus } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartments';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceTabProps {
  departmentId: string;
}

export function AttendanceTab({ departmentId }: AttendanceTabProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const { departments } = useDepartments();
  const { records, isLoading, refetch, clockIn, clockOut } = useAttendance(
    filterDepartment === 'all' ? undefined : filterDepartment,
    selectedDate
  );
  const { todayRecord, isLoading: todayLoading } = useMyAttendance();

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const canClockIn = isToday && !todayRecord?.clock_in;
  const canClockOut = isToday && todayRecord?.clock_in && !todayRecord?.clock_out;

  const handleClockIn = async () => {
    await clockIn.mutateAsync(departmentId);
  };

  const handleClockOut = async () => {
    await clockOut.mutateAsync();
  };

  const formatTime = (timestamp: string | null) => {
    if (!timestamp) return '-';
    return format(new Date(timestamp), 'h:mm a');
  };

  const calculateHours = (clockInTime: string | null, clockOutTime: string | null) => {
    if (!clockInTime || !clockOutTime) return '-';
    const inTime = new Date(clockInTime);
    const outTime = new Date(clockOutTime);
    const hours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
    return `${hours.toFixed(1)}h`;
  };

  return (
    <div className="space-y-4">
      {/* Clock In/Out Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Status</p>
                {todayLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : todayRecord ? (
                  <div className="flex items-center gap-2">
                    <Badge className={ATTENDANCE_STATUS_COLORS[todayRecord.status]}>
                      {ATTENDANCE_STATUS_LABELS[todayRecord.status]}
                    </Badge>
                    <span className="text-sm">
                      {formatTime(todayRecord.clock_in)} - {formatTime(todayRecord.clock_out)}
                    </span>
                  </div>
                ) : (
                  <p className="font-medium">Not clocked in</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {canClockIn && (
                <Button onClick={handleClockIn} disabled={clockIn.isPending}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              )}
              {canClockOut && (
                <Button onClick={handleClockOut} disabled={clockOut.isPending} variant="secondary">
                  <LogOut className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              )}
              {todayRecord?.clock_out && (
                <p className="text-sm text-muted-foreground flex items-center">
                  Total: {calculateHours(todayRecord.clock_in, todayRecord.clock_out)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Records
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'MMM d, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Records List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance records for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map(record => (
                  <div
                    key={record.id}
                    className="p-4 rounded-lg border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {record.user?.full_name || record.user?.email || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {record.department?.name || 'No Department'}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted-foreground">In: </span>
                        <span className="font-medium">{formatTime(record.clock_in)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Out: </span>
                        <span className="font-medium">{formatTime(record.clock_out)}</span>
                      </div>
                      <Badge className={ATTENDANCE_STATUS_COLORS[record.status]}>
                        {ATTENDANCE_STATUS_LABELS[record.status]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
