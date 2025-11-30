import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import {
  StructuredReasoning,
  parseReasoningSteps,
  ReasoningStep,
} from "@/types/reasoning";
import { Search, Lightbulb, Target, Sparkles, ChevronDown, StopCircle } from "lucide-react";
import { ANIMATION_DURATIONS, TAILWIND_DURATIONS } from "@/utils/animationConstants";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { useReasoningTimer } from "@/hooks/useReasoningTimer";

interface ReasoningDisplayProps {
  // Support both old and new formats for backward compatibility
  reasoning?: string | null;
  reasoningSteps?: StructuredReasoning | unknown | null;
  isStreaming?: boolean;
  /** Callback when user clicks stop button during streaming */
  onStop?: () => void;
}

/**
 * Icon mapping for reasoning phases
 */
const ICON_MAP = {
  search: Search,
  lightbulb: Lightbulb,
  target: Target,
  sparkles: Sparkles,
} as const;

/**
 * Animation timing constants
 * OPTIMIZED: Since backend sends all reasoning at once (not true streaming),
 * we show the final state immediately instead of fake progressive animation.
 * This provides honest, fast UX without artificial delays.
 */
const ANIMATION = {
  SECTION_DISPLAY_MS: 800,                            // Reduced from 2500ms - faster step transitions
  FADE_DURATION_MS: ANIMATION_DURATIONS.moderate * 1000, // 300ms
  CROSSFADE_DURATION_MS: 150,                         // Reduced from 200ms - snappier transitions
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
 * Format section titles as ticker text for final display
 */
function formatTitlesAsTicker(steps: ReasoningStep[]): string {
  return steps.map(step => step.title).join(" → ");
}

/**
 * ReasoningDisplay component - Unified transparent pill with streaming "window" effect
 *
 * Key features:
 * - Single unified transparent pill styling throughout (no jarring transitions)
 * - Acts as a "window" into reasoning: sections fade in/out within the pill
 * - Always expandable: click to see full reasoning chain
 * - Smooth crossfade animations between reasoning steps
 * - "Thinking..." state while waiting for data
 */
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoning,
  reasoningSteps,
  isStreaming,
  onStop,
}: ReasoningDisplayProps) {
  // Expand/collapse state
  const [isExpanded, setIsExpanded] = useState(false);
  // Current section being displayed (0-indexed)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  // Animation state for crossfade
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Track displayed section for crossfade (slightly behind currentSectionIndex)
  const [displayedSectionIndex, setDisplayedSectionIndex] = useState(0);

  // Track all active timeouts for proper cleanup
  const timeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const wasStreamingRef = useRef(false);

  // Timer for reasoning duration (Claude-style)
  const elapsedTime = useReasoningTimer(isStreaming ?? false);

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

  // Reset state when starting a NEW streaming session
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      // Just started streaming - reset to initial state
      setCurrentSectionIndex(0);
      setDisplayedSectionIndex(0);
      setIsTransitioning(false);
      setIsExpanded(false);
      clearTimeouts();
    }
    wasStreamingRef.current = isStreaming ?? false;
  }, [isStreaming, clearTimeouts]);

  // Track if we already have an animation scheduled to prevent race conditions
  const animationScheduledRef = useRef(false);

  // Handle streaming end - show final state
  useEffect(() => {
    if (!isStreaming && validatedSteps && totalSections > 0) {
      // Streaming ended - jump to final state immediately
      clearTimeouts();
      animationScheduledRef.current = false;
      setCurrentSectionIndex(totalSections - 1);
      setDisplayedSectionIndex(totalSections - 1);
      setIsTransitioning(false);
    }
  }, [isStreaming, validatedSteps, totalSections, clearTimeouts]);

  // Main animation loop - cycles through sections with crossfade
  // IMPORTANT: This effect only schedules ONE timeout at a time and tracks it
  // to prevent race conditions from prop updates during streaming
  useEffect(() => {
    // Skip if not streaming or no data
    if (!isStreaming || !validatedSteps || totalSections === 0) {
      return;
    }

    // Skip if we're in a transition or already have an animation scheduled
    if (isTransitioning || animationScheduledRef.current) {
      return;
    }

    // Skip if we've reached the last step
    if (currentSectionIndex >= totalSections - 1) {
      return;
    }

    // Schedule the next step transition
    animationScheduledRef.current = true;

    const timeoutId = createTrackedTimeout(() => {
      // Start crossfade transition
      setIsTransitioning(true);

      createTrackedTimeout(() => {
        setCurrentSectionIndex(prev => Math.min(prev + 1, totalSections - 1));
        setDisplayedSectionIndex(prev => Math.min(prev + 1, totalSections - 1));
        setIsTransitioning(false);
        animationScheduledRef.current = false; // Allow next animation to be scheduled
      }, ANIMATION.CROSSFADE_DURATION_MS);
    }, ANIMATION.SECTION_DISPLAY_MS);

    // Cleanup on unmount - always clear timeout to prevent memory leaks
    // and state updates on unmounted components
    return () => {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(timeoutId);
      animationScheduledRef.current = false;
    };
  }, [isStreaming, validatedSteps, totalSections, currentSectionIndex, isTransitioning, createTrackedTimeout]);

  // Get current section to display
  const currentSection = validatedSteps?.steps[displayedSectionIndex];
  const IconComponent = currentSection?.icon ? ICON_MAP[currentSection.icon] : null;

  // Get display text for the pill
  const getPillText = (): string => {
    if (isStreaming) {
      if (!validatedSteps) {
        return "Thinking...";
      }
      return currentSection?.title || "Processing...";
    }

    // After streaming: show summary or final section title
    if (validatedSteps) {
      const summary = validatedSteps.summary;
      if (summary) {
        return summary.length > 80 ? `${summary.slice(0, 77)}...` : summary;
      }
      // Show last section title or ticker if multiple sections
      if (totalSections === 1) {
        return validatedSteps.steps[0].title;
      }
      const fullTicker = formatTitlesAsTicker(validatedSteps.steps);
      return fullTicker.length > 80 ? `${fullTicker.slice(0, 77)}...` : fullTicker;
    }

    // Fallback for non-structured reasoning
    const text = reasoning || "";
    return text.length > 80 ? `${text.slice(0, 77)}...` : text || "Show reasoning";
  };

  // Don't render if no data and not streaming
  if (!isStreaming && !validatedSteps && !reasoning) {
    return null;
  }

  // Unified transparent pill - same styling throughout
  const pillBaseClasses = cn(
    "flex w-full cursor-pointer items-center justify-between gap-2",
    "rounded-md border border-border/40 bg-transparent",
    "px-3 py-1.5 text-left",
    "transition-all",
    "hover:border-border/60 hover:bg-muted/10"
  );

  const hasContent = validatedSteps && totalSections > 0;
  // Show thinking bar (spinner) only on initial "Thinking..." state
  const showThinkingBar = isStreaming && !validatedSteps;
  // Show shimmer during ALL streaming states (both "Thinking..." and phase transitions)
  const showShimmer = isStreaming;

  return (
    <div className="w-full">
      {/* Unified pill - same container throughout, smooth state transitions */}
      <div
        className={cn(
          pillBaseClasses,
          hasContent && "cursor-pointer"
        )}
        onClick={() => hasContent && setIsExpanded(!isExpanded)}
        role={hasContent ? "button" : undefined}
        tabIndex={hasContent ? 0 : undefined}
        onKeyDown={hasContent ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        } : undefined}
        aria-expanded={hasContent ? isExpanded : undefined}
        aria-label={hasContent ? (isExpanded ? "Hide reasoning" : "Show reasoning") : undefined}
      >
        {/* Left side: Icon/Spinner + Text */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Show spinner while waiting for data, icon when we have content */}
          {showThinkingBar ? (
            // Orange pulsing spinner (Claude-style) while thinking
            <div
              className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-500 rounded-full animate-spin shrink-0"
              aria-hidden="true"
            />
          ) : IconComponent ? (
            <IconComponent
              className={cn(
                "size-4 shrink-0 text-orange-500",
                "transition-opacity",
                TAILWIND_DURATIONS.fast,
                isTransitioning && "opacity-50"
              )}
              aria-hidden="true"
            />
          ) : null}

          {/* Text with smooth transitions - shimmer during ALL streaming states */}
          {showShimmer ? (
            <TextShimmer
              className={cn(
                "flex-1 text-sm line-clamp-1",
                "transition-opacity",
                TAILWIND_DURATIONS.fast,
                isTransitioning && "opacity-50"
              )}
              pulse
              duration={3}
              spread={30}
            >
              {getPillText()}
            </TextShimmer>
          ) : (
            <span
              className={cn(
                "flex-1 text-sm line-clamp-1",
                "text-muted-foreground",
                "transition-all",
                TAILWIND_DURATIONS.moderate
              )}
            >
              {getPillText()}
            </span>
          )}
        </div>

        {/* Right side: Timer, Stop button (thinking), Progress dots (streaming), or Chevron (expandable) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Timer display (Claude-style) - shows during active reasoning with orange accent */}
          {elapsedTime && isStreaming && hasContent && (
            <span className="text-xs text-orange-500 font-mono tabular-nums">
              {elapsedTime}
            </span>
          )}

          {/* Stop button while waiting for reasoning data */}
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
              aria-label="Stop thinking"
              type="button"
            >
              <StopCircle className="size-3" aria-hidden="true" />
              <span>Stop</span>
            </button>
          )}

          {/* Progress dots during streaming - decorative visual indicator */}
          {!showThinkingBar && isStreaming && hasContent && (
            <div
              className="flex gap-1 mr-1"
              aria-hidden="true"
              title={`Step ${displayedSectionIndex + 1} of ${totalSections}`}
            >
              {validatedSteps.steps.map((_, idx) => {
                // Progress dot styling based on position relative to current step
                const getDotColor = () => {
                  if (idx === displayedSectionIndex) return "bg-foreground/60";
                  if (idx < displayedSectionIndex) return "bg-foreground/30";
                  return "bg-muted-foreground/20";
                };
                return (
                  <div
                    key={idx}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      TAILWIND_DURATIONS.moderate,
                      getDotColor()
                    )}
                  />
                );
              })}
            </div>
          )}

          {/* Chevron for expand/collapse */}
          {hasContent && (
            <ChevronDown
              className={cn(
                "size-3.5 text-muted-foreground/60 transition-transform",
                TAILWIND_DURATIONS.moderate,
                isExpanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Expanded content - full reasoning chain */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity]",
          TAILWIND_DURATIONS.moderate,
          "ease-in-out",
          isExpanded ? "opacity-100 max-h-[500px]" : "opacity-0 max-h-0"
        )}
      >
        {hasContent && sanitizedSteps && (
          <div className="pt-2 pl-6 border-l-2 border-border/40 ml-0.5 mt-2">
            <div className="space-y-4">
              {sanitizedSteps.steps.map((step, index) => {
                const StepIcon = step.icon ? ICON_MAP[step.icon] : null;
                const isCurrentStep = index === displayedSectionIndex;
                const isPastStep = index < displayedSectionIndex;

                return (
                  <div
                    key={index}
                    className={cn(
                      "space-y-1.5 transition-opacity",
                      TAILWIND_DURATIONS.moderate,
                      // During streaming: highlight current, dim future
                      isStreaming && !isCurrentStep && !isPastStep && "opacity-40"
                    )}
                  >
                    {/* Section header with icon and title */}
                    <div className="flex items-start gap-2">
                      {StepIcon && (
                        <StepIcon
                          className={cn(
                            "size-4 mt-0.5 shrink-0 transition-colors",
                            TAILWIND_DURATIONS.moderate,
                            isCurrentStep
                              ? "text-foreground/70"
                              : "text-muted-foreground/50"
                          )}
                          aria-hidden="true"
                        />
                      )}
                      <h4
                        className={cn(
                          "font-medium text-sm transition-colors",
                          TAILWIND_DURATIONS.moderate,
                          isCurrentStep
                            ? "text-foreground/90"
                            : "text-muted-foreground/70"
                        )}
                      >
                        {step.title}
                      </h4>
                    </div>

                    {/* Items as bullet points */}
                    <ul className="space-y-1 pl-6 text-muted-foreground">
                      {step.items.map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="text-sm list-disc ml-0.5"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fallback for non-structured reasoning */}
        {!validatedSteps && sanitizedReasoning && (
          <div className="pt-2 pl-6 border-l-2 border-border/40 ml-0.5 mt-2">
            <div className="whitespace-pre-wrap text-sm text-muted-foreground">
              {sanitizedReasoning}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
