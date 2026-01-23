import { useState, useMemo, useCallback, useDeferredValue } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  FileDown,
  Search,
  Package,
  CalendarIcon,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  ArrowLeft,
  Plus,
  Minus,
} from 'lucide-react';
import { useInventory, InventoryItem } from '@/hooks/useInventory';
import { Department } from '@/hooks/useDepartments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { generateReceivingPdf } from '@/lib/generateReceivingPdf';
import { useToast } from '@/hooks/use-toast';

interface IncomingPurchasesPageProps {
  department: Department;
  onBack: () => void;
}

interface SelectedItemData {
  quantity: number;
}

export function IncomingPurchasesPage({ department, onBack }: IncomingPurchasesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemData>>(new Map());
  const [receivingDate, setReceivingDate] = useState<Date>(new Date());
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  
  const { items, loading } = useInventory(department.id);
  
  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!deferredSearch.trim()) return items;
    
    const query = deferredSearch.toLowerCase();
    return items.filter(
      (item) =>
        item.item_name.toLowerCase().includes(query) ||
        item.item_number.toLowerCase().includes(query)
    );
  }, [items, deferredSearch]);
  
  // Toggle item selection
  const toggleItem = useCallback((item: InventoryItem) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, { quantity: 1 });
      }
      return next;
    });
  }, []);
  
  // Update quantity for selected item
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedItems(prev => {
      const next = new Map(prev);
      const data = next.get(itemId);
      if (data) {
        next.set(itemId, { ...data, quantity });
      }
      return next;
    });
  }, []);
  
  // Check if item is selected
  const isSelected = useCallback((itemId: string) => selectedItems.has(itemId), [selectedItems]);
  
  // Get quantity for selected item
  const getQuantity = useCallback((itemId: string) => selectedItems.get(itemId)?.quantity || 1, [selectedItems]);
  
  // Select all filtered items
  const selectAll = useCallback(() => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      filteredItems.forEach(item => {
        if (!next.has(item.id)) {
          next.set(item.id, { quantity: 1 });
        }
      });
      return next;
    });
  }, [filteredItems]);
  
  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems(new Map());
  }, []);
  
  // Generate PDF
  const handleExportPdf = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to export',
        variant: 'destructive',
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      const selectedItemsData = items
        .filter(item => selectedItems.has(item.id))
        .map(item => ({
          id: item.id,
          item_name: item.item_name,
          quantity: selectedItems.get(item.id)?.quantity || 1,
          unit: item.unit || 'Pieces',
          image_url: item.image_url,
        }));
      
      await generateReceivingPdf({
        date: receivingDate,
        storeName: department.name || 'Warehouse',
        items: selectedItemsData,
      });
      
      toast({
        title: 'PDF Generated',
        description: `Successfully exported ${selectedItemsData.length} items`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Incoming Purchases</h2>
            <p className="text-sm text-muted-foreground">
              Select received items and export receiving report
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(receivingDate, 'MMM d, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={receivingDate}
                onSelect={(date) => date && setReceivingDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          {/* Export Button */}
          <Button
            onClick={handleExportPdf}
            disabled={selectedItems.size === 0 || isExporting}
            className="bg-amber-500 hover:bg-amber-600 gap-2"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export PDF ({selectedItems.size})
          </Button>
        </div>
      </div>
      
      {/* Selection Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Selection Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All ({filteredItems.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedItems.size === 0}>
                Clear
              </Button>
            </div>
          </div>
          
          {/* Selection Summary */}
          {selectedItems.size > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>
                <strong>{selectedItems.size}</strong> item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Items Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map((item) => {
                  const selected = isSelected(item.id);
                  const quantity = getQuantity(item.id);
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'relative border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md',
                        selected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                          : 'border-border hover:border-amber-300'
                      )}
                      onClick={() => toggleItem(item)}
                    >
                      {/* Selection Indicator */}
                      <div className="absolute top-2 right-2">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleItem(item)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      
                      {/* Item Image */}
                      <div className="aspect-square w-full mb-2 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.item_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        )}
                      </div>
                      
                      {/* Item Info */}
                      <div className="space-y-1">
                        <p className="font-medium text-sm line-clamp-2" title={item.item_name}>
                          {item.item_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.item_number}</p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {item.unit || 'pcs'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Stock: {item.quantity}
                          </span>
                        </div>
                      </div>
                      
                      {/* Quantity Control (when selected) */}
                      {selected && (
                        <div 
                          className="mt-3 flex items-center justify-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                            disabled={quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-center"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
