import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, Users, Mail, Phone, Building2,
  Briefcase, UserPlus, Calendar, Clock, Award,
  ChevronRight, Shield, Grid3X3, List, Download,
  Eye, Edit, Trash2, MapPin, Heart, User,
  MoreHorizontal, X, Check, Loader2, Hash,
  UserCheck, UserX, Zap
} from 'lucide-react';
import { useEmployees, Employee, EmployeeInsert } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { usePositions } from '@/hooks/usePositions';
import { useCompanies } from '@/hooks/useCompanies';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface EmployeeHubTabProps {
  departmentId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof UserCheck }> = {
  active: { label: 'Active', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30', icon: UserCheck },
  inactive: { label: 'Inactive', color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30', icon: UserX },
  on_leave: { label: 'On Leave', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30', icon: Clock },
  terminated: { label: 'Terminated', color: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30', icon: X },
  probation: { label: 'Probation', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30', icon: Zap },
};

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  intern: 'Intern',
  temporary: 'Temporary',
};

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-indigo-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
  'from-teal-500 to-cyan-600',
];

function getGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─────────── Add Employee Dialog ───────────
function AddEmployeeDialog({ open, onClose, departments, positions, companies, onAdd }: {
  open: boolean;
  onClose: () => void;
  departments: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  companies: Array<{ id: string; name: string; parent_id: string | null }>;
  onAdd: (emp: EmployeeInsert) => Promise<{ error: Error | null }>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeInsert>({
    full_name: '',
    email: '',
    phone: '',
    department_id: null,
    position_id: null,
    company_id: null,
    hire_date: format(new Date(), 'yyyy-MM-dd'),
    employment_type: 'full_time',
    gender: null,
    date_of_birth: null,
    address: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    notes: null,
  });

  const update = (key: keyof EmployeeInsert, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await onAdd(form);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to add employee', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Employee added successfully!' });
      onClose();
      setForm({ full_name: '', email: '', phone: '', department_id: null, position_id: null, company_id: null, hire_date: format(new Date(), 'yyyy-MM-dd'), employment_type: 'full_time', gender: null, date_of_birth: null, address: null, emergency_contact_name: null, emergency_contact_phone: null, notes: null });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            Add New Employee
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Personal Info */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="h-4 w-4" /> Personal Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender || ''} onValueChange={v => update('gender', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email || ''} onChange={e => update('email', e.target.value)} placeholder="john@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone || ''} onChange={e => update('phone', e.target.value)} placeholder="+1 234 567 890" />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth || ''} onChange={e => update('date_of_birth', e.target.value || null)} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input value={form.address || ''} onChange={e => update('address', e.target.value || null)} placeholder="123 Main St, City" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Employment Info */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Employment Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Select value={form.company_id || ''} onValueChange={v => update('company_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.filter(c => !c.parent_id).map(c => (
                      <SelectItem key={c.id} value={c.id}>🏢 {c.name}</SelectItem>
                    ))}
                    {companies.filter(c => c.parent_id).map(c => (
                      <SelectItem key={c.id} value={c.id}>└ {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={form.department_id || ''} onValueChange={v => update('department_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Select value={form.position_id || ''} onValueChange={v => update('position_id', v || null)}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hire Date</Label>
                <Input type="date" value={form.hire_date || ''} onChange={e => update('hire_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={form.employment_type || 'full_time'} onValueChange={v => update('employment_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Emergency Contact */}
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Heart className="h-4 w-4" /> Emergency Contact
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={form.emergency_contact_name || ''} onChange={e => update('emergency_contact_name', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={form.emergency_contact_phone || ''} onChange={e => update('emergency_contact_phone', e.target.value || null)} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes || ''} onChange={e => update('notes', e.target.value || null)} placeholder="Any additional notes..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────── Employee Profile Dialog ───────────
function getCompanyPrefix(companyName?: string | null): string {
  if (!companyName) return 'ID';
  // Use first 2 characters of the company name (e.g., "HQ Power" → "HQ", "Farmers" → "FA")
  return companyName.substring(0, 2).toUpperCase();
}

function formatFingerprintDisplay(fingerprintNumber: string | null, companyName?: string | null, employeeNumber?: string): string {
  if (!fingerprintNumber) return employeeNumber || '—';
  const prefix = getCompanyPrefix(companyName);
  return `${prefix}-${fingerprintNumber}`;
}

function EmployeeProfileDialog({ employee, open, onClose }: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!employee) return null;
  const initials = getInitials(employee.full_name);
  const gradient = getGradient(employee.full_name);
  const status = STATUS_CONFIG[employee.employment_status] || STATUS_CONFIG.active;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Hero header */}
        <div className="relative h-32 bg-gradient-to-br from-primary/80 to-primary">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJWMGgydjM0em0tNCAwVjBoLTJ2MzRoMnptLTQgMFYwaC0ydjM0aDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        </div>
        
        <div className="px-6 -mt-16 relative z-10">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-xl">
              <AvatarFallback className={cn("text-2xl font-bold text-white bg-gradient-to-br", gradient)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="pb-2 flex-1">
              <h2 className="text-2xl font-bold">{employee.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
               <Badge variant="outline" className="font-mono text-xs">
                  <Hash className="h-3 w-3 mr-1" />
                  {formatFingerprintDisplay(employee.fingerprint_number, employee.company_name, employee.employee_number)}
                </Badge>
                <Badge variant="outline" className={cn("text-xs border", status.color)}>
                  {status.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {employee.email && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">{employee.email}</p>
                </div>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Phone className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{employee.phone}</p>
                </div>
              </div>
            )}
            {employee.department_name && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">{employee.department_name}</p>
                </div>
              </div>
            )}
            {employee.position_name && (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="text-sm font-medium">{employee.position_name}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                <Calendar className="h-4 w-4 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hire Date</p>
                <p className="text-sm font-medium">{format(new Date(employee.hire_date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employment Type</p>
                <p className="text-sm font-medium">{TYPE_LABELS[employee.employment_type] || employee.employment_type}</p>
              </div>
            </div>
          </div>

          {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Emergency Contact</h4>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <Heart className="h-4 w-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{employee.emergency_contact_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{employee.emergency_contact_phone || '—'}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {employee.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{employee.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────── Edit Employee Dialog ───────────
function EditEmployeeDialog({ employee, open, onClose, departments, positions, companies, onUpdate }: {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  departments: Array<{ id: string; name: string }>;
  positions: Array<{ id: string; name: string }>;
  companies: Array<{ id: string; name: string; parent_id: string | null }>;
  onUpdate: (id: string, updates: Partial<EmployeeInsert>) => Promise<{ error: Error | null }>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    department_id: '' as string | null,
    position_id: '' as string | null,
    company_id: '' as string | null,
    employment_status: 'active',
    employment_type: 'full_time',
    email: '',
    phone: '',
    fingerprint_number: '',
  });

  // Sync form when employee changes
  useEffect(() => {
    if (employee) {
      setForm({
        full_name: employee.full_name,
        department_id: employee.department_id || '',
        position_id: employee.position_id || '',
        company_id: employee.company_id || '',
        employment_status: employee.employment_status,
        employment_type: employee.employment_type,
        email: employee.email || '',
        phone: employee.phone || '',
        fingerprint_number: employee.fingerprint_number || '',
      });
    }
  }, [employee]);

  if (!employee) return null;

  const handleSave = async () => {
    setSaving(true);
    const updates: any = {
      full_name: form.full_name,
      department_id: form.department_id || null,
      position_id: form.position_id || null,
      company_id: form.company_id || null,
      employment_status: form.employment_status,
      employment_type: form.employment_type,
      email: form.email || undefined,
      phone: form.phone || undefined,
      fingerprint_number: form.fingerprint_number || null,
    };
    const { error } = await onUpdate(employee.id, updates);
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to update', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Employee updated successfully!' });
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Edit className="h-5 w-5 text-primary" />
            </div>
            Edit Employee
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Fingerprint No.</Label>
              <Input value={form.fingerprint_number} onChange={e => setForm(f => ({ ...f, fingerprint_number: e.target.value }))} placeholder="e.g. 43, 99, 102" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={form.company_id || ''} onValueChange={v => setForm(f => ({ ...f, company_id: v || null }))}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.filter(c => !c.parent_id).map(c => (
                  <SelectItem key={c.id} value={c.id}>🏢 {c.name}</SelectItem>
                ))}
                {companies.filter(c => c.parent_id).map(c => (
                  <SelectItem key={c.id} value={c.id}>└ {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={form.department_id || ''} onValueChange={v => setForm(f => ({ ...f, department_id: v || null }))}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={form.position_id || ''} onValueChange={v => setForm(f => ({ ...f, position_id: v || null }))}>
              <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
              <SelectContent>
                {positions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.employment_status} onValueChange={v => setForm(f => ({ ...f, employment_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.employment_type} onValueChange={v => setForm(f => ({ ...f, employment_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────── Main Component ───────────
export function EmployeeHubTab({ departmentId }: EmployeeHubTabProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { departments } = useDepartments();
  const { activePositions } = usePositions();
  const { companies } = useCompanies();

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch =
        emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.fingerprint_number && emp.fingerprint_number.includes(searchTerm)) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === 'all' || emp.company_id === companyFilter;
      const matchesDept = departmentFilter === 'all' || emp.department_id === departmentFilter;
      const matchesStatus = statusFilter === 'all' || emp.employment_status === statusFilter;
      return matchesSearch && matchesCompany && matchesDept && matchesStatus;
    });
  }, [employees, searchTerm, companyFilter, departmentFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => e.employment_status === 'active').length,
    onLeave: employees.filter(e => e.employment_status === 'on_leave').length,
    newThisMonth: employees.filter(e => {
      const d = new Date(e.hire_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  }), [employees]);

  const handleView = (emp: Employee) => {
    setSelectedEmployee(emp);
    setProfileOpen(true);
  };

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Remove ${emp.full_name} from employee records?`)) return;
    const { error } = await deleteEmployee(emp.id);
    if (error) toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    else toast({ title: 'Employee removed' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Employees', value: stats.total, icon: Users, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10' },
          { label: 'Active', value: stats.active, icon: UserCheck, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-500/10' },
          { label: 'On Leave', value: stats.onLeave, icon: Clock, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10' },
          { label: 'New This Month', value: stats.newThisMonth, icon: Zap, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-500/10' },
        ].map(({ label, value, icon: Icon, gradient, bg }) => (
          <Card key={label} className="relative overflow-hidden border-0 shadow-sm">
            <div className={cn("absolute top-0 left-0 w-1 h-full bg-gradient-to-b", gradient)} />
            <CardContent className="p-5 pl-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center", bg)}>
                  <Icon className={cn("h-5 w-5 bg-gradient-to-br bg-clip-text", gradient)} style={{ color: `var(--tw-gradient-from)` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters Bar ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, email..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full sm:w-[170px] bg-muted/50 border-0">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[150px] bg-muted/50 border-0">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] bg-muted/50 border-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-0.5 bg-muted/50">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3" onClick={() => setViewMode('grid')}>
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 px-3" onClick={() => setViewMode('list')}>
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm" onClick={() => setAddDialogOpen(true)} className="shadow-sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Count ── */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of{' '}
          <span className="font-semibold text-foreground">{employees.length}</span> employees
        </p>
      </div>

      {/* ── Grid View ── */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
            <h3 className="text-lg font-semibold">No Employees Found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {employees.length === 0 ? 'Start by adding your first employee' : 'Try adjusting your filters'}
            </p>
            {employees.length === 0 && (
              <Button onClick={() => setAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Add First Employee
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(emp => {
            const initials = getInitials(emp.full_name);
            const gradient = getGradient(emp.full_name);
            const status = STATUS_CONFIG[emp.employment_status] || STATUS_CONFIG.active;

            return (
              <Card
                key={emp.id}
                className="group hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden border-0 shadow-sm"
                onClick={() => handleView(emp)}
              >
                {/* Top accent */}
                <div className={cn("h-1 bg-gradient-to-r", `${gradient}`)} />
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-background shadow">
                      <AvatarFallback className={cn("text-sm font-bold text-white bg-gradient-to-br", gradient)}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{emp.full_name}</h3>
<p className="text-xs text-muted-foreground font-mono">{formatFingerprintDisplay(emp.fingerprint_number, emp.company_name, emp.employee_number)}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0 border", status.color)}>
                      {status.label}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2">
                    {emp.department_name && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span className="truncate">{emp.department_name}</span>
                      </div>
                    )}
                    {emp.position_name && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        <span className="truncate">{emp.position_name}</span>
                      </div>
                    )}
                    {emp.email && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                  </div>

                  <Separator className="my-3" />

                  <div className="flex items-center justify-end">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleView(emp); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditEmployee(emp); setEditDialogOpen(true); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(emp); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── List View ── */
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Department</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Position</th>
                  <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Hire Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => {
                  const initials = getInitials(emp.full_name);
                  const gradient = getGradient(emp.full_name);
                  const status = STATUS_CONFIG[emp.employment_status] || STATUS_CONFIG.active;

                  return (
                    <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleView(emp)}>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={cn("text-xs text-white bg-gradient-to-br", gradient)}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{emp.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{formatFingerprintDisplay(emp.fingerprint_number, emp.company_name, emp.employee_number)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{emp.department_name || '—'}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground">{emp.position_name || '—'}</td>
                      <td className="p-3 hidden lg:table-cell text-muted-foreground">{format(new Date(emp.hire_date), 'MMM d, yyyy')}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn("text-[10px] border", status.color)}>{status.label}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); handleView(emp); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); setEditEmployee(emp); setEditDialogOpen(true); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={e => { e.stopPropagation(); handleDelete(emp); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialogs */}
      <AddEmployeeDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        departments={departments}
        positions={activePositions}
        companies={companies}
        onAdd={addEmployee}
      />
      <EmployeeProfileDialog
        employee={selectedEmployee}
        open={profileOpen}
        onClose={() => { setProfileOpen(false); setSelectedEmployee(null); }}
      />
      <EditEmployeeDialog
        employee={editEmployee}
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setEditEmployee(null); }}
        departments={departments}
        positions={activePositions}
        companies={companies}
        onUpdate={updateEmployee}
      />
    </div>
  );
}
