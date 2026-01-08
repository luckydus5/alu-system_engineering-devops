import { InventoryItem } from '@/hooks/useInventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Package, MoreVertical, Edit, Trash2, Plus, Minus, Eye, FolderInput } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: InventoryItem;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStockIn: () => void;
  onStockOut: () => void;
  onViewDetails?: () => void;
  onMove?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function ItemCard({
  item,
  canManage,
  onEdit,
  onDelete,
  onStockIn,
  onStockOut,
  onViewDetails,
  onMove,
  selectionMode = false,
  isSelected = false,
  onSelect,
}: ItemCardProps) {
  const isLowStock = item.quantity <= (item.min_quantity || 0);
  const isOutOfStock = item.quantity === 0;

  const getStockBadge = () => {
    if (isOutOfStock) {
      return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    }
    if (isLowStock) {
      return <Badge className="bg-amber-500 text-xs">Low Stock</Badge>;
    }
    return <Badge className="bg-emerald-500 text-xs">In Stock</Badge>;
  };

  const handleCardClick = () => {
    if (selectionMode && onSelect) {
      onSelect(!isSelected);
    }
  };

  return (
    <div 
      className={cn(
        "group relative rounded-xl overflow-hidden bg-white dark:bg-slate-800 border shadow-sm hover:shadow-lg transition-all",
        selectionMode && "cursor-pointer",
        isSelected && "ring-2 ring-amber-500 ring-offset-2"
      )}
      onClick={handleCardClick}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Selection Checkbox */}
        {selectionMode && (
          <div 
            className="absolute top-2 left-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelect?.(checked as boolean)}
              className="h-5 w-5 border-2 border-white bg-white/90 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
            />
          </div>
        )}

        {/* Stock Status Badge */}
        <div className={cn("absolute top-2", selectionMode ? "left-9" : "left-2")}>
          {getStockBadge()}
        </div>

        {/* Actions Menu */}
        {canManage && !selectionMode && (
          <div 
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onStockIn}>
                  <Plus className="h-4 w-4 mr-2 text-green-600" />
                  Stock In
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onStockOut} disabled={item.quantity === 0}>
                  <Minus className="h-4 w-4 mr-2 text-orange-600" />
                  Stock Out
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onMove && (
                  <DropdownMenuItem onClick={onMove}>
                    <FolderInput className="h-4 w-4 mr-2 text-amber-600" />
                    Move to...
                  </DropdownMenuItem>
                )}
                {onViewDetails && (
                  <DropdownMenuItem onClick={onViewDetails}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Quick Stock Actions (always visible on mobile) - hidden in selection mode */}
        {canManage && !selectionMode && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-green-500 hover:bg-green-600 text-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onStockIn();
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
              disabled={item.quantity === 0}
              onClick={(e) => {
                e.stopPropagation();
                onStockOut();
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3">
        <p className="font-medium text-sm truncate" title={item.item_name}>
          {item.item_name}
        </p>
        <p className="text-xs text-muted-foreground truncate" title={item.item_number}>
          {item.item_number}
        </p>
        
        {/* Quantity Display */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-lg font-bold',
              isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-foreground'
            )}>
              {item.quantity}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.unit || 'pcs'}
            </span>
          </div>
          
          {item.min_quantity !== undefined && item.min_quantity > 0 && (
            <span className={cn(
              'text-xs',
              isLowStock ? 'text-amber-600 font-medium' : 'text-muted-foreground'
            )}>
              Min. {item.min_quantity}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
