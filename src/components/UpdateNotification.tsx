import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * UpdateNotification Component
 * 
 * Displays a notification when a new version of the app is available.
 * Allows users to reload to get the latest version.
 * 
 * Integrates with service worker update detection to notify users
 * of new deployments.
 */
export function UpdateNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    let registration: ServiceWorkerRegistration | null = null;

    const handleUpdateFound = () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker is ready and there's an active controller
          // This means an update is available
          setIsVisible(true);
          console.log('🔄 Update available - showing notification');
        }
      });
    };

    const setupServiceWorkerListener = async () => {
      try {
        registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.addEventListener('updatefound', handleUpdateFound);
          
          // Check for updates every 30 seconds
          const interval = setInterval(async () => {
            try {
              await registration?.update();
            } catch (error) {
              console.error('Error checking for updates:', error);
            }
          }, 30000);

          return () => {
            clearInterval(interval);
            registration?.removeEventListener('updatefound', handleUpdateFound);
          };
        }
      } catch (error) {
        console.error('Service Worker setup error:', error);
      }
    };

    setupServiceWorkerListener();
  }, []);

  const handleReload = () => {
    setIsReloading(true);
    
    // Signal service worker to skip waiting
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    // Reload after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100">
              Update Available
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
              A new version of the app is ready. Reload to get the latest features and improvements.
            </p>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100 flex-shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleReload}
            disabled={isReloading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
          >
            {isReloading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reloading...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Now
              </>
            )}
          </Button>
          
          <Button
            onClick={() => setIsVisible(false)}
            variant="outline"
            size="sm"
            className="border-blue-200 dark:border-blue-800"
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}

