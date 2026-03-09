import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet } from 'lucide-react';
import { ItemRequest } from '@/hooks/useItemRequests';
import { exportItemRequestsWithSummary } from '@/lib/exportItemRequests';
import { format, startOfMonth, endOfMonth, isWithinInterval, getYear, setYear, setMonth } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ExportRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: ItemRequest[];
  departmentName: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ExportRequestsDialog({
  open,
  onOpenChange,
  requests,
  departmentName,
}: ExportRequestsDialogProps) {
  const { toast } = useToast();
  const currentYear = getYear(new Date());
  
  // State for year selection
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  
  // State for selected months (array of month indices 0-11)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth()]);

  // Generate available years (current year and 5 years back)
  const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const toggleMonth = (monthIndex: number) => {
    setSelectedMonths(prev => {
      if (prev.includes(monthIndex)) {
        return prev.filter(m => m !== monthIndex);
      }
      return [...prev, monthIndex].sort((a, b) => a - b);
    });
  };

  const selectAllMonths = () => {
    // Only select months up to current month if current year
    if (selectedYear === currentYear) {
      const currentMonth = new Date().getMonth();
      setSelectedMonths(Array.from({ length: currentMonth + 1 }, (_, i) => i));
    } else {
      setSelectedMonths(Array.from({ length: 12 }, (_, i) => i));
    }
  };

  const clearAllMonths = () => {
    setSelectedMonths([]);
  };

  // Get maximum selectable month for the selected year
  const getMaxMonth = () => {
    if (selectedYear === currentYear) {
      return new Date().getMonth();
    }
    return 11;
  };

  const handleExport = () => {
    if (selectedMonths.length === 0) {
      toast({
        title: 'No Months Selected',
        description: 'Please select at least one month to export',
        variant: 'destructive',
      });
      return;
    }

    // Filter requests for selected months
    const filteredRequests = requests.filter(r => {
      const requestDate = new Date(r.created_at);
      const requestYear = getYear(requestDate);
      
      if (requestYear !== selectedYear) return false;
      
      return selectedMonths.some(monthIndex => {
        const monthStart = startOfMonth(setMonth(setYear(new Date(), selectedYear), monthIndex));
        const monthEnd = endOfMonth(monthStart);
        return isWithinInterval(requestDate, { start: monthStart, end: monthEnd });
      });
    });

    if (filteredRequests.length === 0) {
      toast({
        title: 'No Data',
        description: 'No requests found for the selected period',
        variant: 'destructive',
      });
      return;
    }

    // Create date range description
    const monthNames = selectedMonths.map(m => MONTHS[m]);
    const dateRange = monthNames.length === 1 
      ? `${monthNames[0]} ${selectedYear}`
      : `${monthNames[0]} - ${monthNames[monthNames.length - 1]} ${selectedYear}`;

    const result = exportItemRequestsWithSummary(
      filteredRequests,
      departmentName,
      {
        dateFrom: format(startOfMonth(setMonth(setYear(new Date(), selectedYear), Math.min(...selectedMonths))), 'yyyy-MM-dd'),
        dateTo: format(endOfMonth(setMonth(setYear(new Date(), selectedYear), Math.max(...selectedMonths))), 'yyyy-MM-dd'),
      }
    );

    if (result.success) {
      toast({
        title: 'Export Successful',
        description: `${result.message} for ${dateRange}`,
      });
      onOpenChange(false);
    } else {
      toast({
        title: 'Export Failed',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  const maxMonth = getMaxMonth();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
            Export Item Requests
          </DialogTitle>
          <DialogDescription>
            Select the year and months you want to export
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Year Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Year</Label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => {
                const year = parseInt(value);
                setSelectedYear(year);
                // Reset months if switching to current year and some selected months are in the future
                if (year === currentYear) {
                  const currentMonth = new Date().getMonth();
                  setSelectedMonths(prev => prev.filter(m => m <= currentMonth));
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Month Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Months</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={selectAllMonths}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={clearAllMonths}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((month, index) => {
                const isDisabled = selectedYear === currentYear && index > maxMonth;
                const isSelected = selectedMonths.includes(index);
                
                return (
                  <label
                    key={month}
                    className={`
                      flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors
                      ${isDisabled ? 'opacity-40 cursor-not-allowed bg-muted' : 'hover:bg-accent'}
                      ${isSelected && !isDisabled ? 'border-primary bg-primary/10' : 'border-border'}
                    `}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => !isDisabled && toggleMonth(index)}
                      disabled={isDisabled}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{month.slice(0, 3)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Selection Summary */}
          {selectedMonths.length > 0 && (
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedMonths.length}</span> month{selectedMonths.length !== 1 ? 's' : ''} selected for {selectedYear}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={selectedMonths.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
