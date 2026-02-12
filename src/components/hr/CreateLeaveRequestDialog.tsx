import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { 
  CalendarIcon, Loader2, Palmtree, Thermometer, User, Baby, 
  Heart, Clock, Send, ArrowRight, CheckCircle2, AlertCircle,
  Users, Search, Building2, UserCheck
} from 'lucide-react';
import { format, differenceInBusinessDays, addDays, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLeaveRequests, LEAVE_TYPE_LABELS, LeaveType } from '@/hooks/useLeaveRequests';
import { useEmployees, Employee } from '@/hooks/useEmployees';

interface CreateLeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  defaultOnBehalf?: boolean;
}

const LEAVE_TYPE_CONFIG: Record<LeaveType, { icon: React.ElementType; color: string; bg: string; description: string }> = {
  annual: { icon: Palmtree, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-800', description: 'Vacation & holiday time' },
  sick: { icon: Thermometer, color: 'text-red-500', bg: 'bg-red-50 border-red-200 hover:border-red-400 dark:bg-red-950/30 dark:border-red-800', description: 'Health-related absence' },
  personal: { icon: User, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200 hover:border-blue-400 dark:bg-blue-950/30 dark:border-blue-800', description: 'Personal matters' },
  maternity: { icon: Baby, color: 'text-pink-500', bg: 'bg-pink-50 border-pink-200 hover:border-pink-400 dark:bg-pink-950/30 dark:border-pink-800', description: 'Maternity leave' },
  paternity: { icon: Baby, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200 hover:border-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-800', description: 'Paternity leave' },
  bereavement: { icon: Heart, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200 hover:border-gray-400 dark:bg-gray-950/30 dark:border-gray-800', description: 'Family bereavement' },
  unpaid: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200 hover:border-amber-400 dark:bg-amber-950/30 dark:border-amber-800', description: 'Unpaid time off' },
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
  const [step, setStep] = useState(1);
  
  // On-behalf-of state
  const [isOnBehalf, setIsOnBehalf] = useState(defaultOnBehalf);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const { createRequest } = useLeaveRequests();
  const { employees } = useEmployees();

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

    // If filing on behalf, attach employee_id
    if (isOnBehalf && selectedEmployee) {
      requestData.employee_id = selectedEmployee.id;
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
    setStep(1);
    setIsOnBehalf(defaultOnBehalf);
    setSelectedEmployee(null);
    setEmployeeSearch('');
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) resetForm();
    onOpenChange(v);
  };

  const canProceedStep1 = isOnBehalf ? !!selectedEmployee && !!leaveType : !!leaveType;
  const canProceedStep2 = !!startDate && !!endDate;
  const config = LEAVE_TYPE_CONFIG[leaveType];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[580px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Leave Request</DialogTitle>
            <p className="text-sm text-muted-foreground">Complete 3 quick steps to submit your request</p>
          </DialogHeader>
          
          {/* On Behalf Toggle */}
          <div className="flex items-center justify-between mt-3 p-3 rounded-xl bg-background/80 border">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filing on behalf of an employee</span>
            </div>
            <Switch checked={isOnBehalf} onCheckedChange={(v) => { setIsOnBehalf(v); if (!v) { setSelectedEmployee(null); setEmployeeSearch(''); }}} />
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => { if (s < step) setStep(s); }}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0',
                    step === s && 'bg-primary text-primary-foreground scale-110 shadow-md',
                    step > s && 'bg-primary/20 text-primary cursor-pointer',
                    step < s && 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                </button>
                {s < 3 && (
                  <div className={cn('h-0.5 flex-1 rounded-full transition-colors', step > s ? 'bg-primary/40' : 'bg-muted')} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground font-medium">
            <span className="w-8 text-center">{isOnBehalf ? 'Who' : 'Type'}</span>
            <span className="text-center">Dates</span>
            <span className="w-8 text-center">Review</span>
          </div>
        </div>

        <div className="px-6 py-5 min-h-[320px]">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              {/* Employee Picker (when on behalf) */}
              {isOnBehalf && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-primary" />
                    Select Employee
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, ID, or email..."
                      value={employeeSearch}
                      onChange={e => setEmployeeSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="h-[140px] border rounded-xl">
                    <div className="p-1 space-y-0.5">
                      {filteredEmployees.map(emp => {
                        const selected = selectedEmployee?.id === emp.id;
                        return (
                          <button
                            key={emp.id}
                            onClick={() => setSelectedEmployee(emp)}
                            className={cn(
                              'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all',
                              selected ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60'
                            )}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className={cn('text-[10px] font-bold text-white bg-gradient-to-br', getGradient(emp.full_name))}>
                                {emp.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{emp.full_name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {emp.employee_number} • {emp.department_name || 'No dept'}
                              </p>
                            </div>
                            {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                          </button>
                        );
                      })}
                      {filteredEmployees.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-6">No employees found</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Label className="text-sm font-semibold">Select Leave Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(LEAVE_TYPE_CONFIG) as [LeaveType, typeof config][]).map(([type, cfg]) => {
                  const TypeIcon = cfg.icon;
                  const selected = leaveType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setLeaveType(type)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                        selected
                          ? `${cfg.bg} ring-2 ring-offset-1 ring-primary/30 scale-[1.02]`
                          : 'border-border hover:border-muted-foreground/30 bg-card'
                      )}
                    >
                      <TypeIcon className={cn('h-5 w-5 shrink-0', cfg.color)} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{LEAVE_TYPE_LABELS[type]}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{cfg.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Dates */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              {/* Show who this is for */}
              {isOnBehalf && selectedEmployee && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={cn('text-xs font-bold text-white bg-gradient-to-br', getGradient(selectedEmployee.full_name))}>
                      {selectedEmployee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{selectedEmployee.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedEmployee.employee_number} • {selectedEmployee.department_name}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-[10px]">On behalf</Badge>
                </div>
              )}

              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('h-5 w-5', config.color)} />
                <span className="text-sm font-semibold">{LEAVE_TYPE_LABELS[leaveType]}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-11 rounded-xl',
                          !startDate && 'text-muted-foreground',
                          startDate && 'border-primary/40 bg-primary/5'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick date'}
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
                  <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-11 rounded-xl',
                          !endDate && 'text-muted-foreground',
                          endDate && 'border-primary/40 bg-primary/5'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick date'}
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

              {totalDays > 0 && (
                <div className={cn('p-4 rounded-xl border-2 flex items-center justify-between', config.bg)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-5 w-5', config.color)} />
                    <span className="text-sm font-medium">Duration</span>
                  </div>
                  <Badge variant="secondary" className="text-base font-bold px-4 py-1">
                    {totalDays} day{totalDays > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Reason (Optional)</Label>
                <Textarea
                  placeholder="Brief reason for the leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Review & Submit
              </div>

              <div className="rounded-xl border-2 border-border overflow-hidden">
                {/* On behalf banner */}
                {isOnBehalf && selectedEmployee && (
                  <div className="px-4 py-3 bg-primary/5 border-b flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={cn('text-[10px] font-bold text-white bg-gradient-to-br', getGradient(selectedEmployee.full_name))}>
                        {selectedEmployee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{selectedEmployee.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedEmployee.employee_number}</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">On behalf</Badge>
                  </div>
                )}

                <div className={cn('p-4 flex items-center gap-3', config.bg)}>
                  <Icon className={cn('h-6 w-6', config.color)} />
                  <div>
                    <div className="font-semibold">{LEAVE_TYPE_LABELS[leaveType]}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </div>
                <div className="p-4 space-y-3 bg-card">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Period</span>
                    <span className="text-sm font-medium">
                      {startDate && format(startDate, 'MMM d')} → {endDate && format(endDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Days</span>
                    <Badge variant="secondary" className="font-bold">{totalDays} business day{totalDays > 1 ? 's' : ''}</Badge>
                  </div>
                  {reason && (
                    <div className="pt-2 border-t">
                      <span className="text-xs text-muted-foreground block mb-1">Reason</span>
                      <p className="text-sm">{reason}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs">
                  {isOnBehalf 
                    ? `This will be submitted on behalf of ${selectedEmployee?.full_name}. The request follows the same approval workflow: Manager → HR → General Manager.`
                    : 'This will be sent to your manager for approval, then forwarded to HR for final review.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => step === 1 ? handleOpenChange(false) : setStep(step - 1)}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="gap-2"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createRequest.isPending}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {createRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit Request
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
