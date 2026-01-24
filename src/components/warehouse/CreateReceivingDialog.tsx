import { useState, useMemo, useDeferredValue, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarIcon,
  Search,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Package,
  FileDown,
  Save,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@/hooks/useInventory';
import { ReceivingRecordItem } from '@/hooks/useReceivingRecords';
import { generateReceivingPdf } from '@/lib/generateReceivingPdf';
import { useToast } from '@/hooks/use-toast';

interface CreateReceivingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems: InventoryItem[];
  inventoryLoading: boolean;
  departmentName: string;
  onSave: (data: {
    record_name: string;
    receiving_date: Date;
    items: ReceivingRecordItem[];
  }) => Promise<void>;
}

export function CreateReceivingDialog({
  open,
  onOpenChange,
  inventoryItems,
  inventoryLoading,
  departmentName,
  onSave,
}: CreateReceivingDialogProps) {
  const [recordName, setRecordName] = useState('');
  const [receivingDate, setReceivingDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedItems, setSelectedItems] = useState<Map<string, ReceivingRecordItem>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Filter inventory items based on search
  const searchResults = useMemo(() => {
    if (!deferredSearch.trim() || deferredSearch.length < 2) return [];
    const query = deferredSearch.toLowerCase();
    return inventoryItems
      .filter(
        (item) =>
          !selectedItems.has(item.id) &&
          (item.item_name.toLowerCase().includes(query) ||
            item.item_number.toLowerCase().includes(query))
      )
      .slice(0, 20); // Limit results for performance
  }, [inventoryItems, deferredSearch, selectedItems]);

  // Add item to selection
  const addItem = useCallback((item: InventoryItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.set(item.id, {
        id: item.id,
        item_name: item.item_name,
        item_number: item.item_number,
        quantity: 1,
        unit: item.unit || 'Pieces',
        image_url: item.image_url,
      });
      return next;
    });
    setSearchQuery('');
  }, []);

  // Remove item from selection
  const removeItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (item) {
        const newQty = Math.max(1, item.quantity + delta);
        next.set(itemId, { ...item, quantity: newQty });
      }
      return next;
    });
  }, []);

  // Set exact quantity
  const setQuantity = useCallback((itemId: string, quantity: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (item) {
        next.set(itemId, { ...item, quantity: Math.max(1, quantity) });
      }
      return next;
    });
  }, []);

  const selectedItemsArray = useMemo(() => Array.from(selectedItems.values()), [selectedItems]);

  // Reset form
  const resetForm = useCallback(() => {
    setRecordName('');
    setReceivingDate(new Date());
    setSearchQuery('');
    setSelectedItems(new Map());
  }, []);

  // Handle save
  const handleSave = async () => {
    if (!recordName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for this receiving record',
        variant: 'destructive',
      });
      return;
    }

    if (selectedItemsArray.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add at least one item',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        record_name: recordName.trim(),
        receiving_date: receivingDate,
        items: selectedItemsArray,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export PDF
  const handleExportPdf = async () => {
    if (selectedItemsArray.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add at least one item to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      await generateReceivingPdf({
        date: receivingDate,
        storeName: departmentName,
        items: selectedItemsArray.map((item) => ({
          id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          image_url: item.image_url,
        })),
      });
      toast({
        title: 'PDF Exported',
        description: `Exported ${selectedItemsArray.length} items`,
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

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) resetForm();
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            New Receiving Record
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4 overflow-hidden">
          {/* Record Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="record-name">Record Name *</Label>
              <Input
                id="record-name"
                placeholder="e.g., January Delivery, Supplier ABC Order"
                value={recordName}
                onChange={(e) => setRecordName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Receiving Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {format(receivingDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={receivingDate}
                    onSelect={(date) => date && setReceivingDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search to Add Items */}
          <div className="space-y-2">
            <Label>Search & Add Items</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or code (min 2 characters)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {deferredSearch.length >= 2 && (
              <div className="border rounded-md max-h-48 overflow-auto">
                {inventoryLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No items found
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="w-full px-4 py-2 text-left hover:bg-muted/50 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.item_name}</div>
                          <div className="text-xs text-muted-foreground">{item.item_number}</div>
                        </div>
                        <Plus className="h-4 w-4 shrink-0 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Items Table */}
          <div className="flex-1 min-h-0 border rounded-md">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <span className="font-medium text-sm">
                Selected Items ({selectedItemsArray.length})
              </span>
              {selectedItemsArray.length > 0 && (
                <Badge variant="secondary">
                  Total Qty: {selectedItemsArray.reduce((acc, item) => acc + item.quantity, 0)}
                </Badge>
              )}
            </div>
            <ScrollArea className="h-[200px]">
              {selectedItemsArray.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Search and add items above
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[140px] text-center">Quantity</TableHead>
                      <TableHead className="w-[80px] text-center">Unit</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItemsArray.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-xs text-muted-foreground">{item.item_number}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => setQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-14 h-7 text-center px-1"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {item.unit}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={selectedItemsArray.length === 0 || isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export PDF
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedItemsArray.length === 0 || !recordName.trim()}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Record
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
