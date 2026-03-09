import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 10));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleFitToScreen = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

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
    setPosition({ x: 0, y: 0 });
    onOpenChange(false);
  };

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for pinch-to-zoom and drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance - lastTouchDistance.current;
      const zoomDelta = delta * 0.01;
      setZoom(prev => Math.min(Math.max(prev + zoomDelta, 0.5), 10));
      lastTouchDistance.current = distance;
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    lastTouchDistance.current = null;
    setIsDragging(false);
  };

  // Double tap to zoom
  const lastTapTime = useRef(0);
  const handleDoubleTap = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300) {
      if (zoom > 1) {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      } else {
        setZoom(2.5);
      }
    }
    lastTapTime.current = now;
  };

  // Reset position when zoom changes to 1
  useEffect(() => {
    if (zoom <= 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black border-none rounded-none">
        {/* Controls - Fixed at top */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-2 sm:p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ZoomOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <span className="text-white text-xs sm:text-sm min-w-[45px] sm:min-w-[60px] text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ZoomIn className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={handleFitToScreen}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              title="Fit to screen"
            >
              <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleRotate}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleDownload}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        {/* Zoom hint for mobile */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 sm:hidden">
          <span className="text-white/60 text-xs bg-black/40 px-3 py-1.5 rounded-full">
            Pinch to zoom • Double-tap to fit
          </span>
        </div>

        {/* Image Container - Full screen */}
        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={(e) => {
            handleTouchStart(e);
            handleDoubleTap(e);
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={imageUrl}
            alt={alt}
            className={cn(
              "max-w-none select-none transition-transform duration-100",
              isDragging ? "cursor-grabbing" : zoom > 1 ? "cursor-grab" : "cursor-default"
            )}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              maxWidth: zoom <= 1 ? '100%' : 'none',
              maxHeight: zoom <= 1 ? '100%' : 'none',
              objectFit: 'contain',
            }}
            draggable={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
