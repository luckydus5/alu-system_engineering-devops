import { useState, useEffect, useMemo } from 'react';
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
import { Loader2, FolderInput, MapPin, Package, ChevronRight, AlertTriangle } from 'lucide-react';
import { WarehouseClassification } from '@/hooks/useWarehouseClassifications';
import { WarehouseLocation } from '@/hooks/useWarehouseLocations';
import { InventoryItem } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MoveItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: InventoryItem[];
  departmentId: string;
  currentClassificationId?: string;
  currentLocationId?: string;
  onMove: (classificationId: string, locationId: string) => Promise<boolean>;
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
    if (!selectedClassificationId || !selectedLocationId) return;
    
    setLoading(true);
    const success = await onMove(selectedClassificationId, selectedLocationId);
    setLoading(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  const isSameDestination = 
    selectedClassificationId === currentClassificationId && 
    selectedLocationId === currentLocationId;

  const selectedClassification = classifications.find(c => c.id === selectedClassificationId);
  const selectedLocation = locations.find(l => l.id === selectedLocationId);

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

          {/* Location Selection */}
          <div className="space-y-2">
            <Label htmlFor="location">Destination Location</Label>
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
                          ? 'No locations available'
                          : 'Select a location'
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
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                No locations in this classification. Create one first.
              </p>
            )}
          </div>

          {/* Destination Preview */}
          {selectedClassification && selectedLocation && (
            <div className="rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-3">
              <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                Destination Path
              </Label>
              <div className="flex items-center gap-1 text-sm font-medium">
                <span 
                  className="px-2 py-1 rounded"
                  style={{ backgroundColor: selectedClassification.color || '#FFA500', color: '#fff' }}
                >
                  {selectedClassification.name}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700">
                  {selectedLocation.name}
                </span>
              </div>
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
            disabled={loading || !selectedClassificationId || !selectedLocationId || isSameDestination}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <FolderInput className="h-4 w-4" />
                Move {selectedItems.length} Item(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
