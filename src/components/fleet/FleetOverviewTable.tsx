import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Fleet, FleetStatus } from '@/hooks/useFleets';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Clock, Wrench } from 'lucide-react';
import { FleetInlineEdit } from './FleetInlineEdit';
import { useFleetAudit } from '@/hooks/useFleetAudit';
import { toast } from 'sonner';

interface FleetOverviewTableProps {
  fleets: Fleet[];
  loading?: boolean;
  title?: string;
  checkedBy?: string;
  inspectionDate?: string;
  onRefetch?: () => void;
}

const CONDITION_OPTIONS = [
  { value: 'operational', label: 'Operational' },
  { value: 'good_condition', label: 'Good Condition' },
  { value: 'under_repair', label: 'Under Repair' },
  { value: 'waiting_parts', label: 'Waiting Parts' },
  { value: 'grounded', label: 'Grounded' },
  { value: 'decommissioned', label: 'Out of Service' },
];

const getConditionBadge = (fleet: Fleet) => {
  const condition = fleet.condition || fleet.status;
  const hasIssues = (fleet.issues?.length || 0) > 0;
  
  if (condition === 'operational' && !hasIssues) {
    return { label: 'Operational', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' };
  }
  if (condition === 'good_condition') {
    return { label: 'Good Condition', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' };
  }
  if (condition === 'grounded') {
    return { label: 'Grounded', className: 'bg-red-600 hover:bg-red-700 text-white' };
  }
  if (condition === 'under_repair' || fleet.status === 'under_maintenance') {
    return { label: 'Under Repair', className: 'bg-amber-500 hover:bg-amber-600 text-white' };
  }
  if (condition === 'waiting_parts') {
    return { label: 'Waiting Parts', className: 'bg-orange-500 hover:bg-orange-600 text-white' };
  }
  if (condition === 'decommissioned' || fleet.status === 'out_of_service') {
    return { label: 'Out of Service', className: 'bg-red-500 hover:bg-red-600 text-white' };
  }
  if (hasIssues) {
    return { label: 'Has Issues', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' };
  }
  return { label: 'Operational', className: 'bg-emerald-500 hover:bg-emerald-600 text-white' };
};

export function FleetOverviewTable({ 
  fleets, 
  loading, 
  title = "HQ PEAT INSPECTION FOR VALTRA TRACTORS",
  checkedBy,
  inspectionDate,
  onRefetch
}: FleetOverviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const { updateFleetWithAudit, resolveIssueWithAudit } = useFleetAudit();

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleUpdateField = async (fleetId: string, field: string, oldValue: string | number | null, newValue: string) => {
    try {
      const parsedValue = field === 'machine_hours' ? parseInt(newValue) || 0 : newValue;
      await updateFleetWithAudit(fleetId, field, oldValue, parsedValue);
      toast.success(`${field.replace('_', ' ')} updated successfully`);
      onRefetch?.();
    } catch (error) {
      toast.error('Failed to update field');
      throw error;
    }
  };

  const handleResolveIssue = async (issueId: string, fleetId: string, description: string) => {
    try {
      await resolveIssueWithAudit(issueId, fleetId, description);
      toast.success('Issue marked as resolved');
      onRefetch?.();
    } catch (error) {
      toast.error('Failed to resolve issue');
    }
  };

  if (loading) {
    return (
      <Card className="shadow-corporate">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-corporate">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <CardTitle className="text-lg font-bold">{title}</CardTitle>
          <div className="flex flex-col md:flex-row gap-2 text-sm text-muted-foreground">
            {checkedBy && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Checked by: <span className="font-medium text-foreground">{checkedBy}</span>
              </span>
            )}
            {inspectionDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Inspection Date: <span className="font-medium text-foreground">{inspectionDate}</span>
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[60px]">S/N</TableHead>
                <TableHead>Fleet Number</TableHead>
                <TableHead>Machine Description</TableHead>
                <TableHead>Delivery Time</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fleets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No fleet machines registered yet
                  </TableCell>
                </TableRow>
              ) : (
                fleets.map((fleet, index) => {
                  const hasIssues = (fleet.issues?.length || 0) > 0;
                  const isExpanded = expandedRows.has(fleet.id);
                  const badge = getConditionBadge(fleet);

                  return (
                    <Collapsible key={fleet.id} asChild open={isExpanded}>
                      <>
                        <TableRow className="hover:bg-muted/50 border-b">
                          <TableCell>
                            {hasIssues && (
                              <CollapsibleTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleRow(fleet.id)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-semibold">{fleet.fleet_number}</TableCell>
                          <TableCell>{fleet.machine_type}</TableCell>
                          <TableCell>
                            {fleet.delivery_date 
                              ? format(new Date(fleet.delivery_date), 'dd.MM.yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <FleetInlineEdit
                              value={fleet.machine_hours}
                              type="number"
                              onSave={(val) => handleUpdateField(fleet.id, 'machine_hours', fleet.machine_hours, val)}
                              placeholder="-"
                            />
                          </TableCell>
                          <TableCell>
                            {hasIssues ? (
                              <div className="flex items-center gap-1 text-amber-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">{fleet.issues?.length} issue(s)</span>
                              </div>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                {fleet.current_status || 'Operational'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <FleetInlineEdit
                              value={fleet.condition || 'operational'}
                              type="select"
                              options={CONDITION_OPTIONS}
                              onSave={(val) => handleUpdateField(fleet.id, 'condition', fleet.condition, val)}
                            />
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <FleetInlineEdit
                              value={fleet.remarks}
                              type="text"
                              onSave={(val) => handleUpdateField(fleet.id, 'remarks', fleet.remarks, val)}
                              placeholder="-"
                              className="text-muted-foreground text-sm"
                            />
                          </TableCell>
                        </TableRow>
                        {hasIssues && (
                          <CollapsibleContent asChild>
                            <TableRow className="bg-amber-50/50 dark:bg-amber-950/20">
                              <TableCell colSpan={9} className="py-3 px-8">
                                <div className="space-y-2">
                                  <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                    <Wrench className="h-4 w-4" />
                                    Issues requiring attention:
                                  </p>
                                  <ul className="list-none space-y-2 ml-6">
                                    {fleet.issues?.map((issue, i) => (
                                      <li key={issue.id} className="text-sm text-muted-foreground flex items-center justify-between gap-4 group">
                                        <div className="flex items-start gap-2">
                                          <span className="font-medium text-foreground">{i + 1}.</span>
                                          <span>{issue.issue_description}</span>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                          onClick={() => handleResolveIssue(issue.id, fleet.id, issue.issue_description)}
                                        >
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Mark Resolved
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        )}
                      </>
                    </Collapsible>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {checkedBy && (
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            Checked by <span className="font-medium text-foreground">{checkedBy}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
