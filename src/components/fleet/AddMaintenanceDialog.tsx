import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Fleet } from '@/hooks/useFleets';
import { ServiceType, ConditionType } from '@/hooks/useMaintenanceRecords';
import { format } from 'date-fns';
import { Plus, X } from 'lucide-react';

interface AddMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fleets: Fleet[];
  onSubmit: (data: {
    fleet_id: string;
    service_type: ServiceType;
    service_description: string;
    maintenance_date: string;
    delivery_time_hours?: number;
    machine_hours?: number;
    condition_after_service?: ConditionType;
    current_status?: string;
    remarks?: string;
    next_service_due?: string;
    issues?: string[];
  }) => Promise<void>;
}

export function AddMaintenanceDialog({ open, onOpenChange, fleets, onSubmit }: AddMaintenanceDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [fleetId, setFleetId] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('preventive');
  const [serviceDescription, setServiceDescription] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deliveryTimeHours, setDeliveryTimeHours] = useState('');
  const [machineHours, setMachineHours] = useState('');
  const [conditionAfterService, setConditionAfterService] = useState<ConditionType>('good');
  const [currentStatus, setCurrentStatus] = useState('');
  const [remarks, setRemarks] = useState('');
  const [nextServiceDue, setNextServiceDue] = useState('');
  const [issues, setIssues] = useState<string[]>(['']);

  const addIssueField = () => {
    setIssues([...issues, '']);
  };

  const removeIssueField = (index: number) => {
    setIssues(issues.filter((_, i) => i !== index));
  };

  const updateIssue = (index: number, value: string) => {
    const newIssues = [...issues];
    newIssues[index] = value;
    setIssues(newIssues);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fleetId || !serviceDescription.trim() || !maintenanceDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    // Filter out empty issues
    const validIssues = issues.filter(issue => issue.trim() !== '');

    try {
      setLoading(true);
      await onSubmit({
        fleet_id: fleetId,
        service_type: serviceType,
        service_description: serviceDescription.trim(),
        maintenance_date: maintenanceDate,
        delivery_time_hours: deliveryTimeHours ? parseInt(deliveryTimeHours) : undefined,
        machine_hours: machineHours ? parseInt(machineHours) : undefined,
        condition_after_service: conditionAfterService,
        current_status: currentStatus.trim() || undefined,
        remarks: remarks.trim() || undefined,
        next_service_due: nextServiceDue || undefined,
        issues: validIssues.length > 0 ? validIssues : undefined
      });
      
      const fleet = fleets.find(f => f.id === fleetId);
      toast({
        title: 'Maintenance Recorded',
        description: `Service for ${fleet?.fleet_number || 'fleet'} has been logged${validIssues.length > 0 ? ` with ${validIssues.length} issue(s)` : ''}`
      });
      
      // Reset form
      setFleetId('');
      setServiceType('preventive');
      setServiceDescription('');
      setMaintenanceDate(format(new Date(), 'yyyy-MM-dd'));
      setDeliveryTimeHours('');
      setMachineHours('');
      setConditionAfterService('good');
      setCurrentStatus('');
      setRemarks('');
      setNextServiceDue('');
      setIssues(['']);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record maintenance',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Maintenance</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fleet">Fleet *</Label>
                <Select value={fleetId} onValueChange={setFleetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fleet" />
                  </SelectTrigger>
                  <SelectContent>
                    {fleets.map((fleet) => (
                      <SelectItem key={fleet.id} value={fleet.id}>
                        {fleet.fleet_number} - {fleet.machine_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="service_type">Service Type *</Label>
                <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventive">Preventive</SelectItem>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="breakdown">Breakdown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Service Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe the maintenance work performed..."
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maintenance_date">Maintenance Date *</Label>
                <Input
                  type="date"
                  id="maintenance_date"
                  value={maintenanceDate}
                  onChange={(e) => setMaintenanceDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="next_service">Next Service Due</Label>
                <Input
                  type="date"
                  id="next_service"
                  value={nextServiceDue}
                  onChange={(e) => setNextServiceDue(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="delivery_hours">Delivery Time (Hours)</Label>
                <Input
                  type="number"
                  id="delivery_hours"
                  placeholder="0"
                  value={deliveryTimeHours}
                  onChange={(e) => setDeliveryTimeHours(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="machine_hours">Machine Hours</Label>
                <Input
                  type="number"
                  id="machine_hours"
                  placeholder="0"
                  value={machineHours}
                  onChange={(e) => setMachineHours(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="condition">Condition After Service</Label>
                <Select value={conditionAfterService} onValueChange={(v) => setConditionAfterService(v as ConditionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="current_status">Current Status</Label>
                <Input
                  id="current_status"
                  placeholder="e.g., Repair In Progress"
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                />
              </div>
            </div>

            {/* Issues Section */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Issues Found (Optional)</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={addIssueField}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Issue
                </Button>
              </div>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {issues.map((issue, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                    <Input
                      value={issue}
                      onChange={(e) => updateIssue(index, e.target.value)}
                      placeholder="Describe the issue..."
                      className="flex-1"
                    />
                    {issues.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIssueField(index)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Add issues found during inspection. These will appear as numbered items in the fleet table.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                placeholder="Additional notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Record Maintenance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
