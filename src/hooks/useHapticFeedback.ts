import { useCallback } from 'react';
import { useIsMobile } from './use-mobile';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Custom hook for haptic feedback on mobile devices
 *
 * Provides native-like tactile responses for key mobile interactions.
 * Uses the Vibration API for cross-platform support.
 *
 * @returns {Object} - Object with trigger function
 *
 * @example
 * const { trigger } = useHapticFeedback();
 *
 * // Light tap
 * trigger('light');
 *
 * // Success confirmation
 * trigger('success');
 */
export function useHapticFeedback() {
  const isMobile = useIsMobile();

  const trigger = useCallback((style: HapticStyle = 'light') => {
    // Only trigger on mobile devices
    if (!isMobile) return;

    // Check if Vibration API is available (iOS Safari 13+, most Android browsers)
    if (!('vibrate' in navigator)) return;

    // Vibration patterns (in milliseconds)
    // Single number = vibrate duration
    // Array = [vibrate, pause, vibrate, pause, ...]
    const patterns: Record<HapticStyle, number | number[]> = {
      light: 10,         // Quick tap
      medium: 20,        // Standard button press
      heavy: 30,         // Significant action
      selection: 10,     // Selection/toggle
      success: [10, 50, 10],   // Success confirmation (double tap)
      warning: [20, 100, 20],  // Warning alert
      error: [50, 100, 50]     // Error state (strong double tap)
    };

    try {
      navigator.vibrate(patterns[style]);
    } catch (error) {
      // Silently fail if vibration is not supported or blocked
      console.debug('Haptic feedback not supported:', error);
    }
  }, [isMobile]);

  return { trigger };
}
