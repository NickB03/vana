import { useEffect, useRef, useState } from 'react';

/**
 * Throttles a rapidly changing value to update at most once per delay period
 * Useful for performance optimization of frequently updating values like scroll position
 *
 * @param value - The value to throttle
 * @param delay - Minimum time in milliseconds between updates (default: 16ms for ~60fps)
 * @returns The throttled value
 *
 * @example
 * ```tsx
 * const [scrollY, setScrollY] = useState(0);
 * const throttledScrollY = useThrottle(scrollY, 16); // Updates at most 60 times per second
 *
 * useEffect(() => {
 *   const handleScroll = () => setScrollY(window.scrollY);
 *   window.addEventListener('scroll', handleScroll);
 *   return () => window.removeEventListener('scroll', handleScroll);
 * }, []);
 * ```
 */
export function useThrottle<T>(value: T, delay: number = 16): T {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const timeRemaining = delay - (Date.now() - lastRan.current);

    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, Math.max(0, timeRemaining));

    return () => clearTimeout(handler);
  }, [value, delay]);

  return throttledValue;
}
