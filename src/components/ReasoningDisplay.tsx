import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import {
  StructuredReasoning,
  parseReasoningSteps,
  ReasoningStep,
} from "@/types/reasoning";
import { Clock, ChevronDown, Square } from "lucide-react";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { useReasoningTimer } from "@/hooks/useReasoningTimer";

interface ReasoningDisplayProps {
  // Support both old and new formats for backward compatibility
  reasoning?: string | null;
  reasoningSteps?: StructuredReasoning | unknown | null;
  /** Raw reasoning text being streamed from GLM (native thinking mode) */
  streamingReasoningText?: string | null;
  isStreaming?: boolean;
  /** Callback when user clicks stop button during streaming */
  onStop?: () => void;
}

/**
 * Animation timing constants
 */
const ANIMATION = {
  CROSSFADE_DURATION_MS: 150,
} as const;

/**
 * Sanitize content to prevent XSS attacks
 */
function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'span', 'p', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
  });
}

/**
 * Detect if a string is a list item (bullet or numbered)
 */
function isListItem(item: string): boolean {
  return /^[-*•]\s/.test(item) || /^\d+[.)]\s/.test(item);
}

/**
 * Strip list prefix from item
 */
function stripListPrefix(item: string): string {
  return item.replace(/^[-*•\d+.)]\s*/, '');
}

