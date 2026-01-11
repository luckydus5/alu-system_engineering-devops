import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PackagePlus, PackageMinus, Loader2, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';
import { cn } from '@/lib/utils';

export type TransactionType = 'stock_in' | 'stock_out';

export interface StockTransaction {
  item_id: string;
  type: TransactionType;
  quantity: number;
  reason: string;
  reference?: string;
  notes?: string;
}

interface StockTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  onSubmit: (transaction: StockTransaction) => Promise<boolean>;
  defaultType?: TransactionType;
}

const stockOutReasons = [
  { value: 'issued', label: 'Issued to Department' },
  { value: 'project', label: 'Used for Project' },
  { value: 'damaged', label: 'Damaged/Broken' },
  { value: 'expired', label: 'Expired' },
  { value: 'lost', label: 'Lost/Missing' },
  { value: 'returned_supplier', label: 'Returned to Supplier' },
  { value: 'transfer', label: 'Transfer to Another Location' },
  { value: 'other', label: 'Other' },
];

const stockInReasons = [
  { value: 'purchase', label: 'New Purchase' },
  { value: 'return', label: 'Returned Item' },
  { value: 'transfer', label: 'Transfer from Another Location' },
  { value: 'found', label: 'Found/Recovered' },
  { value: 'donation', label: 'Donation' },
  { value: 'adjustment', label: 'Inventory Adjustment' },
  { value: 'other', label: 'Other' },
];

export function StockTransactionDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  defaultType = 'stock_in',
}: StockTransactionDialogProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update type when defaultType changes (dialog reopens)
  useState(() => {
    setType(defaultType);
  });

  const reasons = type === 'stock_in' ? stockInReasons : stockOutReasons;
  const maxQuantity = type === 'stock_out' ? item?.quantity || 0 : 99999;
  const isOverLimit = type === 'stock_out' && quantity > (item?.quantity || 0);

  const handleSubmit = async () => {
    if (!item || !reason || quantity < 1 || isOverLimit) return;

    setIsSubmitting(true);
    const success = await onSubmit({
      item_id: item.id,
      type,
      quantity,
      reason,
      reference: reference || undefined,
      notes: notes || undefined,
    });

    if (success) {
      // Reset form
      setQuantity(0);
      setReason('');
      setReference('');
      setNotes('');
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setReason(''); // Reset reason when type changes
    setQuantity(0);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setQuantity(0);
      setReason('');
      setReference('');
      setNotes('');
      // Reset to defaultType when closing
      setType(defaultType);
    }
    onOpenChange(open);
  };

  // Reset type when dialog opens with a new defaultType
  if (open && type !== defaultType && quantity === 0 && !reason) {
    setType(defaultType);
  }

  if (!item) return null;

  const newQuantity = type === 'stock_in' 
    ? item.quantity + quantity 
    : item.quantity - quantity;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            {type === 'stock_in' ? (
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <PackagePlus className="h-5 w-5 text-emerald-600" />
              </div>
            ) : (
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <PackageMinus className="h-5 w-5 text-red-600" />
              </div>
            )}
            <span>{item.item_name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item Info - Compact */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-muted-foreground">Item #</span>
                <span className="font-mono font-semibold ml-1">{item.item_number}</span>
              </div>
              <div className="border-l border-slate-300 dark:border-slate-600 pl-4">
                <span className="text-muted-foreground">Stock:</span>
                <Badge 
                  variant={item.quantity === 0 ? 'destructive' : item.quantity < 10 ? 'outline' : 'default'}
                  className="ml-1"
                >
                  {item.quantity}
                </Badge>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{item.location}</span>
          </div>

          {/* Transaction Type - Compact */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('stock_in')}
              className={cn(
                'p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2',
                type === 'stock_in'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
              )}
            >
              <PackagePlus className={cn(
                'h-5 w-5',
                type === 'stock_in' ? 'text-emerald-600' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'font-semibold text-sm',
                type === 'stock_in' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
              )}>
                Stock In
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('stock_out')}
              className={cn(
                'p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2',
                type === 'stock_out'
                  ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                  : 'border-slate-200 dark:border-slate-700 hover:border-red-300'
              )}
            >
              <PackageMinus className={cn(
                'h-5 w-5',
                type === 'stock_out' ? 'text-red-600' : 'text-muted-foreground'
              )} />
              <span className={cn(
                'font-semibold text-sm',
                type === 'stock_out' ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'
              )}>
                Stock Out
              </span>
            </button>
          </div>

          {/* Quantity - Compact with inline balance */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label htmlFor="quantity" className="text-xs text-muted-foreground mb-1 block">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                className={cn('h-10', isOverLimit && 'border-red-500')}
              />
            </div>
            <div className="text-center pt-4">
              <span className="text-xs text-muted-foreground">→</span>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">New Balance</Label>
              <div className={cn(
                'h-10 flex items-center justify-center rounded-md font-bold text-lg',
                newQuantity <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                newQuantity < 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              )}>
                {newQuantity}
              </div>
            </div>
          </div>
          
          {isOverLimit && (
            <p className="text-xs text-red-500 flex items-center gap-1 -mt-2">
              <AlertTriangle className="h-3 w-3" />
              Max: {item.quantity} units
            </p>
          )}

          {/* Reason - Compact */}
          <div>
            <Label htmlFor="reason" className="text-xs text-muted-foreground mb-1 block">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference & Notes - Collapsible/Compact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="reference" className="text-xs text-muted-foreground mb-1 block">Reference #</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="PO-2026-001"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="notes" className="text-xs text-muted-foreground mb-1 block">Notes</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!reason || quantity < 1 || isOverLimit || isSubmitting}
            className={cn(
              'min-w-24',
              type === 'stock_in'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {type === 'stock_in' ? 'Add Stock' : 'Remove Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
