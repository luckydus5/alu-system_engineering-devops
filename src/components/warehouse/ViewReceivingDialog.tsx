import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileDown,
  Loader2,
  Package,
  CalendarIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { ReceivingRecord } from '@/hooks/useReceivingRecords';
import { generateReceivingPdf } from '@/lib/generateReceivingPdf';
import { useToast } from '@/hooks/use-toast';

interface ViewReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: ReceivingRecord | null;
  departmentName: string;
}

export function ViewReceivingDialog({
  open,
  onOpenChange,
  record,
  departmentName,
}: ViewReceivingDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  if (!record) return null;

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await generateReceivingPdf({
        date: new Date(record.receiving_date),
        storeName: departmentName,
        items: record.items.map((item) => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          image_url: item.image_url,
        })),
      });
      toast({
        title: 'PDF Exported',
        description: `Successfully exported "${record.record_name}"`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalQuantity = record.items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {record.record_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          {/* Record Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{format(new Date(record.receiving_date), 'MMMM d, yyyy')}</span>
            </div>
            <Badge variant="secondary">{record.total_items} items</Badge>
            <Badge variant="outline">Total Qty: {totalQuantity}</Badge>
            <Badge
              variant={record.status === 'completed' ? 'default' : 'outline'}
              className={
                record.status === 'completed'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                  : ''
              }
            >
              {record.status}
            </Badge>
          </div>

          {/* Items Table */}
          <div className="border rounded-md flex-1 min-h-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-center">Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {record.items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          )}
                          {item.item_name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.item_number}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.unit}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
