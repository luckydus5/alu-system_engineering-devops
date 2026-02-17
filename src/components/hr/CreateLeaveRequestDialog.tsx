import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, Loader2, Palmtree, Thermometer, User, Baby, 
  Heart, Clock, Send, CheckCircle2, AlertCircle,
  Users, Search, UserCheck, ArrowRight, ChevronDown
} from 'lucide-react';
import { format, differenceInBusinessDays, addDays, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LeaveType } from '@/hooks/useLeaveRequests';
import { useEmployees, Employee } from '@/hooks/useEmployees';
import { supabase } from '@/integrations/supabase/client';

interface CreateLeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  defaultOnBehalf?: boolean;
}

const LEAVE_TYPE_CONFIG: Record<LeaveType, { icon: React.ElementType; color: string; accent: string; description: string }> = {
  annual: { icon: Palmtree, color: 'text-emerald-600', accent: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40', description: 'Vacation & holiday time' },
  sick: { icon: Thermometer, color: 'text-red-500', accent: 'border-red-400 bg-red-50 dark:bg-red-950/40', description: 'Health-related absence' },
  personal: { icon: User, color: 'text-blue-500', accent: 'border-blue-400 bg-blue-50 dark:bg-blue-950/40', description: 'Personal matters' },
  maternity: { icon: Baby, color: 'text-pink-500', accent: 'border-pink-400 bg-pink-50 dark:bg-pink-950/40', description: 'Maternity leave' },
  paternity: { icon: Baby, color: 'text-indigo-500', accent: 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40', description: 'Paternity leave' },
  bereavement: { icon: Heart, color: 'text-gray-500', accent: 'border-gray-400 bg-gray-50 dark:bg-gray-950/40', description: 'Family bereavement' },
  unpaid: { icon: Clock, color: 'text-amber-500', accent: 'border-amber-400 bg-amber-50 dark:bg-amber-950/40', description: 'Unpaid time off' },
};

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
];

function getGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export function CreateLeaveRequestDialog({ open, onOpenChange, departmentId, defaultOnBehalf = false }: CreateLeaveRequestDialogProps) {
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  
  const [isOnBehalf, setIsOnBehalf] = useState(defaultOnBehalf);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeePicker, setShowEmployeePicker] = useState(defaultOnBehalf);

  const { createRequest } = useLeaveRequests();
  const { employees } = useEmployees();

  // Reset on-behalf when dialog opens
  useEffect(() => {
    if (open) {
      setIsOnBehalf(defaultOnBehalf);
      setShowEmployeePicker(defaultOnBehalf);
    }
  }, [open, defaultOnBehalf]);

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees.slice(0, 20);
    const q = employeeSearch.toLowerCase();
    return employees.filter(e => 
      e.full_name.toLowerCase().includes(q) || 
      e.employee_number.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [employees, employeeSearch]);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return Math.max(1, differenceInBusinessDays(addDays(endDate, 1), startDate));
  }, [startDate, endDate]);

  const handleSubmit = async () => {
    if (!startDate || !endDate || !leaveType) return;
    
    const requestData: any = {
      leave_type: leaveType,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      total_days: totalDays,
      reason: reason || undefined,
      department_id: isOnBehalf && selectedEmployee?.department_id ? selectedEmployee.department_id : departmentId,
    };

    if (isOnBehalf && selectedEmployee) {
      requestData.employee_id = selectedEmployee.linked_user_id || selectedEmployee.id;
      if (selectedEmployee.company_id) {
        requestData.company_id = selectedEmployee.company_id;
      }
    } else {
      // Look up company_id from department
      const { data: dept } = await supabase.from('departments').select('company_id').eq('id', departmentId).single();
      if (dept?.company_id) requestData.company_id = dept.company_id;
    }

    await createRequest.mutateAsync(requestData);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setLeaveType('annual');
    setStartDate(undefined);
    setEndDate(undefined);
    setReason('');
    setIsOnBehalf(defaultOnBehalf);
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setShowEmployeePicker(defaultOnBehalf);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const canSubmit = !!startDate && !!endDate && !!leaveType && (isOnBehalf ? !!selectedEmployee : true);
  const config = LEAVE_TYPE_CONFIG[leaveType];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Clean Header */}
        <div className="px-6 pt-5 pb-4 border-b bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight">
              {isOnBehalf ? 'File Leave for Employee' : 'New Leave Request'}
            </DialogTitle>
          </DialogHeader>

          {/* On-behalf notice banner */}
          {isOnBehalf && (
            <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  This leave request is being filed on behalf of an employee.
                </p>
                <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
                  Select the employee below. To request leave for yourself instead, switch the toggle off.
                </p>
              </div>
            </div>
          )}

          {/* On Behalf Toggle */}
          <div className="flex items-center justify-between mt-3 p-2.5 rounded-lg bg-muted/50 border border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium">
                {isOnBehalf ? 'Filing on behalf of an employee' : 'Filing for myself'}
              </span>
            </div>
            <Switch 
              checked={isOnBehalf} 
              onCheckedChange={(v) => { 
                setIsOnBehalf(v); 
                setShowEmployeePicker(v);
                if (!v) { setSelectedEmployee(null); setEmployeeSearch(''); }
              }} 
            />
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="px-6 py-5 space-y-5">

            {/* Employee Picker */}
            {isOnBehalf && (
              <section className="space-y-2.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Employee
                </Label>

                {selectedEmployee && !showEmployeePicker ? (
                  <button
                    onClick={() => setShowEmployeePicker(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border-2 border-primary/30 bg-primary/5 text-left transition-all hover:border-primary/50"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={cn('text-xs font-bold text-white bg-gradient-to-br', getGradient(selectedEmployee.full_name))}>
                        {selectedEmployee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{selectedEmployee.full_name}</p>
                      <p className="text-[11px] text-muted-foreground">{selectedEmployee.employee_number} • {selectedEmployee.department_name || 'No dept'}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, ID, or email..."
                        value={employeeSearch}
                        onChange={e => setEmployeeSearch(e.target.value)}
                        className="pl-10 h-10"
                        autoFocus={isOnBehalf && !selectedEmployee}
                      />
                    </div>
                    <div className="border rounded-lg overflow-hidden max-h-[160px] overflow-y-auto">
                      {filteredEmployees.map(emp => {
                        const selected = selectedEmployee?.id === emp.id;
                        return (
                          <button
                            key={emp.id}
                            onClick={() => { setSelectedEmployee(emp); setShowEmployeePicker(false); setEmployeeSearch(''); }}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors border-b last:border-b-0',
                              selected ? 'bg-primary/10' : 'hover:bg-muted/60'
                            )}
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={cn('text-[9px] font-bold text-white bg-gradient-to-br', getGradient(emp.full_name))}>
                                {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{emp.full_name}</p>
                              <p className="text-[10px] text-muted-foreground">{emp.employee_number} • {emp.department_name || 'No dept'}</p>
                            </div>
                            {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                      {filteredEmployees.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-6">No employees found</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Leave Type Selection */}
            <section className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Leave Type
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(LEAVE_TYPE_CONFIG) as [LeaveType, typeof config][]).map(([type, cfg]) => {
                  const TypeIcon = cfg.icon;
                  const selected = leaveType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setLeaveType(type)}
                      className={cn(
                        'flex items-center gap-2.5 p-2.5 rounded-lg border-2 text-left transition-all',
                        selected
                          ? `${cfg.accent} border-l-4 shadow-sm`
                          : 'border-transparent bg-muted/40 hover:bg-muted/70'
                      )}
                    >
                      <TypeIcon className={cn('h-4 w-4 shrink-0', selected ? cfg.color : 'text-muted-foreground')} />
                      <div className="min-w-0">
                        <div className={cn('text-sm font-medium truncate', selected ? 'text-foreground' : 'text-muted-foreground')}>{LEAVE_TYPE_LABELS[type]}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* Date Selection */}
            <section className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-10',
                          !startDate && 'text-muted-foreground',
                          startDate && 'border-primary/40 font-medium'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-60" />
                        {startDate ? format(startDate, 'dd MMM yyyy') : 'Start date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => { setStartDate(d); if (d && endDate && d > endDate) setEndDate(undefined); }}
                        disabled={(date) => date < new Date() || isWeekend(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-muted-foreground">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-10',
                          !endDate && 'text-muted-foreground',
                          endDate && 'border-primary/40 font-medium'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-60" />
                        {endDate ? format(endDate, 'dd MMM yyyy') : 'End date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => date < (startDate || new Date()) || isWeekend(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Duration Badge */}
              {totalDays > 0 && (
                <div className={cn('flex items-center justify-between p-3 rounded-lg border-l-4', config.accent)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4 w-4', config.color)} />
                    <span className="text-sm font-medium">{LEAVE_TYPE_LABELS[leaveType]}</span>
                  </div>
                  <Badge variant="secondary" className="text-sm font-bold px-3">
                    {totalDays} day{totalDays > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </section>

            {/* Reason */}
            <section className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason <span className="font-normal normal-case">(optional)</span>
              </Label>
              <Textarea
                placeholder="Brief reason for the leave..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </section>

            {/* Info Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50 border text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <p className="text-[11px] leading-relaxed">
                {isOnBehalf 
                  ? `This will be submitted on behalf of ${selectedEmployee?.full_name || 'the employee'}. Approval workflow: Manager → HR → GM.`
                  : 'Your request will follow the approval workflow: Manager → HR → General Manager.'
                }
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t bg-muted/30 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createRequest.isPending}
            className="gap-2 min-w-[140px]"
          >
            {createRequest.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
