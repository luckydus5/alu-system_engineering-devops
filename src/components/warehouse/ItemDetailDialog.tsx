import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  MapPin,
  FolderOpen,
  Plus,
  Minus,
  Image as ImageIcon,
  Edit,
  Trash2,
  ChevronRight,
  Box,
  Calendar,
  User,
  Hash,
  Layers,
} from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';
import { cn } from '@/lib/utils';

interface LocationBreadcrumb {
  id: string;
  name: string;
  type: 'classification' | 'location';
}

interface ItemDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  classification?: { id: string; name: string; color?: string } | null;
  location?: { id: string; name: string } | null;
  parentLocations?: { id: string; name: string }[];
  canManage: boolean;
  onStockIn: () => void;
  onStockOut: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewFullImage: (url: string) => void;
}

export function ItemDetailDialog({
  open,
  onOpenChange,
  item,
  classification,
  location,
  parentLocations = [],
  canManage,
  onStockIn,
  onStockOut,
  onEdit,
  onDelete,
  onViewFullImage,
}: ItemDetailDialogProps) {
  if (!item) return null;

  const isLowStock = item.quantity <= (item.min_quantity || 0);
  const isOutOfStock = item.quantity === 0;

  // Build location breadcrumb
  const locationPath: LocationBreadcrumb[] = [];
  if (classification) {
    locationPath.push({ id: classification.id, name: classification.name, type: 'classification' });
  }
  parentLocations.forEach(loc => {
    locationPath.push({ id: loc.id, name: loc.name, type: 'location' });
  });
  if (location) {
    locationPath.push({ id: location.id, name: location.name, type: 'location' });
  }

  const getStockBadge = () => {
    if (isOutOfStock) {
      return <Badge variant="destructive" className="text-sm px-3 py-1">Out of Stock</Badge>;
    }
    if (isLowStock) {
      return <Badge className="bg-amber-500 text-sm px-3 py-1">Low Stock</Badge>;
    }
    return <Badge className="bg-emerald-500 text-sm px-3 py-1">In Stock</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-amber-600" />
            Item Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Image Section */}
          <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
            {item.image_url ? (
              <>
                <img
                  src={item.image_url}
                  alt={item.item_name}
                  className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => onViewFullImage(item.image_url!)}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-2 right-2 gap-1 bg-white/90 hover:bg-white"
                  onClick={() => onViewFullImage(item.image_url!)}
                >
                  <ImageIcon className="h-4 w-4" />
                  View Full Image
                </Button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <Package className="h-16 w-16 mb-2 opacity-30" />
                <span className="text-sm">No image available</span>
              </div>
            )}
            
            {/* Stock Badge on Image */}
            <div className="absolute top-3 left-3">
              {getStockBadge()}
            </div>
          </div>

          {/* Item Info */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{item.item_name}</h2>
              <p className="text-muted-foreground font-mono">{item.item_number}</p>
            </div>

            {/* Quantity Display */}
            <div className="flex items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Current Stock</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'text-4xl font-bold',
                    isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-foreground'
                  )}>
                    {item.quantity}
                  </span>
                  <span className="text-lg text-muted-foreground">{item.unit || 'pcs'}</span>
                </div>
              </div>
              
              {item.min_quantity !== undefined && item.min_quantity > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Minimum</p>
                  <span className={cn(
                    'text-2xl font-semibold',
                    isLowStock ? 'text-amber-600' : 'text-muted-foreground'
                  )}>
                    {item.min_quantity}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {canManage && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="h-14 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    onStockIn();
                  }}
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-base">Stock In</span>
                </Button>
                <Button
                  className="h-14 bg-orange-500 hover:bg-orange-600 text-white gap-2"
                  disabled={item.quantity === 0}
                  onClick={() => {
                    onOpenChange(false);
                    onStockOut();
                  }}
                >
                  <Minus className="h-5 w-5" />
                  <span className="text-base">Stock Out</span>
                </Button>
              </div>
            )}

            <Separator />

            {/* Location Breadcrumb */}
            {locationPath.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location
                </h3>
                <div className="flex items-center flex-wrap gap-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  {locationPath.map((loc, index) => (
                    <div key={loc.id} className="flex items-center">
                      {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "gap-1",
                          loc.type === 'classification' 
                            ? "border-amber-500/50 bg-amber-50 dark:bg-amber-900/20" 
                            : "border-blue-500/50 bg-blue-50 dark:bg-blue-900/20"
                        )}
                      >
                        {loc.type === 'classification' ? (
                          <Layers className="h-3 w-3 text-amber-600" />
                        ) : (
                          <FolderOpen className="h-3 w-3 text-blue-600" />
                        )}
                        {loc.name}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                <p className="text-sm">{item.description}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>ID: </span>
                <span className="font-mono text-foreground truncate">{item.id.slice(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Box className="h-4 w-4" />
                <span>Unit: </span>
                <span className="text-foreground">{item.unit || 'pcs'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created: </span>
                <span className="text-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Updated: </span>
                <span className="text-foreground">{new Date(item.updated_at).toLocaleDateString()}</span>
              </div>
            </div>

            <Separator />

            {/* Management Actions */}
            {canManage && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit();
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit Item
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => {
                    onOpenChange(false);
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Item
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
