import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface LocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    min_items?: number;
  }) => Promise<boolean>;
  initialData?: {
    name: string;
    description?: string;
    min_items?: number;
  };
  mode?: 'create' | 'edit';
}

export function LocationDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'create',
}: LocationDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [minItems, setMinItems] = useState(initialData?.min_items || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setMinItems(initialData.min_items || 0);
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const success = await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      min_items: minItems,
    });

    if (success) {
      setName('');
      setDescription('');
      setMinItems(0);
      onOpenChange(false);
    }
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
      setMinItems(initialData?.min_items || 0);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Add Location' : 'Edit Location'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create'
                ? 'Create a new storage location (e.g., 1B02, 2A-2).'
                : 'Update the location details.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">Location Name *</Label>
              <Input
                id="location-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 1B02"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-description">Description</Label>
              <Textarea
                id="location-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this location..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-items">Minimum Items Required</Label>
              <Input
                id="min-items"
                type="number"
                min={0}
                value={minItems}
                onChange={(e) => setMinItems(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Alert will show when items fall below this number.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
