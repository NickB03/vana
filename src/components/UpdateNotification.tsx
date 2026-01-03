import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { clearCachesAndReload } from '@/utils/cacheBusting';
import { logError } from '@/utils/errorLogging';

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
  const reloadTriggeredRef = useRef(false);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const triggerReload = useCallback(async (reason: string) => {
    if (reloadTriggeredRef.current) return;
    reloadTriggeredRef.current = true;
    setIsReloading(true);
    console.log(`🔁 Enforcing immediate update: ${reason}`);
    await clearCachesAndReload(reason);
  }, []);

  const activateAndReload = useCallback((worker: ServiceWorker | null, reason: string) => {
    if (!worker) return;
    // Skip waiting and force the new service worker to take control
    try {
      worker.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        errorId: 'SERVICE_WORKER_POST_MESSAGE_FAILED',
        metadata: { reason },
      });
    }
    // Fallback: if controllerchange doesn't fire quickly, reload anyway
    if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    reloadTimeoutRef.current = setTimeout(() => triggerReload(`${reason}-timeout`), 400);
  }, [triggerReload]);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let registration: ServiceWorkerRegistration | null = null;

    const handleUpdateFound = () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker is ready and there's an active controller
          setIsVisible(true);
          setIsReloading(true);
          console.log('🔄 Update available - forcing immediate reload');
          activateAndReload(newWorker, 'updatefound-installed');
        }
      });
    };

    const checkExistingWaitingWorker = (reg: ServiceWorkerRegistration | null) => {
      if (reg?.waiting) {
        setIsVisible(true);
        setIsReloading(true);
        console.log('🆕 Waiting service worker detected - forcing reload');
        activateAndReload(reg.waiting, 'existing-waiting');
      }
    };

    const setup = async () => {
      try {
        registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          registration.addEventListener('updatefound', handleUpdateFound);

          // Force an immediate update check on page load
          try {
            await registration.update();
          } catch (error) {
            logError(error instanceof Error ? error : new Error(String(error)), {
              errorId: 'SERVICE_WORKER_UPDATE_CHECK_FAILED',
              metadata: { phase: 'initial-check' },
            });
          }

          // If a waiting worker is already present (user returned to stale tab), upgrade immediately
          checkExistingWaitingWorker(registration);

          // Check for updates every 30 seconds
          interval = setInterval(async () => {
            try {
              await registration?.update();
            } catch (error) {
              logError(error instanceof Error ? error : new Error(String(error)), {
                errorId: 'SERVICE_WORKER_UPDATE_CHECK_FAILED',
                metadata: { phase: 'interval-check' },
              });
            }
          }, 30000);
        }
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), {
          errorId: 'SERVICE_WORKER_SETUP_FAILED',
        });
      }
    };

    setup();

    // Effect cleanup - properly cleans up interval and event listener
    return () => {
      if (interval) clearInterval(interval);
      if (registration) {
        registration.removeEventListener('updatefound', handleUpdateFound);
      }
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    };
  }, [activateAndReload]);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    const handleControllerChange = () => {
      console.log('✅ New service worker controlling page - reloading now');
      triggerReload('controller-change');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [triggerReload]);

  const handleReload = async () => {
    if (reloadTriggeredRef.current) return;
    reloadTriggeredRef.current = true;
    setIsReloading(true);

    // Get registration and send to WAITING worker, not controller
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        errorId: 'SERVICE_WORKER_POST_MESSAGE_FAILED',
        metadata: { phase: 'manual-reload' },
      });
    }

    // Reload after a short delay
    setTimeout(() => {
      triggerReload('manual-reload');
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
