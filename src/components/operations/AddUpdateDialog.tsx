import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, X, MapPin, Upload, Loader2, Tag } from 'lucide-react';
import { FieldUpdate, CreateFieldUpdateData } from '@/hooks/useFieldUpdates';
import { cn } from '@/lib/utils';

interface AddUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateFieldUpdateData, photos: File[]) => Promise<void>;
  editUpdate?: FieldUpdate | null;
  isSubmitting?: boolean;
}

export function AddUpdateDialog({
  open,
  onOpenChange,
  onSubmit,
  editUpdate,
  isSubmitting,
}: AddUpdateDialogProps) {
  const [title, setTitle] = useState(editUpdate?.title || '');
  const [description, setDescription] = useState(editUpdate?.description || '');
  const [status, setStatus] = useState<FieldUpdate['status']>(editUpdate?.status || 'active');
  const [priority, setPriority] = useState<FieldUpdate['priority']>(editUpdate?.priority || 'normal');
  const [location, setLocation] = useState(editUpdate?.location || '');
  const [tags, setTags] = useState<string[]>(editUpdate?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(editUpdate?.photos || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!editUpdate;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 10 photos total
    const remainingSlots = 10 - photoPreviews.length;
    const newFiles = files.slice(0, remainingSlots);

    setPhotos((prev) => [...prev, ...newFiles]);

    // Create previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    const isNewPhoto = index >= (editUpdate?.photos.length || 0);
    
    if (isNewPhoto) {
      const newPhotoIndex = index - (editUpdate?.photos.length || 0);
      setPhotos((prev) => prev.filter((_, i) => i !== newPhotoIndex));
    }
    
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: CreateFieldUpdateData = {
      department_id: '', // Will be set by parent
      title,
      description: description || undefined,
      status,
      priority,
      location: location || undefined,
      tags,
      photos: editUpdate?.photos.filter((p) => photoPreviews.includes(p)) || [],
    };

    await onSubmit(data, photos);
    handleClose();
  };

  const handleClose = () => {
    if (!isEdit) {
      setTitle('');
      setDescription('');
      setStatus('active');
      setPriority('normal');
      setLocation('');
      setTags([]);
      setPhotos([]);
      setPhotoPreviews([]);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEdit ? 'Edit Field Update' : 'Post Field Update'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's happening in the field?"
              required
              className="text-lg"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about the situation..."
              rows={4}
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FieldUpdate['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="issue">Issue / Problem</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as FieldUpdate['priority'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Field location, site name, etc."
                className="pl-10"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag..."
                  className="pl-10"
                />
              </div>
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photos ({photoPreviews.length}/10)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoPreviews.length >= 10}
              className="w-full h-24 border-dashed"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-8 w-8" />
                <span>Click to upload photos</span>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEdit ? 'Saving...' : 'Posting...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {isEdit ? 'Save Changes' : 'Post Update'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
