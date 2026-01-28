import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Configuration for the typewriter effect
 */
interface TypewriterConfig {
  /** Base characters to reveal per frame (default: 2) */
  charsPerFrame?: number;
  /** Whether the typewriter effect is enabled (default: true) */
  enabled?: boolean;
  /** Reveal mode: 'character' for char-by-char, 'word' for word boundaries (default: 'word') */
  mode?: 'character' | 'word';
  /** Speed multiplier when catching up to streamed content (default: 1.2) */
  catchUpMultiplier?: number;
}

/**
 * Find the next word boundary position from the current position.
 * This ensures we don't cut words mid-way, which feels jarring.
 *
 * Word boundaries include: spaces, newlines, punctuation followed by space.
 */
function findNextWordBoundary(text: string, currentPos: number, minChars: number): number {
  const targetPos = currentPos + minChars;

  // If we'd exceed text length, just return text length
  if (targetPos >= text.length) {
    return text.length;
  }

  // Look ahead for next word boundary (space, newline, or end of sentence)
  // Search within a reasonable window to avoid getting stuck
  const searchWindow = Math.min(20, text.length - targetPos);

  for (let i = 0; i <= searchWindow; i++) {
    const pos = targetPos + i;
    const char = text[pos];

    // Word boundaries: space, newline, or after punctuation
    if (char === ' ' || char === '\n' || char === '\t') {
      return pos + 1; // Include the space/newline
    }

    // After sentence-ending punctuation, reveal up to and including it
    if (i > 0) {
      const prevChar = text[pos - 1];
      if (prevChar === '.' || prevChar === '!' || prevChar === '?' || prevChar === ',') {
        return pos;
      }
    }
  }

  // No boundary found in window, just use target position
  return targetPos;
}

/**
 * Hook that creates a typewriter effect by progressively revealing text
 * with word-boundary awareness for smooth, natural-feeling animation.
 *
 * This is designed for streaming LLM responses where tokens (words) arrive
 * but we want to display them progressively for a smoother UX.
 *
 * Key improvements over basic char-by-char:
 * - Word boundary detection: Never cuts mid-word ("Hel" → "Hello")
 * - Adaptive speed: Catches up faster when behind, slows down when close
 * - Natural rhythm: Respects punctuation and sentence boundaries
 *
 * @param targetText - The full text to reveal (typically from streaming)
 * @param config - Configuration options
 * @returns The currently revealed portion of the text
 *
 * @example
 * ```tsx
 * const streamingText = "Hello, world!"; // From streaming
 * const displayText = useTypewriter(streamingText, { charsPerFrame: 2 });
 * // Reveals: "Hello, " → "Hello, world!" (word boundaries)
 * ```
 */
export function useTypewriter(
  targetText: string,
  config: TypewriterConfig = {}
): string {
  const {
    charsPerFrame = 2,
    enabled = true,
    mode = 'word',
    catchUpMultiplier = 1.2
  } = config;

  // Track the currently revealed character count
  const [revealedCount, setRevealedCount] = useState(0);
  const revealedCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const prevTargetRef = useRef(targetText);
  // Track if animation was ever enabled (to differentiate new streaming from completed messages)
  const wasEverEnabledRef = useRef(enabled);

  // Update wasEverEnabled if currently enabled
  if (enabled) {
    wasEverEnabledRef.current = true;
  }

  useEffect(() => {
    revealedCountRef.current = revealedCount;
  }, [revealedCount]);

  useEffect(() => {
    // CRITICAL: Animation continues UNTIL fully revealed, regardless of enabled flag
    // This is the key difference from the broken implementation:
    // - Once animation starts (wasEverEnabled=true), it MUST complete
    // - The enabled flag only controls whether NEW animations start
    // - This prevents the text jump when streaming ends mid-animation

    // If we're fully caught up, no animation needed
    if (revealedCountRef.current >= targetText.length) {
      return;
    }

    // Only start NEW animations if enabled OR if we're finishing an existing animation
    const shouldAnimate = enabled || wasEverEnabledRef.current;
    if (!shouldAnimate) return;

    // Handle target text shrinking (shouldn't happen in streaming, but be defensive)
    if (targetText.length < revealedCountRef.current) {
      setRevealedCount(targetText.length);
      progressRef.current = 0;
      lastTimeRef.current = null;
      return;
    }

    // SAFETY: Cancel any existing RAF before starting new one to prevent multiple loops
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;

    // Animation loop - time-based for consistent, smooth pacing
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaMs = Math.min(50, Math.max(0, timestamp - lastTimeRef.current));
      lastTimeRef.current = timestamp;

      setRevealedCount(current => {
        const remaining = targetText.length - current;
        if (remaining <= 0) {
          progressRef.current = 0;
          rafRef.current = null;
          return current;
        }

        const baseRate = charsPerFrame * 60; // chars per second
        const behindRatio = Math.min(1, remaining / 160);
        const speedMultiplier = 1 + (catchUpMultiplier - 1) * behindRatio;
        progressRef.current += (baseRate * speedMultiplier * deltaMs) / 1000;

        const step = Math.floor(progressRef.current);
        if (step <= 0) {
          rafRef.current = requestAnimationFrame(animate);
          return current;
        }
        progressRef.current -= step;

        const next = mode === 'word'
          ? findNextWordBoundary(targetText, current, step)
          : Math.min(current + step, targetText.length);

        // Continue animating if still behind, REGARDLESS of enabled flag
        // This ensures smooth completion even after streaming ends
        if (next < targetText.length) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete, clear ref
          rafRef.current = null;
        }

        return next;
      });
    };

    // Start animation
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [targetText, charsPerFrame, enabled, mode, catchUpMultiplier]);

  // Reset when target changes significantly (new message)
  useEffect(() => {
    // Skip reset logic if animation was never enabled
    if (!wasEverEnabledRef.current) return;

    // Only reset if the BEGINNING of the text changed substantially
    // This prevents false resets from minor formatting differences when
    // message transitions from streaming to saved state
    const prevStart = prevTargetRef.current.substring(0, 50).trim();
    const newStart = targetText.substring(0, 50).trim();

    // If the first 50 chars (trimmed) are completely different, it's a new message
    // Use a simple check: if new text doesn't start with first 20 chars of old, reset
    const shouldReset = prevStart.length > 0 &&
      newStart.length > 0 &&
      !newStart.startsWith(prevStart.substring(0, Math.min(20, prevStart.length)));

    if (shouldReset) {
      setRevealedCount(0);
      progressRef.current = 0;
      lastTimeRef.current = null;
      wasEverEnabledRef.current = enabled; // Reset the enabled tracking too
    }

    prevTargetRef.current = targetText;
  }, [targetText, enabled]);

  // CRITICAL FIX: Don't show full text immediately when disabled
  // Only skip animation for messages that were NEVER streaming (wasEverEnabled = false)
  // This ensures smooth completion of typewriter effect even after streaming ends
  if (!enabled && !wasEverEnabledRef.current) {
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
