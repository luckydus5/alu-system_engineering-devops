import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { 
  CalendarDays, Users, ChevronLeft, ChevronRight, 
  Shield, UserCheck, AlertCircle, CheckSquare, XSquare,
  Download, Globe, Building2
} from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { useCompanies } from '@/hooks/useCompanies';
import { useWeekendSchedules } from '@/hooks/useWeekendSchedules';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface WeekendRotationTabProps {
  departmentId: string;
}

export function WeekendRotationTab({ departmentId }: WeekendRotationTabProps) {
  const { employees } = useEmployees();
  const { departments } = useDepartments();
  const { companies = [], parentCompanies = [] } = useCompanies();
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [view, setView] = useState<'assign' | 'on-duty' | 'off-duty'>('assign');

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekNumber = getWeek(currentWeek, { weekStartsOn: 1 });

  const { schedules, isLoading, upsertSchedule, bulkUpsert, isEmployeeOffDuty } = useWeekendSchedules(currentWeek);

  // Get departments filtered by company
  const filteredDepartments = useMemo(() => {
    if (filterCompany === 'all') return departments;
    return departments.filter(d => d.company_id === filterCompany);
  }, [departments, filterCompany]);

  // Filter employees by company then department
  const activeEmployees = useMemo(() => {
    let emps = employees.filter(e => e.employment_status === 'active');
    if (filterCompany !== 'all') {
      emps = emps.filter(e => e.company_id === filterCompany);
    }
    if (filterDepartment !== 'all') {
      emps = emps.filter(e => e.department_id === filterDepartment);
    }
    return emps.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [employees, filterCompany, filterDepartment]);

  const offDutyEmployees = useMemo(() => activeEmployees.filter(e => isEmployeeOffDuty(e.id)), [activeEmployees, isEmployeeOffDuty]);
  const onDutyEmployees = useMemo(() => activeEmployees.filter(e => !isEmployeeOffDuty(e.id)), [activeEmployees, isEmployeeOffDuty]);

  // Group employees by department for display
  const employeesByDept = useMemo(() => {
    const grouped: Record<string, { deptName: string; companyName: string; employees: typeof activeEmployees }> = {};
    activeEmployees.forEach(emp => {
      const deptId = emp.department_id || 'unassigned';
      if (!grouped[deptId]) {
        const dept = departments.find(d => d.id === deptId);
        const company = companies.find(c => c.id === emp.company_id);
        grouped[deptId] = {
          deptName: dept?.name || 'Unassigned',
          companyName: company?.name || 'Unknown',
          employees: [],
        };
      }
      grouped[deptId].employees.push(emp);
    });
    return grouped;
  }, [activeEmployees, departments, companies]);

  const handleToggle = (employeeId: string) => {
    if (!user) return;
    const current = isEmployeeOffDuty(employeeId);
    upsertSchedule.mutate({ employeeId, isOffDuty: !current, assignedBy: user.id });
  };

  const handleSelectAll = () => {
    if (!user) return;
    const unselected = activeEmployees.filter(e => !isEmployeeOffDuty(e.id));
    if (unselected.length === 0) return;
    bulkUpsert.mutate({ employeeIds: unselected.map(e => e.id), isOffDuty: true, assignedBy: user.id });
  };

  const handleDeselectAll = () => {
    if (!user) return;
    const selected = activeEmployees.filter(e => isEmployeeOffDuty(e.id));
    if (selected.length === 0) return;
    bulkUpsert.mutate({ employeeIds: selected.map(e => e.id), isOffDuty: false, assignedBy: user.id });
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return 'Unassigned';
    return departments.find(d => d.id === deptId)?.name || 'Unassigned';
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return 'Unknown';
    return companies.find(c => c.id === companyId)?.name || 'Unknown';
  };

  // Reset department filter when company changes
  const handleCompanyChange = (value: string) => {
    setFilterCompany(value);
    setFilterDepartment('all');
  };

  // Excel export with per-department sheets — professional layout
  const handleExportExcel = () => {
    const allActive = employees.filter(e => e.employment_status === 'active');
    const wb = XLSX.utils.book_new();

    // Group all employees by department
    const deptGroups: Record<string, { deptName: string; companyName: string; emps: typeof allActive }> = {};
    
    allActive.forEach(emp => {
      const deptId = emp.department_id || 'unassigned';
      if (!deptGroups[deptId]) {
        const dept = departments.find(d => d.id === deptId);
        const company = companies.find(c => c.id === emp.company_id);
        deptGroups[deptId] = {
          deptName: dept?.name || 'Unassigned',
          companyName: company?.name || 'Unknown',
          emps: [],
        };
      }
      deptGroups[deptId].emps.push(emp);
    });

    const dateRange = `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'MMMM d, yyyy')}`;
    const generatedDate = format(new Date(), 'dd/MM/yyyy HH:mm');

    // ── SUMMARY SHEET ──
    const summaryRows: any[][] = [
      ['HQ POWER MANAGEMENT SYSTEMS'],
      ['WEEKEND DUTY SCHEDULE — SUMMARY REPORT'],
      [],
      [`Week:`, `Week ${weekNumber}`],
      [`Period:`, dateRange],
      [`Generated:`, generatedDate],
      [],
      [],
      ['#', 'DEPARTMENT', 'COMPANY', 'ON DUTY', 'OFF DUTY', 'TOTAL STAFF'],
    ];

    let globalIdx = 0;
    const sortedDepts = Object.entries(deptGroups).sort(([, a], [, b]) => a.deptName.localeCompare(b.deptName));
    let totalOnAll = 0;
    let totalOffAll = 0;

    sortedDepts.forEach(([, group]) => {
      globalIdx++;
      const onDuty = group.emps.filter(e => !isEmployeeOffDuty(e.id)).length;
      const offDuty = group.emps.filter(e => isEmployeeOffDuty(e.id)).length;
      totalOnAll += onDuty;
      totalOffAll += offDuty;
      summaryRows.push([globalIdx, group.deptName, group.companyName, onDuty, offDuty, group.emps.length]);
    });

    summaryRows.push([]);
    summaryRows.push(['', 'TOTAL', '', totalOnAll, totalOffAll, allActive.length]);
    summaryRows.push([]);
    summaryRows.push([]);
    summaryRows.push(['Prepared by: _______________________', '', '', 'Approved by: _______________________']);

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
    // Merge title rows
    summaryWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // ── PER-DEPARTMENT SHEETS ──
    sortedDepts.forEach(([, group]) => {
      const sortedEmps = [...group.emps].sort((a, b) => a.full_name.localeCompare(b.full_name));
      const onDutyList = sortedEmps.filter(e => !isEmployeeOffDuty(e.id));
      const offDutyList = sortedEmps.filter(e => isEmployeeOffDuty(e.id));

      const rows: any[][] = [
        ['HQ POWER MANAGEMENT SYSTEMS'],
        [`WEEKEND DUTY SCHEDULE — ${group.deptName.toUpperCase()}`],
        [],
        ['Company:', group.companyName],
        ['Week:', `Week ${weekNumber} — ${dateRange}`],
        ['Generated:', generatedDate],
        [],
      ];

      // ON DUTY section
      rows.push([]);
      rows.push(['ON DUTY EMPLOYEES']);
      rows.push(['#', 'EMP NO.', 'FULL NAME', 'STATUS']);

      if (onDutyList.length > 0) {
        onDutyList.forEach((emp, idx) => {
          rows.push([idx + 1, emp.employee_number, emp.full_name, 'ON DUTY']);
        });
      } else {
        rows.push(['', '', 'No employees on duty', '']);
      }

      rows.push([]);
      rows.push([`Total On Duty: ${onDutyList.length}`]);

      // OFF DUTY section
      rows.push([]);
      rows.push([]);
      rows.push(['OFF DUTY EMPLOYEES (WEEKEND OFF)']);
      rows.push(['#', 'EMP NO.', 'FULL NAME', 'STATUS']);

      if (offDutyList.length > 0) {
        offDutyList.forEach((emp, idx) => {
          rows.push([idx + 1, emp.employee_number, emp.full_name, 'OFF DUTY']);
        });
      } else {
        rows.push(['', '', 'No employees off duty', '']);
      }

      rows.push([]);
      rows.push([`Total Off Duty: ${offDutyList.length}`]);

      // Footer summary
      rows.push([]);
      rows.push([]);
      rows.push(['SUMMARY']);
      rows.push(['On Duty:', onDutyList.length, 'Off Duty:', offDutyList.length]);
      rows.push(['Total Staff:', group.emps.length]);
      rows.push([]);
      rows.push([]);
      rows.push(['Prepared by: _______________________', '', 'Approved by: _______________________']);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 35 }, { wch: 14 }];
      // Merge title rows
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      ];

      const sheetName = group.deptName.replace(/[\\\/\?\*\[\]:]/g, '').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const filename = `Weekend_Schedule_Week${weekNumber}_${format(weekStart, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${sortedDepts.length + 1} sheets to ${filename}`);
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">On Duty</p>
                <p className="text-2xl font-bold mt-1">{onDutyEmployees.length}</p>
              </div>
              <div className="p-2 rounded-xl bg-primary/20">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-chart-4/10 to-chart-4/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Off Duty</p>
                <p className="text-2xl font-bold mt-1">{offDutyEmployees.length}</p>
              </div>
              <div className="p-2 rounded-xl bg-chart-4/20">
                <CalendarDays className="h-4 w-4 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-success/10 to-success/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Week {weekNumber}</p>
                <p className="text-sm font-semibold mt-1">{format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}</p>
              </div>
              <div className="p-2 rounded-xl bg-success/20">
                <Shield className="h-4 w-4 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-warning/10 to-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold mt-1">{activeEmployees.length}</p>
              </div>
              <div className="p-2 rounded-xl bg-warning/20">
                <Users className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col gap-3">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
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
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleExportExcel}>
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filterCompany} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {parentCompanies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                {companies.filter(c => c.parent_id).map(c => (
                  <SelectItem key={c.id} value={c.id}>↳ {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {filteredDepartments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabbed Views */}
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="assign" className="text-xs gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Assign
          </TabsTrigger>
          <TabsTrigger value="on-duty" className="text-xs gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            On Duty ({onDutyEmployees.length})
          </TabsTrigger>
          <TabsTrigger value="off-duty" className="text-xs gap-1.5">
            <XSquare className="h-3.5 w-3.5" />
            Off Duty ({offDutyEmployees.length})
          </TabsTrigger>
        </TabsList>

        {/* Assign Tab - Grouped by department */}
        <TabsContent value="assign">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Weekend Schedule Assignment</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleSelectAll}>
                  Select All Off
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleDeselectAll}>
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {Object.keys(employeesByDept).length === 0 ? (
                <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">No active employees found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  {Object.entries(employeesByDept).map(([deptId, group]) => {
                    const deptOnDuty = group.employees.filter(e => !isEmployeeOffDuty(e.id)).length;
                    const deptOffDuty = group.employees.filter(e => isEmployeeOffDuty(e.id)).length;
                    return (
                      <div key={deptId}>
                        {/* Department header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-muted/70 border-y">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-wide">{group.deptName}</span>
                            <span className="text-[10px] text-muted-foreground">• {group.companyName}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-primary font-medium">{deptOnDuty} on</span>
                            <span className="text-chart-4 font-medium">{deptOffDuty} off</span>
                            <Badge variant="secondary" className="text-[10px] h-5">{group.employees.length}</Badge>
                          </div>
                        </div>
                        <Table>
                          <TableBody>
                            {group.employees.sort((a, b) => a.full_name.localeCompare(b.full_name)).map((emp, idx) => {
                              const isOff = isEmployeeOffDuty(emp.id);
                              return (
                                <TableRow
                                  key={emp.id}
                                  className={cn(
                                    "cursor-pointer transition-colors",
                                    isOff ? "bg-chart-4/5" : "hover:bg-muted/30"
                                  )}
                                  onClick={() => handleToggle(emp.id)}
                                >
                                  <TableCell className="w-10 text-center text-xs text-muted-foreground font-mono">
                                    {idx + 1}
                                  </TableCell>
                                  <TableCell className="w-10 text-center">
                                    <Checkbox
                                      checked={isOff}
                                      onCheckedChange={() => handleToggle(emp.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="mx-auto"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2.5">
                                      <Avatar className="h-7 w-7">
                                        <AvatarFallback className={cn(
                                          "text-[10px] font-semibold",
                                          isOff ? "bg-chart-4/20 text-chart-4" : "bg-primary/15 text-primary"
                                        )}>
                                          {getInitials(emp.full_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm font-medium">{emp.full_name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground font-mono">
                                    {emp.employee_number}
                                  </TableCell>
                                  <TableCell className="text-center w-24">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[10px] px-2",
                                        isOff
                                          ? "border-chart-4/30 text-chart-4 bg-chart-4/10"
                                          : "border-primary/30 text-primary bg-primary/10"
                                      )}
                                    >
                                      {isOff ? 'Off Duty' : 'On Duty'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* On Duty Tab */}
        <TabsContent value="on-duty">
          <EmployeeStatusList
            employees={onDutyEmployees}
            status="on-duty"
            getDeptName={getDeptName}
            getCompanyName={getCompanyName}
            getInitials={getInitials}
          />
        </TabsContent>

        {/* Off Duty Tab */}
        <TabsContent value="off-duty">
          <EmployeeStatusList
            employees={offDutyEmployees}
            status="off-duty"
            getDeptName={getDeptName}
            getCompanyName={getCompanyName}
            getInitials={getInitials}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmployeeStatusList({ 
  employees, 
  status, 
  getDeptName,
  getCompanyName,
  getInitials 
}: { 
  employees: any[];
  status: 'on-duty' | 'off-duty';
  getDeptName: (id: string | null) => string;
  getCompanyName: (id: string | null) => string;
  getInitials: (name: string) => string;
}) {
  const isOnDuty = status === 'on-duty';
  const title = isOnDuty ? 'On Duty – Working This Weekend' : 'Off Duty – Weekend Off';
  const emptyMsg = isOnDuty ? 'No employees on duty this weekend' : 'No employees off duty this weekend';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isOnDuty ? <UserCheck className="h-4 w-4 text-primary" /> : <XSquare className="h-4 w-4 text-chart-4" />}
          {title}
          <Badge variant="secondary" className="ml-auto text-xs">{employees.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm">{emptyMsg}</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {employees.map(emp => (
              <div
                key={emp.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                  isOnDuty ? "bg-primary/5 border-primary/20" : "bg-chart-4/5 border-chart-4/20"
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={cn(
                    "text-xs font-semibold",
                    isOnDuty ? "bg-primary/20 text-primary" : "bg-chart-4/20 text-chart-4"
                  )}>
                    {getInitials(emp.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{emp.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{getDeptName(emp.department_id)} • {getCompanyName(emp.company_id)}</p>
                </div>
                <Badge variant="outline" className={cn(
                  "text-[10px] px-2 shrink-0",
                  isOnDuty ? "border-primary/30 text-primary bg-primary/10" : "border-chart-4/30 text-chart-4 bg-chart-4/10"
                )}>
                  {isOnDuty ? 'On Duty' : 'Off Duty'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
