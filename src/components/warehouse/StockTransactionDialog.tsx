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
}: StockTransactionDialogProps) {
  const [type, setType] = useState<TransactionType>('stock_out');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setQuantity(1);
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
    setQuantity(1);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setQuantity(1);
      setReason('');
      setReference('');
      setNotes('');
      setType('stock_out');
    }
    onOpenChange(open);
  };

  if (!item) return null;

  const newQuantity = type === 'stock_in' 
    ? item.quantity + quantity 
    : item.quantity - quantity;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'stock_in' ? (
              <PackagePlus className="h-5 w-5 text-emerald-600" />
            ) : (
              <PackageMinus className="h-5 w-5 text-red-600" />
            )}
            Stock Transaction
          </DialogTitle>
          <DialogDescription>
            Record stock movement for <span className="font-semibold">{item.item_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Item Info */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Item Number:</span>
              <span className="font-mono font-semibold">{item.item_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Current Stock:</span>
              <Badge variant={item.quantity === 0 ? 'destructive' : item.quantity < 10 ? 'outline' : 'default'}>
                {item.quantity} units
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Location:</span>
              <span className="text-sm">{item.location}</span>
            </div>
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleTypeChange('stock_in')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2',
                  type === 'stock_in'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-muted hover:border-emerald-300'
                )}
              >
                <PackagePlus className={cn(
                  'h-8 w-8',
                  type === 'stock_in' ? 'text-emerald-600' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'font-semibold',
                  type === 'stock_in' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'
                )}>
                  Stock In
                </span>
                <span className="text-xs text-muted-foreground">Add to inventory</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('stock_out')}
                className={cn(
                  'p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2',
                  type === 'stock_out'
                    ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'border-muted hover:border-red-300'
                )}
              >
                <PackageMinus className={cn(
                  'h-8 w-8',
                  type === 'stock_out' ? 'text-red-600' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'font-semibold',
                  type === 'stock_out' ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'
                )}>
                  Stock Out
                </span>
                <span className="text-xs text-muted-foreground">Remove from inventory</span>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <div className="flex items-center gap-3">
              <Input
                id="quantity"
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className={cn('w-32', isOverLimit && 'border-red-500')}
              />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">New Balance:</span>
                <Badge
                  variant={newQuantity <= 0 ? 'destructive' : newQuantity < 10 ? 'outline' : 'default'}
                  className="text-base px-3 py-1"
                >
                  {newQuantity} units
                </Badge>
              </div>
            </div>
            {isOverLimit && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Cannot exceed current stock ({item.quantity} units)
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
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

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="reference">Reference Number (Optional)</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g., PO-2026-001, REQ-123"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details about this transaction..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || quantity < 1 || isOverLimit || isSubmitting}
            className={cn(
              type === 'stock_in'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-red-600 hover:bg-red-700'
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {type === 'stock_in' ? 'Stock In' : 'Stock Out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
