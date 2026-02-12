import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, FileText, User, Printer, Palmtree, Thermometer, Baby, Heart, Clock, BookOpen } from 'lucide-react';
import { format, differenceInBusinessDays, addDays, isWeekend } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLeaveRequests, LeaveType, LEAVE_TYPE_LABELS, useLeaveBalances } from '@/hooks/useLeaveRequests';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LeaveApplicationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  existingRequest?: {
    id: string;
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason: string | null;
    status: string;
    requester?: {
      full_name: string | null;
      email: string;
    };
  } | null;
  mode?: 'create' | 'view' | 'approve';
}

interface EmployeeInfo {
  firstName: string;
  surname: string;
  position: string;
  contactPhone: string;
  department: string;
}

const LEAVE_TYPE_CONFIG: { value: LeaveType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'annual', label: 'Annual Leave', icon: Palmtree, color: 'text-emerald-600' },
  { value: 'sick', label: 'Sick Leave', icon: Thermometer, color: 'text-red-500' },
  { value: 'personal', label: 'Personal Leave', icon: User, color: 'text-blue-500' },
  { value: 'maternity', label: 'Maternity Leave', icon: Baby, color: 'text-pink-500' },
  { value: 'paternity', label: 'Paternity Leave', icon: Baby, color: 'text-indigo-500' },
  { value: 'bereavement', label: 'Compassionate Leave', icon: Heart, color: 'text-gray-500' },
  { value: 'unpaid', label: 'Unpaid Leave', icon: Clock, color: 'text-amber-500' },
];

