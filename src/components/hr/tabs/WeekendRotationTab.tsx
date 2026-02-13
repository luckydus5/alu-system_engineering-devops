import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CalendarDays, Users, ChevronLeft, ChevronRight, Sun, Moon,
  Shield, RefreshCw, UserCheck, Clock, AlertCircle
} from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, isWeekend, getWeek } from 'date-fns';

interface WeekendRotationTabProps {
  departmentId: string;
}

interface DutyAssignment {
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  shift: 'day' | 'night';
  role: 'primary' | 'backup';
}

export function WeekendRotationTab({ departmentId }: WeekendRotationTabProps) {
  const { employees } = useEmployees();
  const { departments } = useDepartments();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentWeek, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekendDays = daysInWeek.filter(d => isWeekend(d));

  // Filter employees by department
  const filteredEmployees = useMemo(() => {
    if (filterDepartment === 'all') return employees;
    return employees.filter(e => e.department_id === filterDepartment);
  }, [employees, filterDepartment]);

  // Generate rotation assignments based on employee index and week number
  const rotationAssignments = useMemo(() => {
    const assignments: DutyAssignment[] = [];
    const activeEmployees = filteredEmployees.filter(e => e.employment_status === 'active');
    
    if (activeEmployees.length === 0) return assignments;

    weekendDays.forEach((day, dayIdx) => {
      // Rotate primary and backup based on week number
      const primaryIdx = (weekNumber + dayIdx) % activeEmployees.length;
      const backupIdx = (weekNumber + dayIdx + 1) % activeEmployees.length;

      const primary = activeEmployees[primaryIdx];
      const backup = activeEmployees[backupIdx];

      if (primary) {
        assignments.push({
          employeeId: primary.id,
          employeeName: primary.full_name,
          department: primary.department_name || 'Unassigned',
          date: day,
          shift: 'day',
          role: 'primary',
        });
      }
      if (backup) {
        assignments.push({
          employeeId: backup.id,
          employeeName: backup.full_name,
          department: backup.department_name || 'Unassigned',
          date: day,
          shift: 'day',
          role: 'backup',
        });
      }
    });

    return assignments;
  }, [filteredEmployees, weekendDays, weekNumber]);

  const onDutyToday = rotationAssignments.filter(
    a => isSameDay(a.date, new Date()) && a.role === 'primary'
  );

  const totalOnDutyThisWeekend = rotationAssignments.filter(a => a.role === 'primary').length;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">On Duty Today</p>
                <p className="text-2xl font-bold mt-1">{onDutyToday.length}</p>
                <p className="text-xs text-muted-foreground">primary assigned</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/20">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-chart-4/10 to-chart-4/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Weekend Slots</p>
                <p className="text-2xl font-bold mt-1">{totalOnDutyThisWeekend}</p>
                <p className="text-xs text-muted-foreground">this weekend</p>
              </div>
              <div className="p-2.5 rounded-xl bg-chart-4/20">
                <CalendarDays className="h-4 w-4 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Rotation Cycle</p>
                <p className="text-2xl font-bold mt-1">Week {weekNumber}</p>
                <p className="text-xs text-muted-foreground">auto-rotating</p>
              </div>
              <div className="p-2.5 rounded-xl bg-success/20">
                <RefreshCw className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold mt-1">{filteredEmployees.filter(e => e.employment_status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">in rotation pool</p>
              </div>
              <div className="p-2.5 rounded-xl bg-warning/20">
                <Users className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-muted">
            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCurrentWeek(new Date())}>
            Today
          </Button>
        </div>

        <Select value={filterDepartment} onValueChange={setFilterDepartment}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Weekend Schedule Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {weekendDays.map(day => {
          const dayAssignments = rotationAssignments.filter(a => isSameDay(a.date, day));
          const isToday = isSameDay(day, new Date());

          return (
            <Card key={day.toISOString()} className={cn(
              "overflow-hidden transition-all",
              isToday && "ring-2 ring-primary/50 shadow-premium"
            )}>
              <CardHeader className={cn(
                "pb-3 pt-4",
                isToday ? "bg-primary/5" : "bg-muted/30"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      isToday ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <span className="text-lg font-bold">{format(day, 'd')}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{format(day, 'EEEE')}</CardTitle>
                      <p className="text-xs text-muted-foreground">{format(day, 'MMMM d, yyyy')}</p>
                    </div>
                  </div>
                  {isToday && (
                    <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">
                      Today
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {dayAssignments.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-sm">No employees in rotation pool</p>
                  </div>
                ) : (
                  dayAssignments.map((assignment, idx) => (
                    <div
                      key={`${assignment.employeeId}-${idx}`}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                        assignment.role === 'primary'
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-border"
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={cn(
                          "text-xs font-semibold",
                          assignment.role === 'primary'
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {getInitials(assignment.employeeName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{assignment.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{assignment.department}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "text-[10px] px-2",
                          assignment.role === 'primary'
                            ? "border-primary/30 text-primary bg-primary/10"
                            : "border-muted-foreground/30 text-muted-foreground"
                        )}>
                          <Shield className="h-3 w-3 mr-1" />
                          {assignment.role === 'primary' ? 'Primary' : 'Backup'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-2">
                          <Sun className="h-3 w-3 mr-1" />
                          Day
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rotation Calendar Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Upcoming Rotation Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Week</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Saturday Primary</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Sunday Primary</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Period</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3].map(offset => {
                  const futureWeek = addWeeks(currentWeek, offset);
                  const fwStart = startOfWeek(futureWeek, { weekStartsOn: 1 });
                  const fwEnd = endOfWeek(futureWeek, { weekStartsOn: 1 });
                  const fwNum = getWeek(futureWeek, { weekStartsOn: 1 });
                  const fwWeekendDays = eachDayOfInterval({ start: fwStart, end: fwEnd }).filter(isWeekend);
                  const activeEmps = filteredEmployees.filter(e => e.employment_status === 'active');

                  return (
                    <tr key={offset} className={cn(
                      "border-b last:border-0",
                      offset === 0 && "bg-primary/5 font-medium"
                    )}>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span>Week {fwNum}</span>
                          {offset === 0 && (
                            <Badge className="bg-primary/15 text-primary border-0 text-[10px]">Current</Badge>
                          )}
                        </div>
                      </td>
                      {fwWeekendDays.map((day, dayIdx) => {
                        const idx = (fwNum + dayIdx) % (activeEmps.length || 1);
                        const emp = activeEmps[idx];
                        return (
                          <td key={dayIdx} className="py-2.5 pr-4">
                            {emp ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {getInitials(emp.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs">{emp.full_name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-2.5 text-xs text-muted-foreground">
                        {format(fwStart, 'MMM d')} – {format(fwEnd, 'MMM d')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