/**
 * ReasoningDisplay component - Claude-style ticker pill with "Thought process" expansion
 *
 * Key features based on Claude screenshots:
 * - During streaming: Shows live status updates ("Thinking..." → "Scrutinizing..." → "Interrogated...")
 * - After streaming (collapsed): Shows LAST status update + timer
 * - After streaming (expanded): Label changes to "Thought process", background lightens, shows FULL reasoning
 * - Timer persists and shows clock icon
 */
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoning,
  reasoningSteps,
  streamingReasoningText,
  isStreaming,
  onStop,
}: ReasoningDisplayProps) {
  // Expand/collapse state
  const [isExpanded, setIsExpanded] = useState(false);
  // Current section being displayed (0-indexed)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  // Animation state for crossfade
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Store final elapsed time when streaming ends
  const [finalElapsedTime, setFinalElapsedTime] = useState<string>("");

  // Track all active timeouts for proper cleanup
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const wasStreamingRef = useRef(false);
  // Track the previous step count to detect new steps arriving
  const prevStepCountRef = useRef(0);
  // Track the last valid thinking text to prevent flickering
  const lastThinkingTextRef = useRef<string>("Thinking...");
  // Track when the pill label was last updated for throttling
  const lastUpdateTimestampRef = useRef<number>(0);

  // Timer for reasoning duration (Claude-style)
  const elapsedTime = useReasoningTimer(isStreaming ?? false);

  // Capture final elapsed time when streaming ends
  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming && elapsedTime) {
      setFinalElapsedTime(elapsedTime);
    }
    wasStreamingRef.current = isStreaming ?? false;
  }, [isStreaming, elapsedTime]);

  // Validate and parse reasoning steps
  const validatedSteps = useMemo(() => {
    return reasoningSteps ? parseReasoningSteps(reasoningSteps) : null;
  }, [reasoningSteps]);

  // Pre-sanitize all content to avoid redundant DOMPurify calls on each render
  const sanitizedSteps = useMemo(() => {
    if (!validatedSteps) return null;
    return {
      ...validatedSteps,
      steps: validatedSteps.steps.map(step => ({
        ...step,
        title: sanitizeContent(step.title),
        items: step.items.map(item => sanitizeContent(item)),
      })),
    };
  }, [validatedSteps]);

  // Memoize sanitized fallback reasoning
  const sanitizedReasoning = useMemo(() => {
    return reasoning ? sanitizeContent(reasoning) : null;
  }, [reasoning]);

  // Sanitize streaming reasoning text (GLM native thinking)
  const sanitizedStreamingText = useMemo(() => {
    return streamingReasoningText ? sanitizeContent(streamingReasoningText) : null;
  }, [streamingReasoningText]);

  // Parse status history from streaming text
  const statusHistory = useMemo(() => {
    if (!streamingReasoningText) return [];
    // Split by newlines and filter for valid status updates
    return streamingReasoningText
      .split('\n')
      .map(line => line.trim())
      .filter(isValidStatus);
  }, [streamingReasoningText]);

  // Check if we have GLM native streaming text (prioritize over structured reasoning)
  const hasStreamingText = Boolean(streamingReasoningText && streamingReasoningText.length > 0);

  const totalSections = validatedSteps?.steps.length ?? 0;

  // Clear all timeouts - iterates through Set and clears each
  const clearTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(id => clearTimeout(id));
    timeoutRefs.current.clear();
  }, []);

  // Helper to create tracked timeouts
  const createTrackedTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutRefs.current.delete(id);
      callback();
    }, delay);
    timeoutRefs.current.add(id);
    return id;
  }, []);

  // Cleanup timeouts on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  // Reset state when starting a NEW streaming session
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      // Just started streaming - reset to initial state
      setCurrentSectionIndex(0);
      setIsTransitioning(false);
      setIsExpanded(false);
      setFinalElapsedTime("");
      clearTimeouts();
      prevStepCountRef.current = 0;
      lastThinkingTextRef.current = "Thinking...";
      lastUpdateTimestampRef.current = 0;
    }
  }, [isStreaming, clearTimeouts]);

  // Handle streaming end - show final state
  useEffect(() => {
    if (!isStreaming && validatedSteps && totalSections > 0) {
      // Streaming ended - jump to final state immediately
      clearTimeouts();
      setCurrentSectionIndex(totalSections - 1);
      setIsTransitioning(false);
    }
  }, [isStreaming, validatedSteps, totalSections, clearTimeouts]);

  // Incremental step animation: Animate as new steps arrive from server
  useEffect(() => {
    // Skip if not streaming or no data
    if (!isStreaming || !validatedSteps || totalSections === 0) {
      prevStepCountRef.current = 0;
      return;
    }

    // Check if a new step just arrived
    if (totalSections > prevStepCountRef.current) {
      // New step detected! Animate to show it
      const newStepIndex = totalSections - 1;

      // If this is the first step, show it immediately
      if (prevStepCountRef.current === 0) {
        setCurrentSectionIndex(0);
        setIsTransitioning(false);
      } else {
        // Animate transition to new step with brief crossfade
        setIsTransitioning(true);

        createTrackedTimeout(() => {
          setCurrentSectionIndex(newStepIndex);
          setIsTransitioning(false);
        }, ANIMATION.CROSSFADE_DURATION_MS);
      }

      // Update the step count tracker
      prevStepCountRef.current = totalSections;
    }
  }, [isStreaming, validatedSteps, totalSections, createTrackedTimeout]);

  // Get current and last sections
  const currentSection = validatedSteps?.steps[currentSectionIndex];
  const lastStep = validatedSteps?.steps[totalSections - 1];

  /**
   * Get the pill label text based on current state
   * - During streaming: current status ("Thinking...", "Scrutinizing...", etc.)
   * - Collapsed after streaming: last status ("Interrogated feasibility gaps...")
   * - Expanded after streaming: "Thought process" (Claude-style)
   */
  const getPillLabel = (): string => {
    // When expanded after streaming: show "Thought process" (like Claude)
    if (isExpanded && !isStreaming) {
      return "Thought process";
    }

    // During streaming: show current step title
    if (isStreaming) {
      if (validatedSteps && currentSection) {
        // Structured reasoning is always preferred
        lastThinkingTextRef.current = currentSection.title;
        return currentSection.title;
      }

      // Fallback to GLM native streaming text
      if (hasStreamingText && statusHistory.length > 0) {
        // Use the latest valid status update
        const latestStatus = statusHistory[statusHistory.length - 1];

        // THROTTLING LOGIC:
        // Only update if enough time has passed (1.5s) OR if we are currently showing "Thinking..."
        // This prevents "rapid scrolling" even if the model is fast.
        const now = Date.now();
        const timeSinceLastUpdate = now - lastUpdateTimestampRef.current;
        const isInitialState = lastThinkingTextRef.current === "Thinking..." || lastThinkingTextRef.current === "Processing...";

        if (isInitialState || timeSinceLastUpdate > 1500 || latestStatus !== lastThinkingTextRef.current) {
          // Note: We update if the status CHANGED, but we might want to throttle that too?
          // Actually, if we have a NEW valid status, we probably want to show it.
          // But let's keep the throttle to be safe, unless it's the *first* real status.
          if (isInitialState || timeSinceLastUpdate > 1500) {
            lastThinkingTextRef.current = latestStatus;
            lastUpdateTimestampRef.current = now;
            return latestStatus;
          }
        }

        return lastThinkingTextRef.current;
      }

      return lastThinkingTextRef.current;
    }

    // After streaming (collapsed): show LAST status (not "Thought for X seconds")
    if (validatedSteps && lastStep) {
      const title = lastStep.title;
      return title.length > 70 ? `${title.slice(0, 67)}...` : title;
    }

    // Fallback for non-structured reasoning
    if (statusHistory.length > 0) {
      const lastStatus = statusHistory[statusHistory.length - 1];
      return lastStatus.length > 70 ? `${lastStatus.slice(0, 67)}...` : lastStatus;
    }

    const text = reasoning || "";
    return text.length > 70 ? `${text.slice(0, 67)}...` : text || "View reasoning";
  };

  // Get timer display value
  const timerValue = isStreaming ? elapsedTime : finalElapsedTime;

  // Don't render if no data and not streaming
  if (!isStreaming && !validatedSteps && !reasoning && !streamingReasoningText) {
    return null;
  }

  const hasStructuredContent = validatedSteps && totalSections > 0;
  const hasContent = hasStructuredContent || hasStreamingText || sanitizedReasoning;
  // STABILITY FIX: Always show the spinner when streaming, even if we have text.
  // This prevents the "different sized pill" jump when switching from "Thinking..." to text.
  const showThinkingBar = isStreaming;
  const showShimmer = isStreaming;
  const showExpandButton = hasContent || isStreaming;

  // Show timer when we have a value (during streaming or after completion)
  const showTimer = Boolean(timerValue);

  return (
    <div className="w-full">
      {/* Pill container - background lightens when expanded (Claude-style) */}
      <div
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2",
          "rounded-md border",
          "px-3 py-1.5 text-left",
          "transition-all duration-300",
          // CRITICAL: Background changes when expanded (like Claude screenshots)
          isExpanded && !isStreaming
            ? "bg-muted/30 border-border/60"
            : "bg-transparent border-border/40",
          "hover:border-border/60 hover:bg-muted/10"
        )}
        onClick={() => showExpandButton && setIsExpanded(!isExpanded)}
        role={showExpandButton ? "button" : undefined}
        tabIndex={showExpandButton ? 0 : undefined}
        onKeyDown={showExpandButton ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        } : undefined}
        aria-expanded={showExpandButton ? isExpanded : undefined}
        aria-controls={showExpandButton ? "reasoning-expanded-content" : undefined}
        aria-label={isStreaming ? "AI is thinking" : (isExpanded ? "Hide thought process" : "Show thought process")}
        aria-live={isStreaming ? "polite" : "off"}
        aria-busy={isStreaming}
      >
        {/* Left side: Spinner (thinking) or Text */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Show spinner only during initial thinking state */}
          {showThinkingBar && (
            <div
              className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin shrink-0"
              aria-hidden="true"
            />
          )}

          {/* Text with smooth transitions - Wrapped in fixed height container to prevent jumps */}
          <div className="flex-1 min-w-0 h-[20px] flex items-center">
            {showShimmer ? (
              <TextShimmer
                className={cn(
                  "text-sm line-clamp-1 w-full",
                  "transition-opacity duration-150",
                  isTransitioning && "opacity-50"
                )}
                duration={2} // Faster shimmer for more "alive" feel
                spread={2}   // Tighter spread for more visible effect
              >
                {getPillLabel()}
              </TextShimmer>
            ) : (
              <span
                className={cn(
                  "text-sm line-clamp-1 w-full",
                  "transition-all duration-150",
                  // Text color changes when expanded (like Claude)
                  isExpanded ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {getPillLabel()}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Timer + Stop/Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Timer with clock icon (shows during streaming AND after) */}
          {showTimer && (
            <span className={cn(
              "flex items-center gap-1 text-xs font-mono tabular-nums",
              isStreaming ? "text-orange-500" : "text-muted-foreground"
            )}>
              {/* Only show clock icon when NOT streaming (optional, matches Claude cleaner look) */}
              {!isStreaming && <Clock className="size-3" aria-hidden="true" />}
              {timerValue}
            </span>
          )}

          {/* Stop button while thinking (no data yet) */}
          {showThinkingBar && onStop && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStop();
              }}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1",
                "text-xs text-muted-foreground",
                "rounded-md border border-border/40",
                "transition-colors",
                "hover:bg-muted/20 hover:text-foreground"
              )}
              aria-label="Stop AI thinking process"
              type="button"
            >
              <StopCircle className="size-3" aria-hidden="true" />
              <span>Stop</span>
            </button>
          )}

          {/* Chevron for expand/collapse */}
          {showExpandButton && (
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground/60 transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Expanded content - FULL reasoning (Claude-style) */}
      <div
        id="reasoning-expanded-content"
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[60vh] opacity-100 mt-2" : "max-h-0 opacity-0"
        )}
        aria-hidden={!isExpanded}
      >
        <div className={cn(
          "pt-3 px-4 pb-4",
          "rounded-md",
          "bg-muted/30",  // Lighter gray background (matches Claude)
          "border border-border/40",
          "max-h-[50vh] overflow-y-auto"
        )}>
          {/* Structured reasoning steps - show FULL content */}
          {hasStructuredContent && sanitizedSteps && (
            <div className="space-y-4">
              {sanitizedSteps.steps.map((step, stepIndex) => {
                // Separate list items from paragraphs for semantic HTML
                const listItems = step.items.filter(isListItem);
                const paragraphs = step.items.filter(item => !isListItem(item));

                return (
                  <div key={stepIndex} className="space-y-2">
                    {/* Step Title (Optional, but helpful for context) */}
                    <h4 className="text-sm font-medium text-foreground/80 mb-1">
                      {step.title}
                    </h4>

                    {/* Render paragraphs first */}
                    {paragraphs.map((item, itemIndex) => (
                      <p
                        key={`p-${itemIndex}`}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        {item}
                      </p>
                    ))}
                    {/* Wrap list items in proper <ul> for semantic HTML */}
                    {listItems.length > 0 && (
                      <ul className="list-disc ml-6 space-y-1">
                        {listItems.map((item, itemIndex) => (
                          <li
                            key={`li-${itemIndex}`}
                            className="text-sm text-muted-foreground"
                          >
                            {stripListPrefix(item)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* GLM native streaming text (fallback) - Show Status History */}
          {hasStreamingText && !hasStructuredContent && (
            <div className="space-y-2">
              {statusHistory.length > 0 ? (
                statusHistory.map((status, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-sm leading-relaxed",
                      // Highlight the latest status if streaming
                      index === statusHistory.length - 1 && isStreaming
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {status}
                    {/* Show spinner next to latest item if streaming */}
                    {index === statusHistory.length - 1 && isStreaming && (
                      <span className="inline-block w-1.5 h-4 ml-1.5 bg-orange-500/60 animate-pulse align-middle" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground italic">
                  Thinking...
                </div>
              )}
            </div>
          )}

          {/* Fallback for non-structured reasoning */}
          {!hasStructuredContent && !hasStreamingText && sanitizedReasoning && (
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {sanitizedReasoning}
            </div>
          )}

          {/* No data fallback */}
          {!hasStructuredContent && !hasStreamingText && !sanitizedReasoning && (
            <p className="text-sm text-muted-foreground">
              No reasoning data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
