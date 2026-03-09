import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Check, Share, MoreVertical, PlusSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <DashboardLayout title="Install App">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-lg">
            <Smartphone className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Install HQ Power</h1>
          <p className="text-muted-foreground">
            Get quick access to the app from your home screen
          </p>
        </div>

        {/* Status Card */}
        {isInstalled ? (
          <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">
                App Installed!
              </h2>
              <p className="text-green-600 dark:text-green-500 mt-1">
                HQ Power is installed on your device
              </p>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Button size="lg" onClick={handleInstall} className="gap-2">
                <Download className="h-5 w-5" />
                Install Now
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Click to add HQ Power to your home screen
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* iOS Instructions */}
            {isIOS && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Install on iPhone/iPad</CardTitle>
                  <CardDescription>Follow these steps in Safari</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap the Share button</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Look for the <Share className="h-4 w-4" /> icon at the bottom
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap "Add to Home Screen"</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Look for <PlusSquare className="h-4 w-4" /> Add to Home Screen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap "Add"</p>
                      <p className="text-sm text-muted-foreground">
                        The app icon will appear on your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Instructions */}
            {isAndroid && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Install on Android</CardTitle>
                  <CardDescription>Follow these steps in Chrome</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap the menu button</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Look for <MoreVertical className="h-4 w-4" /> in the top right
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap "Install app" or "Add to Home screen"</p>
                      <p className="text-sm text-muted-foreground">
                        You may see an install banner at the bottom too
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Tap "Install"</p>
                      <p className="text-sm text-muted-foreground">
                        The app will be added to your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generic Instructions for Desktop */}
            {!isIOS && !isAndroid && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Install on Desktop</CardTitle>
                  <CardDescription>Add to your desktop for quick access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Look for the install icon in your browser's address bar, or check the browser menu for "Install HQ Power" option.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why Install?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                'Quick access from your home screen',
                'Works offline for basic features',
                'Faster loading times',
                'Full screen experience',
                'Receive notifications'
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm">{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
