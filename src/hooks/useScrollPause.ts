import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useScrollPause - Detects active scrolling to pause animations
 *
 * Returns isScrolling: true while user is actively scrolling,
 * returns to false after scrolling stops (with debounce).
 *
 * Use this to pause heavy animations (particles, carousels) during scroll
 * to improve scroll performance on mobile.
 *
 * @param debounceMs - Milliseconds to wait after scroll stops before resuming (default: 150)
 * @returns { isScrolling } - Boolean indicating if user is actively scrolling
 *
 * @example
 * ```tsx
 * const { isScrolling } = useScrollPause(150);
 * return <Sparkles paused={isScrolling} />;
 * ```
 */
export function useScrollPause(debounceMs: number = 150) {
  const [isScrolling, setIsScrolling] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    setIsScrolling(true);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
      timeoutRef.current = null;
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    // Listen to scroll on window and any scrollable containers
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Also listen to touchmove for mobile scroll detection
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [handleScroll]);

  return { isScrolling };
}
