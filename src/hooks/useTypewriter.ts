import { useState, useEffect, useRef } from 'react';

/**
 * Configuration for the typewriter effect
 */
interface TypewriterConfig {
  /** Characters to reveal per frame (default: 3) */
  charsPerFrame?: number;
  /** Whether the typewriter effect is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Hook that creates a typewriter effect by progressively revealing text
 * character by character using requestAnimationFrame for smooth 60fps animation.
 *
 * This is designed for streaming LLM responses where tokens (words) arrive
 * but we want to display them character-by-character for a smoother UX.
 *
 * @param targetText - The full text to reveal (typically from streaming)
 * @param config - Configuration options
 * @returns The currently revealed portion of the text
 *
 * @example
 * ```tsx
 * const streamingText = "Hello, world!"; // From streaming
 * const displayText = useTypewriter(streamingText, { charsPerFrame: 2 });
 * // displayText will gradually reveal: "H", "He", "Hel", "Hell", "Hello"...
 * ```
 */
export function useTypewriter(
  targetText: string,
  config: TypewriterConfig = {}
): string {
  const { charsPerFrame = 3, enabled = true } = config;

  // Track the currently revealed character count
  const [revealedCount, setRevealedCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const prevTargetRef = useRef(targetText);

  useEffect(() => {
    // If disabled, skip animation
    if (!enabled) return;

    // Handle target text changes
    // If target got shorter (shouldn't happen in streaming), reset
    if (targetText.length < revealedCount) {
      setRevealedCount(targetText.length);
      return;
    }

    // If target changed and we're behind, continue revealing
    // If we're caught up, no animation needed
    if (revealedCount >= targetText.length) {
      return;
    }

    // Animation loop
    const animate = () => {
      setRevealedCount(current => {
        const next = Math.min(current + charsPerFrame, targetText.length);

        // If still behind, continue animating
        if (next < targetText.length) {
          rafRef.current = requestAnimationFrame(animate);
        }

        return next;
      });
    };

    // Start animation
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetText, revealedCount, charsPerFrame, enabled]);

  // Reset when target changes significantly (new message)
  useEffect(() => {
    // If disabled, skip reset logic
    if (!enabled) return;

    // If the new target doesn't start with what we've revealed,
    // it's a completely new message - reset
    if (!targetText.startsWith(prevTargetRef.current.substring(0, revealedCount))) {
      setRevealedCount(0);
    }
    prevTargetRef.current = targetText;
  }, [targetText, revealedCount, enabled]);

  // If disabled, return full text immediately
  if (!enabled) {
    return targetText;
  }

  return targetText.substring(0, revealedCount);
}

/**
 * Variant of useTypewriter that also returns metadata about the animation state
 */
export function useTypewriterWithStatus(
  targetText: string,
  config: TypewriterConfig = {}
) {
  const displayText = useTypewriter(targetText, config);

  return {
    displayText,
    isComplete: displayText.length >= targetText.length,
    progress: targetText.length > 0 ? displayText.length / targetText.length : 1,
    remaining: targetText.length - displayText.length,
  };
}
