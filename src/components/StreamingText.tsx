import { useState, useEffect, useRef, useMemo } from "react";
import { Markdown } from "@/components/ui/markdown";

interface StreamingTextProps {
  /** Full markdown content to reveal progressively */
  content: string;
  /** Whether streaming is active (controls animation) */
  isStreaming: boolean;
  /** Words revealed per second (default: 40) */
  speed?: number;
  /** Called when all content is revealed */
  onComplete?: () => void;
  /** CSS classes for container */
  className?: string;
}

/**
 * StreamingText - Progressive text reveal component
 *
 * Displays text word-by-word at a controlled speed, creating a "typing" effect.
 * Used during AI reasoning streaming to make the text feel more dynamic and readable.
 *
 * @example
 * ```tsx
 * <StreamingText
 *   content="Here is the **reasoning** process..."
 *   isStreaming={true}
 *   speed={40}
 * />
 * ```
 */
export function StreamingText({
  content,
  isStreaming,
  speed = 40,
  onComplete,
  className = "",
}: StreamingTextProps) {
  const [visibleTokens, setVisibleTokens] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

  // Split content into tokens (words + punctuation + whitespace)
  // This creates natural pauses at punctuation for better readability
  const tokens = useMemo(() => {
    if (!content) return [];

    // Split on word boundaries but keep punctuation attached
    // Example: "Hello, world!" → ["Hello", ",", " ", "world", "!"]
    return content.split(/(\s+|[.,!?;:])/g).filter(Boolean);
  }, [content]);

  const totalTokens = tokens.length;

  // Calculate interval delay based on speed (words per second)
  const intervalMs = useMemo(() => {
    // Convert words/sec to ms/word
    // Add slight randomness for more natural feel (-20% to +20%)
    const baseDelay = 1000 / speed;
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    return baseDelay * randomFactor;
  }, [speed]);

  // Get currently visible content
  const visibleContent = useMemo(() => {
    return tokens.slice(0, visibleTokens).join("");
  }, [tokens, visibleTokens]);

  // Progressive reveal animation
  useEffect(() => {
    // If not streaming or no content, show everything
    if (!isStreaming || !content) {
      setVisibleTokens(totalTokens);
      if (!hasCompletedRef.current && onComplete) {
        hasCompletedRef.current = true;
        onComplete();
      }
      return;
    }

    // If already showing all tokens, nothing to do
    if (visibleTokens >= totalTokens) {
      if (!hasCompletedRef.current && onComplete) {
        hasCompletedRef.current = true;
        onComplete();
      }
      return;
    }

    // Start progressive reveal
    intervalRef.current = setInterval(() => {
      setVisibleTokens((prev) => {
        const next = prev + 1;

        // Check if we've revealed everything
        if (next >= totalTokens) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (!hasCompletedRef.current && onComplete) {
            hasCompletedRef.current = true;
            onComplete();
          }
        }

        return next;
      });
    }, intervalMs);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isStreaming, content, totalTokens, visibleTokens, intervalMs, onComplete]);

  // Reset when content changes
  useEffect(() => {
    setVisibleTokens(0);
    hasCompletedRef.current = false;
  }, [content]);

  // If no content, render nothing
  if (!content) {
    return null;
  }

  // If streaming complete or very short content, show all immediately
  if (!isStreaming || totalTokens <= 3) {
    return (
      <div className={className}>
        <Markdown>{content}</Markdown>
      </div>
    );
  }

  // Progressive reveal with markdown
  return (
    <div className={className} aria-live="polite" aria-atomic="false">
      <Markdown>{visibleContent}</Markdown>
      {/* Blinking cursor during streaming */}
      {visibleTokens < totalTokens && (
        <span
          className="inline-block w-1 h-4 ml-0.5 bg-primary/70 animate-pulse"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
