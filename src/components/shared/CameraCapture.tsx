import { Camera, X, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCameraCapture } from '@/hooks/useCameraCapture';
import { cn } from '@/lib/utils';

interface CameraCaptureProps {
  onCapture: (file: File, preview: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const {
    capturedImage,
    capturedFile,
    isCapturing,
    videoRef,
    canvasRef,
    startCamera,
    capturePhoto,
    stopCamera,
    clearCapture,
    error
  } = useCameraCapture();

  // Start camera on mount
  const handleStartCamera = async () => {
    await startCamera();
  };

  const handleRetake = async () => {
    clearCapture();
    await startCamera();
  };

  const handleConfirm = () => {
    if (capturedFile && capturedImage) {
      onCapture(capturedFile, capturedImage);
      stopCamera();
      onClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80">
        <Button variant="ghost" size="icon" onClick={handleClose} className="text-white">
          <X className="h-6 w-6" />
        </Button>
        <span className="text-white font-medium">Take Photo</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Camera View or Captured Image */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Camera className="h-16 w-16 text-white/50 mb-4" />
            <p className="text-white/80 mb-4">{error}</p>
            <Button variant="secondary" onClick={handleStartCamera}>
              Try Again
            </Button>
          </div>
        ) : capturedImage ? (
          <img 
            src={capturedImage} 
            alt="Captured" 
            className="w-full h-full object-contain"
          />
        ) : isCapturing ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Camera className="h-16 w-16 text-white/50 mb-4" />
            <p className="text-white/80 mb-4">Ready to take a photo</p>
            <Button variant="secondary" onClick={handleStartCamera}>
              Open Camera
            </Button>
          </div>
        )}
        
        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/80">
        {capturedImage ? (
          <div className="flex items-center justify-center gap-6">
            <Button
              variant="outline"
              size="lg"
              className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={handleRetake}
            >
              <RotateCcw className="h-5 w-5 mr-2" />
              Retake
            </Button>
            <Button
              size="lg"
              className="rounded-full bg-primary"
              onClick={handleConfirm}
            >
              <Check className="h-5 w-5 mr-2" />
              Use Photo
            </Button>
          </div>
        ) : isCapturing ? (
          <div className="flex items-center justify-center">
            <button
              onClick={capturePhoto}
              className={cn(
                "w-20 h-20 rounded-full",
                "bg-white border-4 border-white/50",
                "flex items-center justify-center",
                "active:scale-95 transition-transform"
              )}
            >
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
