import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone, Share, PlusSquare, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Detect platform
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const android = /Android/.test(ua);
    const mobile = ios || android || window.innerWidth < 768;
    
    setIsIOS(ios);
    setIsAndroid(android);
    setIsMobile(mobile);

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // For iOS and Android without native prompt, show our custom prompt after delay
    if (mobile && !isStandalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000); // Show after 2 seconds
      
      return () => clearTimeout(timer);
    }

    // Listen for install prompt (works on Android Chrome, Edge, etc.)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt when we have the deferred prompt
      setTimeout(() => setShowPrompt(true), 1500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if installed, dismissed, or not on mobile
  if (isInstalled || dismissed || !showPrompt || !isMobile) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className={cn(
          "w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden",
          "animate-in slide-in-from-bottom-5 duration-300"
        )}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <Smartphone className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Install HQ Power</h2>
              <p className="text-amber-100 text-sm">Get the app on your phone</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* If we have native install prompt (Android Chrome) */}
          {deferredPrompt ? (
            <>
              <p className="text-muted-foreground text-sm text-center">
                Install HQ Power for quick access, offline support, and a better experience!
              </p>
              <Button 
                onClick={handleInstall} 
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white h-12 text-base"
              >
                <Download className="h-5 w-5" />
                Install App Now
              </Button>
            </>
          ) : isIOS ? (
            <>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Follow these steps to install:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tap the Share button</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Share className="h-3 w-3" /> at the bottom of Safari
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tap "Add to Home Screen"</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <PlusSquare className="h-3 w-3" /> Scroll down if needed
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tap "Add" to confirm</p>
                    <p className="text-xs text-muted-foreground">App icon appears on home screen</p>
                  </div>
                </div>
              </div>
            </>
          ) : isAndroid ? (
            <>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Follow these steps to install:
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tap the menu button</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MoreVertical className="h-3 w-3" /> Three dots in top right
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tap "Install app"</p>
                    <p className="text-xs text-muted-foreground">Or "Add to Home screen"</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Tap "Install" to confirm</p>
                    <p className="text-xs text-muted-foreground">App will be added to your phone</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm text-center">
              Check your browser menu for "Install" or "Add to Home Screen" option.
            </p>
          )}

          {/* Benefits */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              ✓ Quick access &nbsp; ✓ Works offline &nbsp; ✓ Full screen
            </p>
          </div>

          {/* Dismiss button */}
          <Button 
            variant="ghost" 
            onClick={handleDismiss}
            className="w-full text-muted-foreground"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
