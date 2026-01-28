import { useState, useEffect, useRef } from 'react';

/**
 * Prevents skeleton "flash" by ensuring loading state displays for a minimum time.
 *
 * Problem: When data loads very quickly (< 100ms), the skeleton appears and
 * disappears so fast it creates a jarring flash. This hook ensures the loading
 * state is shown for at least `minTime` milliseconds.
 *
 * @param isLoading - The actual loading state from data fetching
 * @param minTime - Minimum display time in milliseconds (default: 300ms)
 * @returns Whether to show the loading skeleton
 *
 * @example
 * const { isLoading } = useQuery(...);
 * const showSkeleton = useMinimumLoadingTime(isLoading, 300);
 *
 * return showSkeleton ? <Skeleton /> : <Content />;
 */
export const useMinimumLoadingTime = (isLoading: boolean, minTime = 300): boolean => {
  const [showLoading, setShowLoading] = useState(isLoading);
  const loadingStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Loading started - record the time and show loading state
      loadingStartRef.current = Date.now();
      setShowLoading(true);
    } else if (loadingStartRef.current !== null) {
      // Loading finished - ensure minimum display time
      const elapsed = Date.now() - loadingStartRef.current;
      const remaining = Math.max(0, minTime - elapsed);

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false);
          loadingStartRef.current = null;
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        setShowLoading(false);
        loadingStartRef.current = null;
      }
    }
  }, [isLoading, minTime]);

  return showLoading;
};