export function LeaveApplicationForm({ 
  open, 
  onOpenChange, 
  departmentId, 
  existingRequest,
  mode = 'create' 
}: LeaveApplicationFormProps) {
  const { user } = useAuth();
  const { createRequest } = useLeaveRequests();
  const { balances } = useLeaveBalances();
  
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    firstName: '',
    surname: '',
    position: '',
    contactPhone: '',
    department: '',
  });
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType>('annual');
  const [lastDateOfWork, setLastDateOfWork] = useState<Date | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate working days
  const totalDays = useMemo(() => {
    if (!lastDateOfWork || !returnDate) return 0;
    return Math.max(1, differenceInBusinessDays(addDays(returnDate, 1), lastDateOfWork));
  }, [lastDateOfWork, returnDate]);

  // Get leave balance for selected type
  const leaveBalance = useMemo(() => {
    const bal = balances.find(b => b.leave_type === selectedLeaveType);
    if (bal) {
      return {
        total: bal.total_days,
        used: bal.used_days,
        remaining: bal.total_days - bal.used_days,
      };
    }
    return { total: 21, used: 0, remaining: 21 };
  }, [balances, selectedLeaveType]);

  // Load current user info
  useEffect(() => {
    async function loadUserInfo() {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const nameParts = (profile.full_name || '').split(' ');
        setEmployeeInfo({
          firstName: nameParts[0] || '',
          surname: nameParts.slice(1).join(' ') || '',
          position: '',
          contactPhone: profile.phone || '',
          department: '',
        });
      }

      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role, department:departments(name)')
        .eq('user_id', user.id)
        .single();
      
      if (userRole) {
        setEmployeeInfo(prev => ({
          ...prev,
          department: (userRole.department as { name: string } | null)?.name || '',
          position: userRole.role || '',
        }));
      }
    }
    
    if (open && mode === 'create') {
      loadUserInfo();
    }
  }, [open, user, mode]);

  const handleSubmit = async () => {
    if (!lastDateOfWork || !returnDate) return;
    
    setIsSubmitting(true);
    try {
      await createRequest.mutateAsync({
        leave_type: selectedLeaveType,
        start_date: format(lastDateOfWork, 'yyyy-MM-dd'),
        end_date: format(returnDate, 'yyyy-MM-dd'),
        total_days: totalDays,
        reason: isUrgent ? `URGENT: ${reason}` : reason || undefined,
        department_id: departmentId,
      });

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to submit leave request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setLastDateOfWork(undefined);
    setReturnDate(undefined);
    setReason('');
    setIsUrgent(false);
    setSelectedLeaveType('annual');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary to-primary/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white">
                  Leave Application
                </DialogTitle>
                <p className="text-white/70 text-xs mt-0.5">
                  Fill in the details to submit your request
                </p>
              </div>
            </div>
            {mode !== 'create' && (
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <div className="p-5 space-y-5">
            {/* Employee Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">Employee Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">First Name</Label>
                  <Input 
                    value={employeeInfo.firstName}
                    onChange={(e) => setEmployeeInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                    disabled={mode !== 'create'}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Surname</Label>
                  <Input 
                    value={employeeInfo.surname}
                    onChange={(e) => setEmployeeInfo(prev => ({ ...prev, surname: e.target.value }))}
                    placeholder="Surname"
                    disabled={mode !== 'create'}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Input 
                    value={employeeInfo.department}
                    disabled
                    className="h-9 text-sm bg-muted/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Position</Label>
                  <Input 
                    value={employeeInfo.position}
                    disabled
                    className="h-9 text-sm bg-muted/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Phone Number</Label>
                <Input 
                  value={employeeInfo.contactPhone}
                  onChange={(e) => setEmployeeInfo(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="Phone number"
                  disabled={mode !== 'create'}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Leave Type */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Palmtree className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold">Leave Type</h3>
              </div>

              <Select value={selectedLeaveType} onValueChange={(v) => setSelectedLeaveType(v as LeaveType)} disabled={mode !== 'create'}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPE_CONFIG.map(lt => (
                    <SelectItem key={lt.value} value={lt.value}>
                      <span className="flex items-center gap-2">
                        <lt.icon className={cn('h-4 w-4', lt.color)} />
                        {lt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Leave Balance Info */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Total</p>
                  <p className="text-sm font-bold">{leaveBalance.total}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Used</p>
                  <p className="text-sm font-bold">{leaveBalance.used}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/50 text-center">
                  <p className="text-[10px] text-muted-foreground font-medium">Remaining</p>
                  <p className={cn("text-sm font-bold", leaveBalance.remaining > 0 ? "text-emerald-600" : "text-destructive")}>
                    {leaveBalance.remaining}
                  </p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold">Leave Period</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={mode !== 'create'}
                        className={cn(
                          'w-full justify-start text-left font-normal h-9 text-sm',
                          !lastDateOfWork && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {lastDateOfWork ? format(lastDateOfWork, 'MMM d, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={lastDateOfWork}
                        onSelect={(d) => { setLastDateOfWork(d); if (d && returnDate && d > returnDate) setReturnDate(undefined); }}
                        disabled={(date) => date < new Date() || isWeekend(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={mode !== 'create'}
                        className={cn(
                          'w-full justify-start text-left font-normal h-9 text-sm',
                          !returnDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {returnDate ? format(returnDate, 'MMM d, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={returnDate}
                        onSelect={setReturnDate}
                        disabled={(date) => date < (lastDateOfWork || new Date()) || isWeekend(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {totalDays > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm font-medium">Working days requested</span>
                  <Badge variant="secondary" className="text-sm font-bold px-3">
                    {totalDays} day{totalDays > 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>

            {/* Urgent Notice */}
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Leave should be requested at least <strong>two weeks</strong> before the start date unless urgent.
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Reason for Leave
                {isUrgent && <Badge variant="destructive" className="ml-2 text-[10px] py-0">Urgent</Badge>}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide a reason for your leave request..."
                rows={3}
                disabled={mode !== 'create'}
                className="text-sm resize-none"
              />
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="urgent" 
                  checked={isUrgent}
                  onCheckedChange={(checked) => setIsUrgent(checked as boolean)}
                  disabled={mode !== 'create'}
                />
                <Label htmlFor="urgent" className="text-xs cursor-pointer">
                  This is an urgent request (less than 2 weeks notice)
                </Label>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-muted/30 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === 'create' && (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!lastDateOfWork || !returnDate || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Leave Request
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
