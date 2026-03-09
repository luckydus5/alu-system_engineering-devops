import { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Package, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  description?: string;
}

interface SelectedItem {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  maxQuantity: number;
}

interface VirtualizedInventoryPickerProps {
  items: InventoryItem[];
  selectedItems: SelectedItem[];
  onToggleItem: (item: InventoryItem, checked: boolean) => void;
  onUpdateQuantity: (itemId: string, delta: number) => void;
  height?: number;
}

const ITEM_HEIGHT = 72; // Height of each item row in pixels

export function VirtualizedInventoryPicker({
  items,
  selectedItems,
  onToggleItem,
  onUpdateQuantity,
  height = 400,
}: VirtualizedInventoryPickerProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Create a Set for O(1) lookup
  const selectedItemIds = useMemo(
    () => new Set(selectedItems.map((s) => s.id)),
    [selectedItems]
  );

  // Create a Map for O(1) quantity lookup
  const selectedItemMap = useMemo(
    () => new Map(selectedItems.map((s) => [s.id, s])),
    [selectedItems]
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  const virtualItems = virtualizer.getVirtualItems();

  const handleToggle = useCallback(
    (item: InventoryItem, checked: boolean) => {
      onToggleItem(item, checked);
    },
    [onToggleItem]
  );

  const handleQuantityChange = useCallback(
    (itemId: string, delta: number) => {
      onUpdateQuantity(itemId, delta);
    },
    [onUpdateQuantity]
  );

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No items available to add</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground px-1">
        {items.length.toLocaleString()} items available
      </div>

      <div
        ref={parentRef}
        className="overflow-auto rounded-lg border"
        style={{ height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index];
            const isSelected = selectedItemIds.has(item.id);
            const selectedItem = selectedItemMap.get(item.id);

            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 mx-1 my-1 rounded-lg border transition-colors h-[64px]',
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-border hover:bg-muted/50'
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleToggle(item, !!checked)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.item_number} • Stock: {item.quantity}
                    </p>
                  </div>
                  {isSelected && selectedItem && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={selectedItem.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-mono text-sm">
                        {selectedItem.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(item.id, 1)}
                        disabled={selectedItem.quantity >= selectedItem.maxQuantity}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
