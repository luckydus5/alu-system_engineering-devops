import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  alt?: string;
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  alt = 'Image preview',
}: ImagePreviewDialogProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${Date.now()}.${blob.type.split('/')[1] || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    onOpenChange(false);
  };

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none">
        {/* Controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomOut}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="text-white text-sm min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleZoomIn}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleRotate}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <RotateCw className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleDownload}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleClose}
            className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Image Container */}
        <div className="flex items-center justify-center min-h-[80vh] p-8 overflow-auto">
          <img
            src={imageUrl}
            alt={alt}
            className={cn(
              "max-w-full max-h-[80vh] object-contain transition-transform duration-300 cursor-move"
            )}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
