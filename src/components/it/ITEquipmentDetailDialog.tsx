import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Package,
  MapPin,
  Calendar,
  Hash,
  User,
  ArrowRight,
  Building2,
  FileText,
  Clock,
  Box,
} from 'lucide-react';
import { ITEquipmentItem } from '@/hooks/useITEquipment';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ITEquipmentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ITEquipmentItem | null;
}

export function ITEquipmentDetailDialog({
  open,
  onOpenChange,
  item,
}: ITEquipmentDetailDialogProps) {
  if (!item) return null;

  const isLowStock = item.quantity <= (item.min_quantity || 0);
  const isOutOfStock = item.quantity === 0;

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
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-blue-600" />
            IT Equipment Details
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Image Section */}
            <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.item_name}
                  className="w-full h-full object-contain"
                />
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

              <Separator />

              {/* Location Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Current Location
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1 border-blue-500/50 bg-white dark:bg-slate-800">
                      <Box className="h-3 w-3 text-blue-600" />
                      {item.classification_name || 'IT Equipment'}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className="gap-1 border-emerald-500/50 bg-white dark:bg-slate-800">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      {item.location_name || item.location || 'No specific location'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Last Transaction / Handover Info */}
              {item.last_transaction && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last Transaction
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <Badge variant="outline" className={cn(
                        item.last_transaction.transaction_type === 'stock_in' 
                          ? 'border-emerald-500 text-emerald-600'
                          : 'border-orange-500 text-orange-600'
                      )}>
                        {item.last_transaction.transaction_type === 'stock_in' ? 'Stock In' : 'Stock Out'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <span className="text-sm font-medium">
                        {format(new Date(item.last_transaction.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>

                    {item.last_transaction.handed_to_user_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Handed To:
                        </span>
                        <span className="text-sm font-medium">
                          {item.last_transaction.handed_to_user_name}
                        </span>
                      </div>
                    )}

                    {item.last_transaction.handed_to_department_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          To Department:
                        </span>
                        <Badge variant="secondary">
                          {item.last_transaction.handed_to_department_name}
                        </Badge>
                      </div>
                    )}

                    {item.last_transaction.requested_by_user_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Requested By:
                        </span>
                        <span className="text-sm font-medium">
                          {item.last_transaction.requested_by_user_name}
                        </span>
                      </div>
                    )}

                    {item.last_transaction.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Notes:</span>
                        <p className="text-sm mt-1">{item.last_transaction.notes}</p>
                      </div>
                    )}
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
                  <span className="text-foreground">{format(new Date(item.created_at), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Updated: </span>
                  <span className="text-foreground">{format(new Date(item.updated_at), 'MMM d, yyyy')}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
