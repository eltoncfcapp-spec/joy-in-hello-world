import { useState, useEffect } from 'react';
import { Download, Smartphone, Share, MoreVertical, Plus, Check } from 'lucide-react';
import churchLogo from '@/assets/church-logo.png';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Detect device
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

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

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg">
            <img src={churchLogo} alt="CFC" className="w-full h-full object-cover" />
          </div>
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">App Installed!</h1>
          <p className="text-muted-foreground">
            Christian Family Church app is now installed on your device. You can access it from your home screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden shadow-lg">
            <img src={churchLogo} alt="CFC" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Install CFC App</h1>
          <p className="text-muted-foreground">
            Get quick access to Christian Family Church right from your home screen
          </p>
        </div>

        {/* Android with prompt available */}
        {deferredPrompt && (
          <button
            onClick={handleInstall}
            className="w-full bg-primary text-primary-foreground py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors mb-6"
          >
            <Download className="w-6 h-6" />
            Install App Now
          </button>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              How to Install on iPhone/iPad:
            </h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">1</span>
                <div>
                  <p className="text-foreground">Tap the <strong>Share</strong> button</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                    <Share className="w-5 h-5" />
                    <span>at the bottom of Safari</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">2</span>
                <div>
                  <p className="text-foreground">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                    <Plus className="w-5 h-5" />
                    <span>Add to Home Screen</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">3</span>
                <div>
                  <p className="text-foreground">Tap <strong>"Add"</strong> in the top right corner</p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Android Instructions (when no prompt) */}
        {isAndroid && !deferredPrompt && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              How to Install on Android:
            </h2>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">1</span>
                <div>
                  <p className="text-foreground">Tap the <strong>menu button</strong></p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                    <MoreVertical className="w-5 h-5" />
                    <span>three dots at top right of Chrome</span>
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">2</span>
                <div>
                  <p className="text-foreground">Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 text-sm font-bold">3</span>
                <div>
                  <p className="text-foreground">Tap <strong>"Install"</strong> to confirm</p>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Desktop fallback */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <div className="text-center text-muted-foreground">
            <p>Open this page on your phone to install the app, or look for the install icon in your browser's address bar.</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <h3 className="font-semibold text-foreground mb-3">Benefits of installing:</h3>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Quick access from home screen
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Works offline
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Receive notifications
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              No app store needed
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Install;
