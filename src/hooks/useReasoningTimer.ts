import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for reasoning timer
 * Tracks elapsed time during reasoning process
 *
 * @param isActive - Whether the timer should be running
 * @returns Formatted time string (e.g., "2s", "1m 23s")
 */
export function useReasoningTimer(isActive: boolean): string {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Timer stopped - clear interval but PRESERVE displayed value
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // DON'T reset elapsedSeconds - keep the final time displayed
      // Reset start time so next activation starts fresh
      startTimeRef.current = null;
      return;
    }

    // Start new timer session - reset to 0 when becoming active
    // This happens when isActive changes from false to true
    startTimeRef.current = Date.now();
    setElapsedSeconds(0);

    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000));
        setElapsedSeconds(elapsed);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive]);

  // Format time string
  if (elapsedSeconds === 0) {
    return '';
  }

  if (elapsedSeconds < 60) {
    return `${elapsedSeconds}s`;
  }

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `${minutes}m ${seconds}s`;
}
