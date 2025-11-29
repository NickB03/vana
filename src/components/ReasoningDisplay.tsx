import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import {
  StructuredReasoning,
  parseReasoningSteps,
  ReasoningStep,
} from "@/types/reasoning";
import { Search, Lightbulb, Target, Sparkles, ChevronDown } from "lucide-react";
import { ANIMATION_DURATIONS, TAILWIND_DURATIONS } from "@/utils/animationConstants";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { ThinkingBar } from "@/components/prompt-kit/thinking-bar";

interface ReasoningDisplayProps {
  // Support both old and new formats for backward compatibility
  reasoning?: string | null;
  reasoningSteps?: StructuredReasoning | unknown | null;
  isStreaming?: boolean;
  /** Callback when reasoning animation completes - signals response can show */
  onReasoningComplete?: () => void;
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
 */
const ANIMATION = {
  SECTION_DISPLAY_MS: 2500,                           // How long each section shows before transitioning
  FADE_DURATION_MS: ANIMATION_DURATIONS.moderate * 1000, // 300ms
  CROSSFADE_DURATION_MS: 200,                         // Quick crossfade between sections
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
  onReasoningComplete,
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
  const completedCallbackRef = useRef(false);

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
      completedCallbackRef.current = false;
      clearTimeouts();
    }
    wasStreamingRef.current = isStreaming ?? false;
  }, [isStreaming, clearTimeouts]);

  // Main animation loop - cycles through sections with crossfade
  // Frontend-driven animation: backend sends all steps at once, we animate progressively
  useEffect(() => {
    clearTimeouts();

    // Not streaming - show final state immediately
    if (!isStreaming) {
      if (validatedSteps && totalSections > 0) {
        setCurrentSectionIndex(totalSections - 1);
        setDisplayedSectionIndex(totalSections - 1);
      }
      // Call completion callback
      if (!completedCallbackRef.current && validatedSteps && onReasoningComplete) {
        completedCallbackRef.current = true;
        onReasoningComplete();
      }
      return clearTimeouts;
    }

    // No data yet - nothing to animate
    if (!validatedSteps || totalSections === 0) {
      return clearTimeouts;
    }

    // FRONTEND-DRIVEN PROGRESSIVE ANIMATION:
    // Backend sends all reasoning steps at once (to avoid blocking the stream).
    // We animate through them progressively on the frontend for smooth UX.
    // Each step displays for SECTION_DISPLAY_MS before transitioning to next.

    // If we haven't reached the last step yet, schedule transition to next
    if (currentSectionIndex < totalSections - 1 && !isTransitioning) {
      createTrackedTimeout(() => {
        // Start crossfade transition
        setIsTransitioning(true);

        // After crossfade animation, advance to next step
        createTrackedTimeout(() => {
          setCurrentSectionIndex(prev => Math.min(prev + 1, totalSections - 1));
          setDisplayedSectionIndex(prev => Math.min(prev + 1, totalSections - 1));
          setIsTransitioning(false);
        }, ANIMATION.CROSSFADE_DURATION_MS);
      }, ANIMATION.SECTION_DISPLAY_MS);
    }

    // Call completion callback when we reach the last step during streaming
    if (currentSectionIndex === totalSections - 1 && !completedCallbackRef.current) {
      // Delay completion to allow last step to display briefly
      createTrackedTimeout(() => {
        if (!completedCallbackRef.current && onReasoningComplete) {
          completedCallbackRef.current = true;
          onReasoningComplete();
        }
      }, ANIMATION.SECTION_DISPLAY_MS);
    }

    return clearTimeouts;
  }, [isStreaming, validatedSteps, totalSections, currentSectionIndex, isTransitioning, onReasoningComplete, clearTimeouts, createTrackedTimeout]);

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
  const showThinkingBar = isStreaming && !validatedSteps;
  // Show shimmer effect when on the last section while still streaming
  // This indicates "working on artifact" state
  const isOnLastSection = hasContent && displayedSectionIndex === totalSections - 1;
  const showShimmer = isStreaming && isOnLastSection;

  return (
    <div className="w-full">
      {/* Show ThinkingBar while waiting for reasoning data */}
      {showThinkingBar ? (
        <ThinkingBar
          text="Thinking..."
          stopLabel={onStop ? "Stop" : undefined}
          onStop={onStop}
        />
      ) : (
        /* Pill trigger - always the same transparent style */
        <button
          className={pillBaseClasses}
          onClick={() => hasContent && setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Hide reasoning" : "Show reasoning"}
          type="button"
          disabled={!hasContent}
        >
          {/* Left side: Icon + Text */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Icon when we have content */}
            {IconComponent ? (
            <IconComponent
              className={cn(
                "size-4 shrink-0 text-muted-foreground/70",
                "transition-opacity",
                TAILWIND_DURATIONS.fast,
                isTransitioning && "opacity-50"
              )}
              aria-hidden="true"
            />
          ) : null}

          {/* Text with crossfade animation - shimmer on last phase */}
          {showShimmer ? (
            <TextShimmer
              className={cn(
                "flex-1 text-sm line-clamp-1",
                "transition-opacity",
                TAILWIND_DURATIONS.fast,
                isTransitioning && "opacity-50"
              )}
              duration={2}
              spread={25}
            >
              {getPillText()}
            </TextShimmer>
          ) : (
            <span
              className={cn(
                "flex-1 text-sm text-muted-foreground line-clamp-1",
                "transition-opacity",
                TAILWIND_DURATIONS.fast,
                isTransitioning && "opacity-50"
              )}
            >
              {getPillText()}
            </span>
          )}
        </div>

        {/* Right side: Progress dots (streaming) or Chevron (expandable) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Progress dots during streaming - decorative visual indicator */}
          {isStreaming && hasContent && (
            <div
              className="flex gap-1 mr-1"
              aria-hidden="true"
              title={`Step ${displayedSectionIndex + 1} of ${totalSections}`}
            >
              {validatedSteps.steps.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    TAILWIND_DURATIONS.moderate,
                    idx === displayedSectionIndex
                      ? "bg-foreground/60"
                      : idx < displayedSectionIndex
                      ? "bg-foreground/30"
                      : "bg-muted-foreground/20"
                  )}
                />
              ))}
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
      </button>
      )}

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
