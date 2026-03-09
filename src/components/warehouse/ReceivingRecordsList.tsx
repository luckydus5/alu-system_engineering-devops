import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  FileDown,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { ReceivingRecord } from '@/hooks/useReceivingRecords';
import { generateReceivingPdf } from '@/lib/generateReceivingPdf';
import { useToast } from '@/hooks/use-toast';

interface ReceivingRecordsListProps {
  records: ReceivingRecord[];
  loading: boolean;
  departmentName: string;
  onCreateNew: () => void;
  onViewRecord: (record: ReceivingRecord) => void;
  onDeleteRecord: (id: string) => Promise<void>;
}

export function ReceivingRecordsList({
  records,
  loading,
  departmentName,
  onCreateNew,
  onViewRecord,
  onDeleteRecord,
}: ReceivingRecordsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(
      (record) =>
        record.record_name.toLowerCase().includes(query) ||
        format(new Date(record.receiving_date), 'MMM d, yyyy').toLowerCase().includes(query)
    );
  }, [records, searchQuery]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await onDeleteRecord(deleteId);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleExportPdf = async (record: ReceivingRecord) => {
    setExportingId(record.id);
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
      setExportingId(null);
    }
  };

  return (
    <>
      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="pb-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Receiving History
            </CardTitle>
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              New Receiving
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium text-lg">No receiving records yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Create a new receiving record to document incoming purchases
              </p>
              <Button onClick={onCreateNew} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create First Record
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-320px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Record Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onViewRecord(record)}
                    >
                      <TableCell className="font-medium">
                        {record.record_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(record.receiving_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {record.total_items} items
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
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
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onViewRecord(record);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportPdf(record);
                              }}
                              disabled={exportingId === record.id}
                            >
                              {exportingId === record.id ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <FileDown className="h-4 w-4 mr-2" />
                              )}
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(record.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receiving Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record and its data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
