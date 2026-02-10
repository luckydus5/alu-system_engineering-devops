import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Loader2, FileText, User, UserCheck, Building2, Award, Printer } from 'lucide-react';
import { format, differenceInBusinessDays, addDays } from 'date-fns';
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

type LeaveTypeOption = 'annual' | 'maternity_paternity' | 'sick' | 'compassionate' | 'study' | 'other';

const LEAVE_TYPE_OPTIONS: { value: LeaveTypeOption; label: string; dbValue: LeaveType }[] = [
  { value: 'annual', label: 'Annual leave', dbValue: 'annual' },
  { value: 'maternity_paternity', label: 'Maternity/Paternity leave', dbValue: 'maternity' },
  { value: 'sick', label: 'Sick leave', dbValue: 'sick' },
  { value: 'compassionate', label: 'Compassionate leave', dbValue: 'bereavement' },
  { value: 'study', label: 'Study leave', dbValue: 'personal' },
  { value: 'other', label: 'Other leave/specify', dbValue: 'unpaid' },
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
  
  // Section 1: Employee Details
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    firstName: '',
    surname: '',
    position: '',
    contactPhone: '',
    department: '',
  });
  const [lastDateOfWork, setLastDateOfWork] = useState<Date | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [employeeSignatureDate, setEmployeeSignatureDate] = useState<Date | undefined>(new Date());
  const [reason, setReason] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  // Section 2: Supervisor/HOD Analysis
  const [supervisorApproved, setSupervisorApproved] = useState<boolean | null>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [replacement, setReplacement] = useState('');
  const [supervisorSignatureDate, setSupervisorSignatureDate] = useState<Date | undefined>();
  
  // Section 3: HR Analysis
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveTypeOption>('annual');
  const [otherLeaveSpecify, setOtherLeaveSpecify] = useState('');
  const [periodOfLeave, setPeriodOfLeave] = useState('');
  const [totalAccruedLeaveDays, setTotalAccruedLeaveDays] = useState<number>(0);
  const [totalWorkingDaysOff, setTotalWorkingDaysOff] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const [hrSignatureDate, setHrSignatureDate] = useState<Date | undefined>();
  
  // Section 4: Top Manager Approval
  const [topManagerApproved, setTopManagerApproved] = useState<boolean | null>(null);
  const [topManagerRefusalReason, setTopManagerRefusalReason] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerSignatureDate, setManagerSignatureDate] = useState<Date | undefined>();

  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Load department info from user_roles
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

  // Calculate working days
  useEffect(() => {
    if (lastDateOfWork && returnDate) {
      const days = Math.max(1, differenceInBusinessDays(returnDate, lastDateOfWork));
      setTotalWorkingDaysOff(days);
      setPeriodOfLeave(`${format(lastDateOfWork, 'MMM d, yyyy')} - ${format(returnDate, 'MMM d, yyyy')}`);
    }
  }, [lastDateOfWork, returnDate]);

  // Calculate leave balance
  useEffect(() => {
    const leaveTypeMap: Record<LeaveTypeOption, LeaveType> = {
      annual: 'annual',
      maternity_paternity: 'maternity',
      sick: 'sick',
      compassionate: 'bereavement',
      study: 'personal',
      other: 'unpaid',
    };
    
    const dbLeaveType = leaveTypeMap[selectedLeaveType];
    const leaveBalance = balances.find(b => b.leave_type === dbLeaveType);
    
    if (leaveBalance) {
      setTotalAccruedLeaveDays(leaveBalance.total_days);
      setBalance(leaveBalance.total_days - leaveBalance.used_days - totalWorkingDaysOff);
    } else {
      setTotalAccruedLeaveDays(21); // Default annual leave days
      setBalance(21 - totalWorkingDaysOff);
    }
  }, [selectedLeaveType, balances, totalWorkingDaysOff]);

  const handleSubmit = async () => {
    if (!lastDateOfWork || !returnDate) return;
    
    setIsSubmitting(true);
    try {
      const leaveTypeMap: Record<LeaveTypeOption, LeaveType> = {
        annual: 'annual',
        maternity_paternity: 'maternity',
        sick: 'sick',
        compassionate: 'bereavement',
        study: 'personal',
        other: 'unpaid',
      };

      await createRequest.mutateAsync({
        leave_type: leaveTypeMap[selectedLeaveType],
        start_date: format(lastDateOfWork, 'yyyy-MM-dd'),
        end_date: format(returnDate, 'yyyy-MM-dd'),
        total_days: totalWorkingDaysOff,
        reason: reason || (isUrgent ? 'URGENT: ' + reason : undefined),
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
    setOtherLeaveSpecify('');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  YUMN Leave Application Form
                </DialogTitle>
                <p className="text-blue-100 text-sm mt-0.5">
                  Complete all sections of this form
                </p>
              </div>
            </div>
            {mode !== 'create' && (
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Section 1: Employee's Details */}
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="pb-3 bg-blue-50/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    1
                  </div>
                  <User className="h-4 w-4 text-blue-600" />
                  Employee's Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">First Name</Label>
                    <Input 
                      value={employeeInfo.firstName}
                      onChange={(e) => setEmployeeInfo(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="First name"
                      disabled={mode !== 'create'}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Surname</Label>
                    <Input 
                      value={employeeInfo.surname}
                      onChange={(e) => setEmployeeInfo(prev => ({ ...prev, surname: e.target.value }))}
                      placeholder="Surname"
                      disabled={mode !== 'create'}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Position</Label>
                    <Input 
                      value={employeeInfo.position}
                      onChange={(e) => setEmployeeInfo(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Position"
                      disabled={mode !== 'create'}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Contact Phone Number</Label>
                    <Input 
                      value={employeeInfo.contactPhone}
                      onChange={(e) => setEmployeeInfo(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="Phone number"
                      disabled={mode !== 'create'}
                      className="bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Last Date of Work</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={mode !== 'create'}
                          className={cn(
                            'w-full justify-start text-left font-normal bg-white',
                            !lastDateOfWork && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {lastDateOfWork ? format(lastDateOfWork, 'MMM d, yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={lastDateOfWork}
                          onSelect={setLastDateOfWork}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Return Date to Work</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={mode !== 'create'}
                          className={cn(
                            'w-full justify-start text-left font-normal bg-white',
                            !returnDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {returnDate ? format(returnDate, 'MMM d, yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={returnDate}
                          onSelect={setReturnDate}
                          disabled={(date) => date < (lastDateOfWork || new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Urgent Notice */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> Each Staff should request annual leave <strong>two weeks before</strong> the start date of his or her leave unless it is urgent. If it is urgent, kindly mention the reason.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Reason for Leave {isUrgent && <Badge variant="destructive" className="ml-2 text-xs">Urgent</Badge>}
                  </Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please provide a reason for your leave request..."
                    rows={3}
                    disabled={mode !== 'create'}
                    className="bg-white"
                  />
                  <div className="flex items-center gap-2 mt-2">
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

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Signature of Employee: <span className="font-medium text-foreground">{employeeInfo.firstName} {employeeInfo.surname}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Date: <span className="font-medium text-foreground">{employeeSignatureDate ? format(employeeSignatureDate, 'MMM d, yyyy') : '___/___/___'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Supervisor/HOD Analysis */}
            <Card className={cn(
              "border-green-200 shadow-sm",
              mode === 'create' && "opacity-60"
            )}>
              <CardHeader className="pb-3 bg-green-50/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold text-sm">
                    2
                  </div>
                  <UserCheck className="h-4 w-4 text-green-600" />
                  Supervisor or Head of Department Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Analysis about the request of leave from the employee's department
                </p>

                <div className="space-y-3">
                  <Label className="text-xs font-medium">Leave approval from Department:</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="dept-yes" 
                        checked={supervisorApproved === true}
                        onCheckedChange={() => setSupervisorApproved(true)}
                        disabled={mode === 'create'}
                      />
                      <Label htmlFor="dept-yes" className="text-sm cursor-pointer">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="dept-no" 
                        checked={supervisorApproved === false}
                        onCheckedChange={() => setSupervisorApproved(false)}
                        disabled={mode === 'create'}
                      />
                      <Label htmlFor="dept-no" className="text-sm cursor-pointer">No</Label>
                    </div>
                  </div>
                </div>

                {supervisorApproved === false && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">If No, reason for refusal:</Label>
                    <Textarea
                      value={refusalReason}
                      onChange={(e) => setRefusalReason(e.target.value)}
                      placeholder="Please provide a reason for refusal..."
                      rows={2}
                      disabled={mode === 'create'}
                      className="bg-white"
                    />
                  </div>
                )}

                {supervisorApproved === true && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">If Yes, replacement in his or her absence:</Label>
                    <Input
                      value={replacement}
                      onChange={(e) => setReplacement(e.target.value)}
                      placeholder="Name of replacement employee"
                      disabled={mode === 'create'}
                      className="bg-white"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Signature of Manager: <span className="font-medium text-foreground">_______________</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Date: <span className="font-medium text-foreground">{supervisorSignatureDate ? format(supervisorSignatureDate, 'MMM d, yyyy') : '___/___/___'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: HR Department Analysis */}
            <Card className={cn(
              "border-purple-200 shadow-sm",
              mode === 'create' && "opacity-60"
            )}>
              <CardHeader className="pb-3 bg-purple-50/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    3
                  </div>
                  <Building2 className="h-4 w-4 text-purple-600" />
                  HR Department Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Analysis for the type of leave and notification for leave days
                </p>

                {/* Leave Type Selection */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium">Type of Leave:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {LEAVE_TYPE_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center gap-2">
                        <Checkbox 
                          id={`leave-${option.value}`}
                          checked={selectedLeaveType === option.value}
                          onCheckedChange={() => setSelectedLeaveType(option.value)}
                          disabled={mode !== 'create'}
                        />
                        <Label htmlFor={`leave-${option.value}`} className="text-sm cursor-pointer">
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {selectedLeaveType === 'other' && (
                    <Input
                      value={otherLeaveSpecify}
                      onChange={(e) => setOtherLeaveSpecify(e.target.value)}
                      placeholder="Please specify..."
                      className="mt-2 bg-white"
                      disabled={mode !== 'create'}
                    />
                  )}
                </div>

                {/* Leave Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Period of Leave</Label>
                    <p className="text-sm font-semibold">{periodOfLeave || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Total Accrued Leave Days</Label>
                    <p className="text-sm font-semibold">{totalAccruedLeaveDays} days</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Total Working Days Off</Label>
                    <p className="text-sm font-semibold">{totalWorkingDaysOff} days</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Balance</Label>
                    <p className={cn(
                      "text-sm font-bold",
                      balance >= 0 ? "text-emerald-600" : "text-red-600"
                    )}>
                      {balance} days
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Signature of HR: <span className="font-medium text-foreground">_______________</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Date: <span className="font-medium text-foreground">{hrSignatureDate ? format(hrSignatureDate, 'MMM d, yyyy') : '___/___/___'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Top Manager Approval */}
            <Card className={cn(
              "border-orange-200 shadow-sm",
              mode === 'create' && "opacity-60"
            )}>
              <CardHeader className="pb-3 bg-orange-50/50">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    4
                  </div>
                  <Award className="h-4 w-4 text-orange-600" />
                  Approval of Leave (Top Managers)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="top-approved" 
                      checked={topManagerApproved === true}
                      onCheckedChange={() => setTopManagerApproved(true)}
                      disabled={mode === 'create'}
                    />
                    <Label htmlFor="top-approved" className="text-sm cursor-pointer font-medium">Approved</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="top-rejected" 
                      checked={topManagerApproved === false}
                      onCheckedChange={() => setTopManagerApproved(false)}
                      disabled={mode === 'create'}
                    />
                    <Label htmlFor="top-rejected" className="text-sm cursor-pointer font-medium">Not Approved</Label>
                  </div>
                </div>

                {topManagerApproved === false && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Reason for refusal (if applicable):</Label>
                    <Textarea
                      value={topManagerRefusalReason}
                      onChange={(e) => setTopManagerRefusalReason(e.target.value)}
                      placeholder="Please provide a reason for refusal..."
                      rows={2}
                      disabled={mode === 'create'}
                      className="bg-white"
                    />
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">NAME OF MANAGER</Label>
                    <Input
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="Manager's full name"
                      disabled={mode === 'create'}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={mode === 'create'}
                          className={cn(
                            'w-full justify-start text-left font-normal bg-white',
                            !managerSignatureDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {managerSignatureDate ? format(managerSignatureDate, 'MMM d, yyyy') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={managerSignatureDate}
                          onSelect={setManagerSignatureDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Signature of Manager: <span className="font-medium text-foreground">_______________</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {mode === 'create' && (
            <Button
              onClick={handleSubmit}
              disabled={!lastDateOfWork || !returnDate || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
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
