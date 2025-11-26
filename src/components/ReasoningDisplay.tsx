import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ui/reasoning";
import {
  StructuredReasoning,
  parseReasoningSteps,
  ReasoningStep,
} from "@/types/reasoning";
import { Search, Lightbulb, Target, Sparkles } from "lucide-react";
import { ANIMATION_DURATIONS, TAILWIND_DURATIONS } from "@/utils/animationConstants";
import { GAP_SPACING } from "@/utils/spacingConstants";

interface ReasoningDisplayProps {
  // Support both old and new formats for backward compatibility
  reasoning?: string | null;
  reasoningSteps?: StructuredReasoning | unknown | null;
  isStreaming?: boolean;
  /** Callback when reasoning animation completes - signals response can show */
  onReasoningComplete?: () => void;
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
 * Uses design system values where possible for consistency
 * Note: Users with prefers-reduced-motion will skip animations via CSS
 */
const ANIMATION = {
  SECTION_DISPLAY_MS: 2500,                           // How long each section shows before transitioning
  FADE_DURATION_MS: ANIMATION_DURATIONS.moderate * 1000, // 300ms - aligned with design system
  WORD_FADE_DURATION_MS: ANIMATION_DURATIONS.slow * 1000, // 500ms - aligned with design system
  WORD_DELAY_MS: 50,                                  // Optimized from 80ms for snappier feel
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
 * Convert structured reasoning steps into continuous text (fallback)
 */
function formatReasoningAsContinuousText(steps: StructuredReasoning): string {
  const thoughts: string[] = [];
  steps.steps.forEach((step) => {
    if (step.items && step.items.length > 0) {
      thoughts.push(...step.items);
    }
  });
  return thoughts.join(". ");
}

/**
 * ReasoningDisplay component - Fade-in/out section cycling animation
 *
 * Key features:
 * - Each reasoning section fades in from left-to-right (full text, not character by character)
 * - Sections cycle: fade out current, fade in next
 * - Shows complete section title in the pill (NOT expandable during streaming)
 * - Calls onReasoningComplete when all sections have been shown
 * - Backward compatible with old continuous text format
 */
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoning,
  reasoningSteps,
  isStreaming,
  onReasoningComplete,
}: ReasoningDisplayProps) {
  // Current section being displayed (0-indexed)
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  // Animation state: 'idle' | 'fade-in' | 'visible' | 'fade-out'
  const [animationState, setAnimationState] = useState<'idle' | 'fade-in' | 'visible' | 'fade-out'>('idle');
  // Track if animation has completed
  const [animationComplete, setAnimationComplete] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasStreamingRef = useRef(false);
  const completedCallbackRef = useRef(false);

  // Validate and parse reasoning steps
  const validatedSteps = useMemo(() => {
    return reasoningSteps ? parseReasoningSteps(reasoningSteps) : null;
  }, [reasoningSteps]);

  const totalSections = validatedSteps?.steps.length ?? 0;

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Reset state when starting a NEW streaming session
  useEffect(() => {
    if (isStreaming && !wasStreamingRef.current) {
      // Just started streaming - reset to initial state
      setCurrentSectionIndex(0);
      setAnimationState('idle');
      setAnimationComplete(false);
      completedCallbackRef.current = false;
      clearTimeouts();
    }
    wasStreamingRef.current = isStreaming ?? false;
  }, [isStreaming, clearTimeouts]);

  // Main animation loop - cycles through sections
  useEffect(() => {
    // Clear any existing timeouts when effect re-runs
    clearTimeouts();

    // Not streaming or no data - show final state immediately
    if (!isStreaming || !validatedSteps || totalSections === 0) {
      if (validatedSteps && totalSections > 0) {
        setCurrentSectionIndex(totalSections - 1);
        setAnimationState('visible');
        setAnimationComplete(true);
      }
      return clearTimeouts; // Cleanup on unmount
    }

    // Start animation if idle and we have sections
    if (animationState === 'idle' && totalSections > 0) {
      setAnimationState('fade-in');
      return clearTimeouts;
    }

    // Handle animation states
    if (animationState === 'fade-in') {
      // After fade-in completes, become visible
      timeoutRef.current = setTimeout(() => {
        setAnimationState('visible');
      }, ANIMATION.FADE_DURATION_MS);
      return clearTimeouts;
    }

    if (animationState === 'visible') {
      // Stay visible for the display duration, then fade out (or complete)
      timeoutRef.current = setTimeout(() => {
        if (currentSectionIndex < totalSections - 1) {
          // More sections to show - fade out
          setAnimationState('fade-out');
        } else {
          // Last section - animation complete
          setAnimationComplete(true);
          if (!completedCallbackRef.current && onReasoningComplete) {
            completedCallbackRef.current = true;
            onReasoningComplete();
          }
        }
      }, ANIMATION.SECTION_DISPLAY_MS);
      return clearTimeouts;
    }

    if (animationState === 'fade-out') {
      // After fade-out completes, move to next section and fade in
      timeoutRef.current = setTimeout(() => {
        setCurrentSectionIndex(prev => prev + 1);
        setAnimationState('fade-in');
      }, ANIMATION.FADE_DURATION_MS);
      return clearTimeouts;
    }

    // Default cleanup
    return clearTimeouts;
  }, [isStreaming, validatedSteps, totalSections, animationState, currentSectionIndex, onReasoningComplete, clearTimeouts]);

  // When streaming ends, call completion callback if not already called
  useEffect(() => {
    if (!isStreaming && !completedCallbackRef.current && validatedSteps && onReasoningComplete) {
      completedCallbackRef.current = true;
      onReasoningComplete();
    }
  }, [isStreaming, validatedSteps, onReasoningComplete]);

  // Get current section to display
  const currentSection = validatedSteps?.steps[currentSectionIndex];
  const IconComponent = currentSection?.icon ? ICON_MAP[currentSection.icon] : null;

  // Determine trigger text for pill display
  const getTriggerText = (): string => {
    if (isStreaming && currentSection) {
      // During streaming: show current section's title
      return currentSection.title;
    }

    // After streaming: show summary or full ticker
    if (validatedSteps) {
      const summary = validatedSteps.summary;
      if (summary) {
        return summary.length > 120 ? `${summary.slice(0, 117)}...` : summary;
      }
      const fullTicker = formatTitlesAsTicker(validatedSteps.steps);
      return fullTicker.length > 120 ? `${fullTicker.slice(0, 117)}...` : fullTicker;
    }

    // Fallback for non-structured reasoning
    const text = reasoning || "";
    return text.length > 120 ? `${text.slice(0, 117)}...` : text || "Show reasoning";
  };

  // Don't render if no data and not streaming
  if (!isStreaming && !validatedSteps && !reasoning) {
    return null;
  }

  // Show "Thinking..." while waiting for data
  if (isStreaming && !validatedSteps) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full bg-muted/50 overflow-hidden text-muted-foreground",
          // Responsive padding: tighter on mobile, comfortable on desktop
          "px-2.5 py-1.5 sm:px-3 sm:py-2",
          // Touch-friendly minimum height (44px for accessibility)
          "min-h-[44px]",
          // Responsive text size
          "text-xs sm:text-sm",
          // Use design system gap
          GAP_SPACING.xs
        )}
        role="status"
        aria-live="polite"
        aria-label="Thinking..."
      >
        <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0" />
        <span>Thinking...</span>
      </div>
    );
  }

  // Get fallback text for non-structured display
  const fallbackText = validatedSteps
    ? formatReasoningAsContinuousText(validatedSteps)
    : reasoning || "";

  // Split text into words for word-by-word fade animation
  const renderFadeWords = (text: string) => {
    const words = text.split(/(\s+)/); // Split by whitespace but keep the spaces

    return words.map((word, idx) => {
      const isWhitespace = /^\s+$/.test(word);

      return (
        <span
          key={`${word}-${idx}`}
          className={cn(
            "fade-word",
            isWhitespace && "fade-word-space"
          )}
          style={{
            animationDelay: `${idx * ANIMATION.WORD_DELAY_MS}ms`,
            animationDuration: `${ANIMATION.WORD_FADE_DURATION_MS}ms`,
          }}
        >
          {word}
        </span>
      );
    });
  };

  // During streaming: show animated pill (NOT expandable)
  if (isStreaming && validatedSteps && !animationComplete) {
    const sectionTitle = currentSection?.title || "Processing...";
    const totalSections = validatedSteps.steps.length;

    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full bg-muted/50 overflow-hidden",
          // Responsive padding: tighter on mobile, comfortable on desktop
          "px-2.5 py-1.5 sm:px-3 sm:py-2",
          // Touch-friendly minimum height (44px for accessibility)
          "min-h-[44px]",
          // Max width to prevent overflow on narrow screens
          "max-w-[calc(100vw-3rem)]",
          // Use design system gap
          GAP_SPACING.xs
        )}
        role="status"
        aria-live="polite"
        aria-label={`Thinking: ${sectionTitle}`}
      >
        {/* Icon */}
        {IconComponent && (
          <IconComponent
            className="size-4 text-muted-foreground/70 shrink-0"
            aria-hidden="true"
          />
        )}

        {/* Animated section title with word-by-word fade effect */}
        <div className="relative overflow-hidden max-w-[200px] sm:max-w-[300px]">
          <div
            className={cn(
              "text-xs sm:text-sm text-muted-foreground whitespace-nowrap transition-all",
              TAILWIND_DURATIONS.moderate,
              // Fade-in: show words with staggered animation
              animationState === 'fade-in' && "opacity-100",
              // Visible: fully shown
              animationState === 'visible' && "opacity-100",
              // Fade-out: fade entire container to right
              animationState === 'fade-out' && "animate-fade-out-right"
            )}
          >
            {animationState === 'fade-in' ? (
              // Word-by-word fade during fade-in
              renderFadeWords(sanitizeContent(sectionTitle))
            ) : (
              // Static text during visible and fade-out states
              <span>{sanitizeContent(sectionTitle)}</span>
            )}
          </div>
        </div>

        {/* Progress indicator: dots showing which section we're on */}
        <div
          className="flex gap-1 ml-2"
          role="group"
          aria-label={`Step ${currentSectionIndex + 1} of ${totalSections}`}
        >
          {validatedSteps.steps.map((step, idx) => (
            <div
              key={idx}
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                TAILWIND_DURATIONS.moderate,
                "transition-colors",
                idx === currentSectionIndex
                  ? "bg-foreground/60"
                  : idx < currentSectionIndex
                  ? "bg-foreground/30"
                  : "bg-muted-foreground/20"
              )}
              role="presentation"
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    );
  }

  // After streaming or animation complete: show expandable reasoning
  return (
    <Reasoning
      isStreaming={false}
      showTimer={false}
      className=""
    >
      <ReasoningTrigger>
        {getTriggerText()}
      </ReasoningTrigger>
      <ReasoningContent
        markdown={false}
        className="mt-2"
        contentClassName="text-sm leading-relaxed"
      >
        {validatedSteps ? (
          // Structured display with sections, icons, and bullet points
          <div className="space-y-4">
            {validatedSteps.steps.map((step, index) => {
              const StepIcon = step.icon ? ICON_MAP[step.icon] : null;
              return (
                <div key={index} className="space-y-1.5">
                  {/* Section header with icon and title */}
                  <div className="flex items-start gap-2">
                    {StepIcon && (
                      <StepIcon
                        className="size-4 mt-0.5 text-muted-foreground/70 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <h4 className="font-medium text-foreground/90 text-sm">
                      {sanitizeContent(step.title)}
                    </h4>
                  </div>

                  {/* Items as bullet points */}
                  <ul className="space-y-1 pl-6 text-muted-foreground">
                    {step.items.map((item, itemIndex) => (
                      <li
                        key={itemIndex}
                        className="text-sm list-disc ml-0.5"
                      >
                        {sanitizeContent(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          // Fallback: continuous text for non-structured reasoning
          <div className="whitespace-pre-wrap text-muted-foreground">
            {sanitizeContent(fallbackText)}
          </div>
        )}
      </ReasoningContent>
    </Reasoning>
  );
});
