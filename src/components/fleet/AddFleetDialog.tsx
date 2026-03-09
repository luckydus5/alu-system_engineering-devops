import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FleetStatus } from '@/hooks/useFleets';

interface AddFleetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    fleet_number: string;
    machine_type: string;
    status: FleetStatus;
    delivery_date?: string;
    machine_hours?: number;
    current_status?: string;
    condition?: string;
    remarks?: string;
    checked_by_name?: string;
    last_inspection_date?: string;
  }) => Promise<void>;
}

const machineTypes = [
  'VALTRA TRACTOR',
  'John Deere',
  'Massey Ferguson',
  'New Holland',
  'Case IH',
  'Kubota',
  'Caterpillar',
  'Komatsu',
  'Excavator',
  'Loader',
  'Other'
];

const conditionOptions = [
  { value: 'operational', label: 'Operational' },
  { value: 'good_condition', label: 'Good Condition' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'waiting_parts', label: 'Waiting for Parts' },
  { value: 'grounded', label: 'Grounded' },
  { value: 'decommissioned', label: 'Decommissioned' }
];

export function AddFleetDialog({ open, onOpenChange, onSubmit }: AddFleetDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fleetNumber: '',
    machineType: 'VALTRA TRACTOR',
    deliveryDate: '',
    machineHours: '',
    currentStatus: '',
    condition: 'operational',
    remarks: '',
    checkedByName: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fleetNumber.trim() || !formData.machineType.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in Fleet Number and Machine Type',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Determine status based on condition
      let status: FleetStatus = 'operational';
      if (formData.condition === 'under_repair') {
        status = 'under_maintenance';
      } else if (['grounded', 'decommissioned'].includes(formData.condition)) {
        status = 'out_of_service';
      }

      await onSubmit({
        fleet_number: formData.fleetNumber.trim(),
        machine_type: formData.machineType.trim(),
        status,
        delivery_date: formData.deliveryDate || undefined,
        machine_hours: formData.machineHours ? parseInt(formData.machineHours) : undefined,
        current_status: formData.currentStatus || undefined,
        condition: formData.condition,
        remarks: formData.remarks || undefined,
        checked_by_name: formData.checkedByName || undefined,
        last_inspection_date: new Date().toISOString().split('T')[0]
      });
      
      toast({
        title: 'Fleet Added',
        description: `${formData.fleetNumber} has been registered successfully`
      });
      
      // Reset form
      setFormData({
        fleetNumber: '',
        machineType: 'VALTRA TRACTOR',
        deliveryDate: '',
        machineHours: '',
        currentStatus: '',
        condition: 'operational',
        remarks: '',
        checkedByName: ''
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add fleet',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Fleet Machine</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fleet_number">Fleet Number *</Label>
                <Input
                  id="fleet_number"
                  placeholder="e.g., VT001"
                  value={formData.fleetNumber}
                  onChange={(e) => setFormData({ ...formData, fleetNumber: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="machine_type">Machine Type *</Label>
                <Select 
                  value={formData.machineType} 
                  onValueChange={(v) => setFormData({ ...formData, machineType: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {machineTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="delivery_date">Delivery Date</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="machine_hours">Machine Hours</Label>
                <Input
                  id="machine_hours"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.machineHours}
                  onChange={(e) => setFormData({ ...formData, machineHours: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <Select 
                value={formData.condition} 
                onValueChange={(v) => setFormData({ ...formData, condition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="current_status">Current Status Notes</Label>
              <Input
                id="current_status"
                placeholder="e.g., Operational, Failed transmission clutches"
                value={formData.currentStatus}
                onChange={(e) => setFormData({ ...formData, currentStatus: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Additional notes or comments"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="checked_by">Checked By</Label>
              <Input
                id="checked_by"
                placeholder="Inspector name"
                value={formData.checkedByName}
                onChange={(e) => setFormData({ ...formData, checkedByName: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Fleet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
