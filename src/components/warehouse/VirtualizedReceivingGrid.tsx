import { useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package, Minus, Plus, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  item_number: string;
  item_name: string;
  quantity: number;
  unit?: string;
  image_url?: string | null;
}

interface SelectedItemData {
  quantity: number;
}

interface VirtualizedReceivingGridProps {
  items: InventoryItem[];
  selectedItems: Map<string, SelectedItemData>;
  onToggleItem: (item: InventoryItem) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  height?: number;
}

const CARD_HEIGHT = 220;
const GAP = 12;

export function VirtualizedReceivingGrid({
  items,
  selectedItems,
  onToggleItem,
  onUpdateQuantity,
  height = 500,
}: VirtualizedReceivingGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate columns based on container width
  const getColumnCount = () => {
    if (typeof window === 'undefined') return 2;
    const width = parentRef.current?.clientWidth || window.innerWidth;
    if (width >= 1280) return 4;
    if (width >= 1024) return 3;
    if (width >= 640) return 2;
    return 1;
  };

  const columnCount = getColumnCount();
  const rowCount = Math.ceil(items.length / columnCount);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 3,
  });

  const virtualRows = virtualizer.getVirtualItems();

  const handleToggle = useCallback(
    (item: InventoryItem) => {
      onToggleItem(item);
    },
    [onToggleItem]
  );

  const handleQuantityChange = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity >= 1) {
        onUpdateQuantity(itemId, quantity);
      }
    },
    [onUpdateQuantity]
  );

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No items found</p>
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
        className="overflow-auto rounded-lg"
        style={{ height }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualRows.map((virtualRow) => {
            const startIndex = virtualRow.index * columnCount;

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: columnCount }).map((_, colIndex) => {
                    const itemIndex = startIndex + colIndex;
                    if (itemIndex >= items.length) return <div key={colIndex} />;

                    const item = items[itemIndex];
                    const isSelected = selectedItems.has(item.id);
                    const selectedData = selectedItems.get(item.id);
                    const quantity = selectedData?.quantity || 1;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'relative border rounded-lg p-3 transition-all cursor-pointer hover:shadow-md',
                          isSelected
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-500'
                            : 'border-border hover:border-amber-300'
                        )}
                        onClick={() => handleToggle(item)}
                      >
                        {/* Selection Indicator */}
                        <div className="absolute top-2 right-2 z-10">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggle(item)}
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
                          <p
                            className="font-medium text-sm line-clamp-2"
                            title={item.item_name}
                          >
                            {item.item_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.item_number}
                          </p>
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
                        {isSelected && (
                          <div
                            className="mt-3 flex items-center justify-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(item.id, quantity - 1)}
                              disabled={quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              value={quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 h-7 text-center"
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleQuantityChange(item.id, quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
