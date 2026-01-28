import { useEffect, useState, useCallback } from 'react';

export interface ServiceWorkerUpdateEvent {
  isUpdateAvailable: boolean;
  newVersion?: string;
  currentVersion?: string;
}

/**
 * Hook to detect and handle service worker updates
 * 
 * Monitors for new service worker versions and provides callbacks
 * for handling update notifications and reloads.
 * 
 * Usage:
 * ```tsx
 * const { isUpdateAvailable, newVersion, reload } = useServiceWorkerUpdate();
 * 
 * if (isUpdateAvailable) {
 *   return <UpdateNotification onReload={reload} newVersion={newVersion} />;
 * }
 * ```
 */
export function useServiceWorkerUpdate() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string | undefined>();
  const [currentVersion, setCurrentVersion] = useState<string | undefined>();

  // Reload page to activate new service worker
  const reload = useCallback(() => {
    // Skip waiting and claim clients immediately
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload after a short delay to allow SW to activate
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, []);

  useEffect(() => {
    if (!navigator.serviceWorker) {
      console.warn('Service Worker not supported');
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const handleServiceWorkerUpdate = async () => {
      try {
        // Check for updates periodically
        registration = await navigator.serviceWorker.getRegistration();
        
        if (!registration) {
          console.log('No service worker registration found');
          return;
        }

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration!.installing;
          
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready, but not yet active
              // Extract version from service worker scope or use timestamp
              const newVer = new Date().toISOString();
              setNewVersion(newVer);
              setIsUpdateAvailable(true);

              // Log update availability
              console.log('🔄 Service Worker Update Available');
              console.log(`   New version: ${newVer}`);
              console.log('   Reload to activate');
            }
          });
        });

        // Check for updates every 30 seconds
        const checkInterval = setInterval(async () => {
          try {
            await registration?.update();
          } catch (error) {
            console.error('Error checking for SW updates:', error);
          }
        }, 30000);

        return () => clearInterval(checkInterval);
      } catch (error) {
        console.error('Service Worker update check failed:', error);
      }
    };

    handleServiceWorkerUpdate();
  }, []);

  return {
    isUpdateAvailable,
    newVersion,
    currentVersion,
    reload,
  };
}

/**
 * Hook to monitor service worker controller changes
 * Useful for detecting when a new SW has taken control
 */
export function useServiceWorkerController() {
  const [hasNewController, setHasNewController] = useState(false);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handleControllerChange = () => {
      console.log('✅ New Service Worker activated');
      setHasNewController(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return { hasNewController };
}

