import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowLeft,
  ClipboardCheck,
  Check,
  X,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Package,
  MapPin,
  CheckCircle2,
  XCircle,
  Minus,
  Plus,
  SkipForward,
  Loader2,
} from 'lucide-react';
import { Department } from '@/hooks/useDepartments';
import { useWarehouseClassifications, WarehouseClassification } from '@/hooks/useWarehouseClassifications';
import { useWarehouseLocations, WarehouseLocation } from '@/hooks/useWarehouseLocations';
import { useInventory, InventoryItem, clearInventoryCache } from '@/hooks/useInventory';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface QuickStockCountPageProps {
  department: Department;
  onBack: () => void;
}

interface CountEntry {
  itemId: string;
  systemQuantity: number;
  countedQuantity: number | null;
  isCounted: boolean;
  hasDiscrepancy: boolean;
}

type CountFilter = 'all' | 'pending' | 'counted' | 'discrepancy';

export function QuickStockCountPage({ department, onBack }: QuickStockCountPageProps) {
  const { toast } = useToast();
  
  // Selection state
  const [selectedClassificationId, setSelectedClassificationId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  
  // Count state
  const [counts, setCounts] = useState<Map<string, CountEntry>>(new Map());
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CountFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  
  // Refs for keyboard navigation
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  
  // Data hooks
  const { classifications, loading: classificationsLoading } = useWarehouseClassifications(department.id);
  const { locations, loading: locationsLoading } = useWarehouseLocations(
    department.id,
    selectedClassificationId || undefined
  );
  const { items, loading: itemsLoading, updateItem, refetch } = useInventory(department.id);
  
  // Get locations for selected classification (root level only for simplicity)
  const classificationLocations = useMemo(() => {
    if (!selectedClassificationId) return [];
    return locations.filter(loc => 
      loc.classification_id === selectedClassificationId && !loc.parent_id
    );
  }, [locations, selectedClassificationId]);
  
  // Filter items based on selection
  const filteredItems = useMemo(() => {
    if (!selectedClassificationId) return [];
    
    let result = items.filter(item => item.classification_id === selectedClassificationId);
    
    // Filter by location if selected
    if (selectedLocationId !== 'all') {
      if (selectedLocationId === 'unassigned') {
        result = result.filter(item => !item.location_id);
      } else {
        result = result.filter(item => item.location_id === selectedLocationId);
      }
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.item_name.toLowerCase().includes(query) ||
        item.item_number.toLowerCase().includes(query)
      );
    }
    
    // Apply count filter
    switch (filter) {
      case 'pending':
        result = result.filter(item => !counts.get(item.id)?.isCounted);
        break;
      case 'counted':
        result = result.filter(item => counts.get(item.id)?.isCounted);
        break;
      case 'discrepancy':
        result = result.filter(item => counts.get(item.id)?.hasDiscrepancy);
        break;
    }
    
    return result;
  }, [items, selectedClassificationId, selectedLocationId, searchQuery, filter, counts]);
  
  // Initialize counts when items change
  useEffect(() => {
    if (filteredItems.length > 0 && counts.size === 0) {
      const initialCounts = new Map<string, CountEntry>();
      items.forEach(item => {
        initialCounts.set(item.id, {
          itemId: item.id,
          systemQuantity: item.quantity,
          countedQuantity: null,
          isCounted: false,
          hasDiscrepancy: false,
        });
      });
      setCounts(initialCounts);
    }
  }, [items]);
  
  // Stats
  const stats = useMemo(() => {
    const itemsInScope = filteredItems;
    const totalItems = itemsInScope.length;
    const countedItems = itemsInScope.filter(item => counts.get(item.id)?.isCounted).length;
    const discrepancyItems = itemsInScope.filter(item => counts.get(item.id)?.hasDiscrepancy).length;
    const progress = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;
    
    return { totalItems, countedItems, discrepancyItems, progress };
  }, [filteredItems, counts]);
  
  // Update count for an item
  const updateCount = useCallback((itemId: string, value: number | null) => {
    setCounts(prev => {
      const newCounts = new Map(prev);
      const existing = newCounts.get(itemId);
      const item = items.find(i => i.id === itemId);
      
      if (existing && item) {
        const isCounted = value !== null;
        const hasDiscrepancy = isCounted && value !== item.quantity;
        
        newCounts.set(itemId, {
          ...existing,
          countedQuantity: value,
          isCounted,
          hasDiscrepancy,
        });
      }
      
      return newCounts;
    });
  }, [items]);
  
  // Mark item as same (system quantity = counted)
  const markAsSame = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      updateCount(itemId, item.quantity);
      moveToNextItem(itemId);
    }
  }, [items, updateCount]);
  
  // Skip item (mark as not counted)
  const skipItem = useCallback((itemId: string) => {
    setCounts(prev => {
      const newCounts = new Map(prev);
      const existing = newCounts.get(itemId);
      if (existing) {
        newCounts.set(itemId, {
          ...existing,
          countedQuantity: null,
          isCounted: false,
          hasDiscrepancy: false,
        });
      }
      return newCounts;
    });
    moveToNextItem(itemId);
  }, []);
  
  // Move to next item in list
  const moveToNextItem = useCallback((currentItemId: string) => {
    const currentIndex = filteredItems.findIndex(item => item.id === currentItemId);
    if (currentIndex < filteredItems.length - 1) {
      const nextItem = filteredItems[currentIndex + 1];
      setActiveItemId(nextItem.id);
      // Focus the input after a small delay
      setTimeout(() => {
        inputRefs.current.get(nextItem.id)?.focus();
      }, 50);
    }
  }, [filteredItems]);
  
  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = inputRefs.current.get(itemId);
      const value = input?.value;
      if (value !== undefined && value !== '') {
        updateCount(itemId, parseInt(value, 10) || 0);
      }
      moveToNextItem(itemId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      skipItem(itemId);
    }
  }, [updateCount, moveToNextItem, skipItem]);
  
  // Apply all counts to database
  const applyChanges = async () => {
    const discrepancyEntries = Array.from(counts.entries())
      .filter(([_, entry]) => entry.hasDiscrepancy && entry.countedQuantity !== null);
    
    if (discrepancyEntries.length === 0) {
      toast({
        title: 'No changes to apply',
        description: 'All counted quantities match the system.',
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Update items in batch
      for (const [itemId, entry] of discrepancyEntries) {
        if (entry.countedQuantity !== null) {
          const { error } = await supabase
            .from('inventory_items')
            .update({ quantity: entry.countedQuantity })
            .eq('id', itemId);
          
          if (error) throw error;
        }
      }
      
      // Clear cache and refetch
      clearInventoryCache();
      await refetch();
      
      // Reset counts after successful save
      setCounts(new Map());
      
      toast({
        title: 'Stock count applied',
        description: `Updated ${discrepancyEntries.length} item(s) with new quantities.`,
      });
      
      setConfirmSaveOpen(false);
    } catch (error: any) {
      console.error('Error applying stock count:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply stock count',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Reset all counts
  const resetCounts = () => {
    const initialCounts = new Map<string, CountEntry>();
    items.forEach(item => {
      initialCounts.set(item.id, {
        itemId: item.id,
        systemQuantity: item.quantity,
        countedQuantity: null,
        isCounted: false,
        hasDiscrepancy: false,
      });
    });
    setCounts(initialCounts);
    setConfirmResetOpen(false);
    toast({
      title: 'Counts reset',
      description: 'All count entries have been cleared.',
    });
  };
  
  // Get classification name
  const getClassificationName = (id: string) => {
    return classifications.find(c => c.id === id)?.name || 'Unknown';
  };
  
  // Get location name
  const getLocationName = (id: string) => {
    if (id === 'all') return 'All Locations';
    if (id === 'unassigned') return 'Unassigned Items';
    return locations.find(l => l.id === id)?.name || 'Unknown';
  };
  
  const selectedClassification = classifications.find(c => c.id === selectedClassificationId);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b shadow-sm">
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex-1">
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                Quick Stock Count
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Rapid location-by-location inventory counting
              </p>
            </div>
          </div>
          
          {/* Classification & Location Selection */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Select
              value={selectedClassificationId}
              onValueChange={(value) => {
                setSelectedClassificationId(value);
                setSelectedLocationId('all');
              }}
            >
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue placeholder="Select classification..." />
              </SelectTrigger>
              <SelectContent>
                {classifications.map((classification) => (
                  <SelectItem key={classification.id} value={classification.id}>
                    {classification.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={selectedLocationId}
              onValueChange={setSelectedLocationId}
              disabled={!selectedClassificationId}
            >
              <SelectTrigger className="h-9 sm:h-10">
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="unassigned">Unassigned Items</SelectItem>
                {classificationLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Progress Bar */}
        {selectedClassificationId && (
          <div className="px-3 sm:px-4 pb-3">
            <div className="flex items-center justify-between text-xs sm:text-sm mb-1">
              <span className="text-muted-foreground">
                Progress: {stats.countedItems} / {stats.totalItems} items
              </span>
              <span className="font-medium text-emerald-600">
                {stats.progress.toFixed(0)}%
              </span>
            </div>
            <Progress value={stats.progress} className="h-2" />
            
            {stats.discrepancyItems > 0 && (
              <div className="mt-2 flex items-center gap-1 text-amber-600 text-xs sm:text-sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                {stats.discrepancyItems} discrepancy{stats.discrepancyItems !== 1 ? 'ies' : ''} found
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Main Content */}
      <div className="p-3 sm:p-4 pb-32">
        {!selectedClassificationId ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">Select a Classification</h3>
            <p className="text-sm text-muted-foreground">
              Choose a classification to start counting items
            </p>
          </Card>
        ) : itemsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-medium mb-1">No Items Found</h3>
            <p className="text-sm text-muted-foreground">
              No items in this location to count
            </p>
          </Card>
        ) : (
          <>
            {/* Filters & Search */}
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex gap-1">
                {(['all', 'pending', 'counted', 'discrepancy'] as CountFilter[]).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(f)}
                    className={cn(
                      'h-9 px-2 sm:px-3 text-xs sm:text-sm',
                      f === 'discrepancy' && filter === f && 'bg-amber-600 hover:bg-amber-700'
                    )}
                  >
                    {f === 'all' && 'All'}
                    {f === 'pending' && 'Pending'}
                    {f === 'counted' && 'Done'}
                    {f === 'discrepancy' && 'Diff'}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Items List */}
            <div className="space-y-2">
              {filteredItems.map((item, index) => {
                const countEntry = counts.get(item.id);
                const isActive = activeItemId === item.id;
                const isCounted = countEntry?.isCounted || false;
                const hasDiscrepancy = countEntry?.hasDiscrepancy || false;
                
                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'transition-all cursor-pointer',
                      isActive && 'ring-2 ring-primary',
                      isCounted && !hasDiscrepancy && 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200',
                      hasDiscrepancy && 'bg-amber-50 dark:bg-amber-950/20 border-amber-200'
                    )}
                    onClick={() => setActiveItemId(item.id)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        {/* Item Image */}
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.item_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        {/* Item Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm sm:text-base line-clamp-1">
                                {item.item_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.item_number}
                              </p>
                            </div>
                            
                            {/* Status Badge */}
                            {isCounted && (
                              hasDiscrepancy ? (
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Diff
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  OK
                                </Badge>
                              )
                            )}
                          </div>
                          
                          {/* Count Section */}
                          <div className="mt-2 flex items-center gap-2 sm:gap-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">System</p>
                              <p className="font-bold text-lg">{item.quantity}</p>
                            </div>
                            
                            <div className="flex-1 flex items-center gap-1 sm:gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = countEntry?.countedQuantity ?? item.quantity;
                                  updateCount(item.id, Math.max(0, current - 1));
                                }}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              
                              <Input
                                ref={(el) => {
                                  if (el) inputRefs.current.set(item.id, el);
                                }}
                                type="number"
                                min="0"
                                placeholder="Count"
                                value={countEntry?.countedQuantity ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateCount(item.id, val === '' ? null : parseInt(val, 10) || 0);
                                }}
                                onKeyDown={(e) => handleKeyDown(e, item.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 sm:w-20 h-8 sm:h-9 text-center font-medium"
                              />
                              
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 sm:h-9 sm:w-9"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const current = countEntry?.countedQuantity ?? item.quantity;
                                  updateCount(item.id, current + 1);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsSame(item.id);
                                }}
                                title="Same as system"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  skipItem(item.id);
                                }}
                                title="Skip"
                              >
                                <SkipForward className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Discrepancy Info */}
                          {hasDiscrepancy && countEntry?.countedQuantity !== null && (
                            <div className="mt-2 text-xs sm:text-sm text-amber-700 flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Difference: {countEntry.countedQuantity - item.quantity > 0 ? '+' : ''}
                              {countEntry.countedQuantity - item.quantity} {item.unit || 'pcs'}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      {/* Fixed Bottom Action Bar */}
      {selectedClassificationId && stats.totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t shadow-lg p-3 sm:p-4 z-20">
          <div className="flex items-center justify-between gap-2 max-w-screen-xl mx-auto">
            <div className="text-sm">
              <span className="text-muted-foreground">Counted: </span>
              <span className="font-medium">{stats.countedItems}</span>
              {stats.discrepancyItems > 0 && (
                <span className="text-amber-600 ml-2">
                  ({stats.discrepancyItems} changes)
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmResetOpen(true)}
                disabled={stats.countedItems === 0}
                className="gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
              
              <Button
                size="sm"
                onClick={() => setConfirmSaveOpen(true)}
                disabled={stats.discrepancyItems === 0 || isSaving}
                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Apply {stats.discrepancyItems > 0 ? `(${stats.discrepancyItems})` : ''}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Save Dialog */}
      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Stock Count Changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update {stats.discrepancyItems} item(s) with the counted quantities.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={applyChanges}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Apply Changes'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Confirm Reset Dialog */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Counts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all counted quantities. Your current progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={resetCounts}
              className="bg-red-600 hover:bg-red-700"
            >
              Reset All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
