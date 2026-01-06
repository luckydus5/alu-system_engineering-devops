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

interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    item_number: string;
    item_name: string;
    quantity: number;
    location: string;
  }) => void;
}

export function AddInventoryDialog({ open, onOpenChange, onSubmit }: AddInventoryDialogProps) {
  const [formData, setFormData] = useState({
    item_number: '',
    item_name: '',
    quantity: 0,
    location: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      item_number: '',
      item_name: '',
      quantity: 0,
      location: '',
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({
      item_number: '',
      item_name: '',
      quantity: 0,
      location: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>
            Add a new item to the warehouse inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="item_number">Item Number</Label>
              <Input
                id="item_number"
                placeholder="e.g., ITM-001"
                value={formData.item_number}
                onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item_name">Item Name</Label>
              <Input
                id="item_name"
                placeholder="e.g., Industrial Pump"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Aisle 3, Shelf B"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
