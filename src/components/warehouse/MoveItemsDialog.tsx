import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Loader2, FolderInput, MapPin, Package, ChevronRight, AlertTriangle, FolderOpen } from 'lucide-react';
import { WarehouseClassification } from '@/hooks/useWarehouseClassifications';
import { WarehouseLocation } from '@/hooks/useWarehouseLocations';
import { InventoryItem } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';

interface MoveItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: InventoryItem[];
  departmentId: string;
  currentClassificationId?: string;
  currentLocationId?: string;
  onMove: (classificationId: string, locationId: string | null) => Promise<boolean>;
}

export function MoveItemsDialog({
  open,
  onOpenChange,
  selectedItems,
  departmentId,
  currentClassificationId,
  currentLocationId,
  onMove,
}: MoveItemsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [classifications, setClassifications] = useState<WarehouseClassification[]>([]);
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [loadingClassifications, setLoadingClassifications] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  const [selectedClassificationId, setSelectedClassificationId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  
  // New: Allow transfer to classification level (no folder)
  const [transferToClassificationOnly, setTransferToClassificationOnly] = useState(false);
  
  // Progress tracking for bulk transfers
  const [transferProgress, setTransferProgress] = useState(0);

  // Fetch classifications when dialog opens
  useEffect(() => {
    if (open && departmentId) {
      fetchClassifications();
    }
  }, [open, departmentId]);

  // Fetch locations when classification changes
  useEffect(() => {
    if (selectedClassificationId) {
      fetchLocations(selectedClassificationId);
    } else {
      setLocations([]);
      setSelectedLocationId('');
    }
  }, [selectedClassificationId]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedClassificationId('');
      setSelectedLocationId('');
      setLocations([]);
      setTransferToClassificationOnly(false);
      setTransferProgress(0);
    }
  }, [open]);

  const fetchClassifications = async () => {
    setLoadingClassifications(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_classifications')
        .select('*')
        .eq('department_id', departmentId)
        .order('name');

      if (error) throw error;
      setClassifications(data || []);
    } catch (error) {
      console.error('Error fetching classifications:', error);
    } finally {
      setLoadingClassifications(false);
    }
  };

  const fetchLocations = async (classificationId: string) => {
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('*')
        .eq('classification_id', classificationId)
        .eq('department_id', departmentId)
        .order('name');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClassificationId) return;
    if (!transferToClassificationOnly && !selectedLocationId) return;
    
    setLoading(true);
    setTransferProgress(10);
    
    // Simulate progress for better UX on large transfers
    const progressInterval = setInterval(() => {
      setTransferProgress(prev => Math.min(prev + 10, 90));
    }, 200);
    
    const success = await onMove(
      selectedClassificationId, 
      transferToClassificationOnly ? null : selectedLocationId
    );
    
    clearInterval(progressInterval);
    setTransferProgress(100);
    
    setTimeout(() => {
      setLoading(false);
      setTransferProgress(0);
      if (success) {
        onOpenChange(false);
      }
    }, 300);
  };

  // Check if destination is the same as current
  const isSameDestination = transferToClassificationOnly
    ? (selectedClassificationId === currentClassificationId && !currentLocationId)
    : (selectedClassificationId === currentClassificationId && selectedLocationId === currentLocationId);

  const selectedClassification = classifications.find(c => c.id === selectedClassificationId);
  const selectedLocation = locations.find(l => l.id === selectedLocationId);
  
  // Check if items can be transferred (classification selected, and either location selected OR classification-only mode)
  const canTransfer = selectedClassificationId && 
    (transferToClassificationOnly || selectedLocationId) && 
    !isSameDestination;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="h-5 w-5 text-amber-500" />
            Move Items
          </DialogTitle>
          <DialogDescription>
            Select a destination to move {selectedItems.length} item(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selected Items Preview */}
          <div className="rounded-lg border bg-muted/30 p-3">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              Items to Move ({selectedItems.length})
            </Label>
            <ScrollArea className="max-h-24">
              <div className="flex flex-wrap gap-1">
                {selectedItems.slice(0, 10).map((item) => (
                  <Badge key={item.id} variant="secondary" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {item.item_name}
                  </Badge>
                ))}
                {selectedItems.length > 10 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedItems.length - 10} more
                  </Badge>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Classification Selection */}
          <div className="space-y-2">
            <Label htmlFor="classification">Destination Classification</Label>
            <Select
              value={selectedClassificationId}
              onValueChange={setSelectedClassificationId}
              disabled={loadingClassifications}
            >
              <SelectTrigger id="classification">
                <SelectValue placeholder={loadingClassifications ? 'Loading...' : 'Select a classification'} />
              </SelectTrigger>
              <SelectContent>
                {classifications.map((classification) => (
                  <SelectItem key={classification.id} value={classification.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: classification.color || '#FFA500' }}
                      />
                      {classification.name}
                      {classification.id === currentClassificationId && (
                        <span className="text-xs text-muted-foreground">(current)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transfer Mode Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label htmlFor="classification-only" className="text-sm font-medium">
                Transfer to Classification Only
              </Label>
              <p className="text-xs text-muted-foreground">
                Move items without assigning to a specific folder
              </p>
            </div>
            <Switch
              id="classification-only"
              checked={transferToClassificationOnly}
              onCheckedChange={(checked) => {
                setTransferToClassificationOnly(checked);
                if (checked) setSelectedLocationId('');
              }}
            />
          </div>

          {/* Location Selection - Only show if not in classification-only mode */}
          {!transferToClassificationOnly && (
            <div className="space-y-2">
              <Label htmlFor="location">Destination Folder</Label>
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
                disabled={!selectedClassificationId || loadingLocations}
              >
                <SelectTrigger id="location">
                  <SelectValue 
                    placeholder={
                      !selectedClassificationId 
                        ? 'Select a classification first'
                        : loadingLocations 
                          ? 'Loading...' 
                          : locations.length === 0 
                            ? 'No folders available'
                            : 'Select a folder'
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {location.name}
                        {location.id === currentLocationId && (
                          <span className="text-xs text-muted-foreground">(current)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClassificationId && !loadingLocations && locations.length === 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  No folders in this classification. Enable "Classification Only" mode above, or create a folder first.
                </p>
              )}
            </div>
          )}

          {/* Destination Preview */}
          {selectedClassification && (transferToClassificationOnly || selectedLocation) && (
            <div className="rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-3">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Destination Path
              </Label>
              <div className="flex items-center gap-1 text-sm font-medium flex-wrap">
                <span 
                  className="px-2 py-1 rounded"
                  style={{ backgroundColor: selectedClassification.color || '#FFA500', color: '#fff' }}
                >
                  {selectedClassification.name}
                </span>
                {!transferToClassificationOnly && selectedLocation && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700">
                      {selectedLocation.name}
                    </span>
                  </>
                )}
                {transferToClassificationOnly && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 italic">
                      Unassigned (No Folder)
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Progress Bar for Bulk Transfers */}
          {loading && selectedItems.length > 5 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Transferring {selectedItems.length} items...</span>
                <span>{transferProgress}%</span>
              </div>
              <Progress value={transferProgress} className="h-2" />
            </div>
          )}

          {/* Same Destination Warning */}
          {isSameDestination && selectedClassificationId && selectedLocationId && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3">
              <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Items are already in this location
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !canTransfer}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <FolderInput className="h-4 w-4" />
                Transfer {selectedItems.length} Item(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
