import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CalendarDays, Users, ChevronLeft, ChevronRight, 
  Shield, UserCheck, AlertCircle, CheckSquare, XSquare,
  Download, Globe, Building2, Eye, FileSpreadsheet
} from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { usePositions } from '@/hooks/usePositions';
import { useDepartments } from '@/hooks/useDepartments';
import { useCompanies } from '@/hooks/useCompanies';
import { useWeekendSchedules } from '@/hooks/useWeekendSchedules';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, getWeek } from 'date-fns';
import { toast } from 'sonner';
import { exportWeekendSchedule } from '@/lib/weekendExcelExport';

interface WeekendRotationTabProps {
  departmentId: string;
}

export function WeekendRotationTab({ departmentId }: WeekendRotationTabProps) {
  const { employees } = useEmployees();
  const { positions } = usePositions();
  const { departments } = useDepartments();
  const { companies = [], parentCompanies = [] } = useCompanies();
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [view, setView] = useState<'assign' | 'on-duty' | 'off-duty'>('assign');
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  // All employees grouped by dept (unfiltered) for export preview
  const allEmployeesByDept = useMemo(() => {
    const allActive = employees.filter(e => e.employment_status === 'active');
    const grouped: Record<string, { deptName: string; companyName: string; employees: typeof allActive }> = {};
    allActive.forEach(emp => {
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
    return Object.entries(grouped).sort(([, a], [, b]) => a.deptName.localeCompare(b.deptName));
  }, [employees, departments, companies]);

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

  // Excel export using ExcelJS with color-coded styling
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const allActive = employees.filter(e => e.employment_status === 'active');
      const result = await exportWeekendSchedule({
        employees: allActive,
        departments,
        companies,
        positions,
        isEmployeeOffDuty,
        currentWeek,
      });
      toast.success(`Exported ${result.sheetCount} sheets to Excel`);
      setShowExportPreview(false);
    } catch (err: any) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
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
          <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setShowExportPreview(true)}>
            <Eye className="h-3.5 w-3.5" />
            Preview & Export
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
                                  <TableCell className="text-center w-28" onClick={(e) => e.stopPropagation()}>
                                    <Select
                                      value={isOff ? 'off' : 'on'}
                                      onValueChange={(val) => {
                                        const shouldBeOff = val === 'off';
                                        if (shouldBeOff !== isOff) handleToggle(emp.id);
                                      }}
                                    >
                                      <SelectTrigger className={cn(
                                        "h-7 text-[11px] font-semibold border px-2 rounded-full w-[90px]",
                                        isOff
                                          ? "border-chart-4/40 text-chart-4 bg-chart-4/10 hover:bg-chart-4/20"
                                          : "border-primary/40 text-primary bg-primary/10 hover:bg-primary/20"
                                      )}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="z-50 bg-popover border shadow-lg">
                                        <SelectItem value="on" className="text-xs">
                                          <span className="text-primary font-medium">On Duty</span>
                                        </SelectItem>
                                        <SelectItem value="off" className="text-xs">
                                          <span className="text-chart-4 font-medium">Off Duty</span>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
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

      {/* Export Preview Dialog */}
      <Dialog open={showExportPreview} onOpenChange={setShowExportPreview}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Export Preview — Week {weekNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {format(weekStart, 'MMMM d')} – {format(weekEnd, 'MMMM d, yyyy')} • {allEmployeesByDept.length + 1} sheets will be generated (1 Summary + {allEmployeesByDept.length} departments)
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Summary preview card */}
            <Card className="mb-4 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Summary Sheet</p>
                    <p className="text-[10px] text-muted-foreground">All departments overview with totals</p>
                  </div>
                  <Badge className="ml-auto text-[10px] bg-primary/10 text-primary border-primary/20" variant="outline">Sheet 1</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-background p-2.5 text-center border">
                    <p className="text-lg font-bold text-primary">{employees.filter(e => e.employment_status === 'active' && !isEmployeeOffDuty(e.id)).length}</p>
                    <p className="text-[10px] text-muted-foreground">On Duty</p>
                  </div>
                  <div className="rounded-lg bg-background p-2.5 text-center border">
                    <p className="text-lg font-bold text-chart-4">{employees.filter(e => e.employment_status === 'active' && isEmployeeOffDuty(e.id)).length}</p>
                    <p className="text-[10px] text-muted-foreground">Off Duty</p>
                  </div>
                  <div className="rounded-lg bg-background p-2.5 text-center border">
                    <p className="text-lg font-bold">{employees.filter(e => e.employment_status === 'active').length}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department preview thumbnails */}
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Department Sheets</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allEmployeesByDept.map(([deptId, group], idx) => {
                const on = group.employees.filter(e => !isEmployeeOffDuty(e.id)).length;
                const off = group.employees.filter(e => isEmployeeOffDuty(e.id)).length;
                const total = group.employees.length;
                const onPercent = total > 0 ? Math.round((on / total) * 100) : 0;

                return (
                  <Card key={deptId} className="border hover:border-primary/30 transition-colors group">
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{group.deptName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{group.companyName}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[9px] shrink-0">Sheet {idx + 2}</Badge>
                      </div>

                      {/* Status bar */}
                      <div className="mb-2">
                        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                          {on > 0 && (
                            <div 
                              className="bg-primary rounded-l-full transition-all" 
                              style={{ width: `${onPercent}%` }} 
                            />
                          )}
                          {off > 0 && (
                            <div 
                              className="bg-chart-4 transition-all" 
                              style={{ width: `${100 - onPercent}%` }} 
                            />
                          )}
                        </div>
                      </div>

                      {/* Counts */}
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span className="font-medium text-primary">{on} on duty</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-chart-4" />
                          <span className="font-medium text-chart-4">{off} off duty</span>
                        </div>
                        <span className="text-muted-foreground font-medium">{total} total</span>
                      </div>

                      {/* Mini employee preview */}
                      {total > 0 && (
                        <div className="flex items-center gap-0.5 mt-2.5 -space-x-1">
                          {group.employees.slice(0, 6).map(emp => (
                            <Avatar key={emp.id} className="h-5 w-5 border border-background">
                              <AvatarFallback className={cn(
                                "text-[7px] font-bold",
                                isEmployeeOffDuty(emp.id)
                                  ? "bg-chart-4/20 text-chart-4"
                                  : "bg-primary/15 text-primary"
                              )}>
                                {getInitials(emp.full_name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {total > 6 && (
                            <span className="text-[9px] text-muted-foreground ml-1.5">+{total - 6}</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-row gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowExportPreview(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleExportExcel} disabled={isExporting} className="flex-1 sm:flex-none gap-2">
              <Download className="h-4 w-4" />
              {isExporting ? 'Generating...' : `Export ${allEmployeesByDept.length + 1} Sheets`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
