import { memo, useState, useEffect, useRef } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ui/reasoning";
import {
  StructuredReasoning,
  parseReasoningSteps,
} from "@/types/reasoning";

interface ReasoningDisplayProps {
  // Support both old and new formats for backward compatibility
  reasoning?: string | null;
  reasoningSteps?: StructuredReasoning | unknown | null;
  isStreaming?: boolean;
}

/**
 * Sanitize content to prevent XSS attacks
 * Allows basic formatting tags only
 */
function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'span', 'p', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
  });
}

/**
 * Convert structured reasoning steps into a single continuous text stream
 * This matches Claude's approach of showing one flowing thought
 */
function formatReasoningAsContinuousText(steps: StructuredReasoning): string {
  const thoughts: string[] = [];

  // Combine all items from all steps into one continuous narrative
  steps.steps.forEach((step) => {
    if (step.items && step.items.length > 0) {
      // Join items with natural flow (no bullets, no structure)
      thoughts.push(...step.items);
    }
  });

  // Join with periods for natural reading flow
  return thoughts.join(". ");
}

/**
 * ReasoningDisplay component - Claude-style character-by-character streaming
 *
 * Key features matching Claude's interface:
 * - Character-by-character text reveal in the pill (not word-by-word)
 * - NO auto-expand (users must click to see full reasoning)
 * - Continuous flowing thought text (not structured steps with bullets)
 * - Clean, readable single-line display during streaming
 */
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoning,
  reasoningSteps,
  isStreaming,
}: ReasoningDisplayProps) {
  // Character-by-character streaming state
  const [visibleChars, setVisibleChars] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasStreamingRef = useRef(false);

  // Validate and parse reasoning steps at runtime
  const validatedSteps = reasoningSteps
    ? parseReasoningSteps(reasoningSteps)
    : null;

  // Get full reasoning text as continuous string
  const fullReasoningText = validatedSteps
    ? formatReasoningAsContinuousText(validatedSteps)
    : reasoning || "";

  // Reset visible chars when starting a NEW streaming session
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      // Just started streaming - reset to 0
      setVisibleChars(0);
    }
    wasStreamingRef.current = isStreaming;
  }, [isStreaming]);

  // Character-by-character streaming effect
  useEffect(() => {
    // If not streaming or no content, show everything immediately
    if (!isStreaming || !fullReasoningText) {
      setVisibleChars(fullReasoningText.length);
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // During streaming: if we haven't revealed all chars yet, continue incrementing
    // This allows the effect to continue when new content arrives without resetting
    if (visibleChars < fullReasoningText.length) {
      // Clear any existing interval first to prevent multiple intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Start character-by-character reveal
      // Claude uses ~50-70ms per character for smooth reading
      const CHAR_DELAY_MS = 60;

      intervalRef.current = setInterval(() => {
        setVisibleChars((prev) => {
          const next = prev + 1;

          // Stop when we've revealed everything
          if (next >= fullReasoningText.length) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }

          return next;
        });
      }, CHAR_DELAY_MS);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isStreaming, fullReasoningText, visibleChars]);

  // Get currently visible text for the pill (truncated if too long)
  const visibleText = fullReasoningText.slice(0, visibleChars);

  // During streaming: show actual reasoning text as it builds up (like Claude)
  // After streaming: show summary or first line
  const triggerText = isStreaming
    ? visibleText.length > 120
      ? `${visibleText.slice(0, 117)}...`
      : visibleText || "Thinking..."
    : validatedSteps?.summary || fullReasoningText.slice(0, 120) || "Show reasoning";

  // During streaming, always show the reasoning pill (even if no data yet)
  // After streaming completes, only show if we have actual reasoning data
  if (!isStreaming && !validatedSteps && !reasoning) {
    return null;
  }

  // Render using prompt-kit Reasoning component (Claude-style)
  return (
    <div className="mb-2">
      <Reasoning
        isStreaming={isStreaming}
        showTimer={isStreaming}
        className=""
      >
        <ReasoningTrigger>
          {triggerText}
          {/* Show blinking cursor during character streaming */}
          {isStreaming && visibleChars < fullReasoningText.length && (
            <span
              className="inline-block w-1 h-3 ml-0.5 bg-muted-foreground/60 animate-pulse"
              aria-hidden="true"
            />
          )}
        </ReasoningTrigger>
        <ReasoningContent
          markdown={false} // Plain text, no markdown formatting
          className="mt-2"
          contentClassName="text-sm leading-relaxed whitespace-pre-wrap"
        >
          {sanitizeContent(fullReasoningText)}
        </ReasoningContent>
      </Reasoning>
    </div>
  );
});
