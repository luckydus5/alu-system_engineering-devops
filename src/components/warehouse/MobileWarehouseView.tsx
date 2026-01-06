import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  PackagePlus,
  PackageMinus,
  Search,
  Grid3X3,
  List,
  Eye,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MobileWarehouseViewProps {
  items: InventoryItem[];
  onStockIn: (item: InventoryItem) => void;
  onStockOut: (item: InventoryItem) => void;
  onImagePreview: (url: string) => void;
  canManage: boolean;
}

type ViewMode = 'grid' | 'list';

export function MobileWarehouseView({
  items,
  onStockIn,
  onStockOut,
  onImagePreview,
  canManage,
}: MobileWarehouseViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const filteredItems = items.filter(
    (item) =>
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (qty: number) => {
    if (qty === 0) return { color: 'bg-red-500', text: 'Out', textColor: 'text-red-600' };
    if (qty < 10) return { color: 'bg-amber-500', text: 'Low', textColor: 'text-amber-600' };
    return { color: 'bg-emerald-500', text: 'In Stock', textColor: 'text-emerald-600' };
  };

  return (
    <div className="space-y-4">
      {/* Search and View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-white dark:bg-slate-800"
          />
        </div>
        <div className="flex rounded-xl border bg-white dark:bg-slate-800 p-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={cn(
              'h-9 w-9 rounded-lg',
              viewMode === 'grid' && 'bg-amber-500 text-white hover:bg-amber-600 hover:text-white'
            )}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('list')}
            className={cn(
              'h-9 w-9 rounded-lg',
              viewMode === 'list' && 'bg-amber-500 text-white hover:bg-amber-600 hover:text-white'
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground px-1">
        {filteredItems.length} items found
      </p>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredItems.map((item) => {
            const status = getStockStatus(item.quantity);
            return (
              <Card
                key={item.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-all border-0 shadow-md"
                onClick={() => setSelectedItem(item)}
              >
                {/* Image */}
                <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  {/* Stock indicator */}
                  <div className={cn(
                    'absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white',
                    status.color
                  )}>
                    {item.quantity}
                  </div>
                </div>
                
                {/* Info */}
                <CardContent className="p-3">
                  <p className="font-semibold text-sm truncate">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.item_number}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">{item.location}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const status = getStockStatus(item.quantity);
            return (
              <Card
                key={item.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-all"
                onClick={() => setSelectedItem(item)}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.item_name}</p>
                    <p className="text-sm text-muted-foreground">{item.item_number}</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{item.location}</span>
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-2xl font-bold', status.textColor)}>
                      {item.quantity}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        item.quantity === 0 && 'border-red-300 text-red-600',
                        item.quantity > 0 && item.quantity < 10 && 'border-amber-300 text-amber-600',
                        item.quantity >= 10 && 'border-emerald-300 text-emerald-600'
                      )}
                    >
                      {status.text}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No items found</p>
          <p className="text-sm text-muted-foreground">Try a different search</p>
        </div>
      )}

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {selectedItem && (
            <>
              {/* Image */}
              <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                {selectedItem.image_url ? (
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.item_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => {
                      onImagePreview(selectedItem.image_url!);
                      setSelectedItem(null);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-20 w-20 text-slate-400" />
                  </div>
                )}
                {/* Stock Badge */}
                <div className={cn(
                  'absolute top-4 right-4 px-3 py-1 rounded-full font-bold text-white',
                  selectedItem.quantity === 0 ? 'bg-red-500' :
                  selectedItem.quantity < 10 ? 'bg-amber-500' : 'bg-emerald-500'
                )}>
                  {selectedItem.quantity} in stock
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedItem.item_name}</h2>
                  <p className="text-muted-foreground font-mono">{selectedItem.item_number}</p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedItem.location}</span>
                </div>

                {selectedItem.quantity === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Out of Stock - Needs restocking!</span>
                  </div>
                )}

                {/* Action Buttons */}
                {canManage && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      onClick={() => {
                        onStockIn(selectedItem);
                        setSelectedItem(null);
                      }}
                      className="h-12 bg-emerald-500 hover:bg-emerald-600 rounded-xl"
                    >
                      <PackagePlus className="h-5 w-5 mr-2" />
                      Stock In
                    </Button>
                    <Button
                      onClick={() => {
                        onStockOut(selectedItem);
                        setSelectedItem(null);
                      }}
                      disabled={selectedItem.quantity === 0}
                      className="h-12 bg-orange-500 hover:bg-orange-600 rounded-xl"
                    >
                      <PackageMinus className="h-5 w-5 mr-2" />
                      Stock Out
                    </Button>
                  </div>
                )}

                {selectedItem.image_url && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onImagePreview(selectedItem.image_url!);
                      setSelectedItem(null);
                    }}
                    className="w-full h-10 rounded-xl"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Full Image
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
