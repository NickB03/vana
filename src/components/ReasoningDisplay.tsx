import { memo, useState, useEffect, useRef, useMemo, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import {
  StructuredReasoning,
  parseReasoningSteps,
} from "@/types/reasoning";
import { ChevronDown, Clock, Search, Wrench } from "lucide-react";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { useReasoningTimer } from "@/hooks/useReasoningTimer";
import {
  extractStatusText,
  createExtractionState,
  type ExtractionState,
} from "@/utils/reasoningTextExtractor";
import type { ToolExecution } from "@/hooks/useChatMessages";

interface ReasoningDisplayProps {
  // Support both old and new formats for backward compatibility
  reasoning?: string | null;
  reasoningSteps?: StructuredReasoning | unknown | null;
  /** Raw reasoning text being streamed from GLM (native thinking mode) */
  streamingReasoningText?: string | null;
  /** Semantic status update from GLM-4.5-Air */
  reasoningStatus?: string | null;
  isStreaming?: boolean;
  /** Whether the artifact has finished rendering (optional, defaults to true) */
  artifactRendered?: boolean;
  /** Optional callback to stop the streaming process */
  onStop?: () => void;
  /** Elapsed time passed from parent (for cross-component persistence) */
  parentElapsedTime?: string;
  /** Tool execution status for real-time display */
  toolExecution?: ToolExecution | null;
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
 * Strip list prefix from item (bullets, numbers, etc.)
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
  reasoningStatus,
  isStreaming,
  artifactRendered = true, // Default to true for backward compatibility
  onStop,
  parentElapsedTime,
  toolExecution,
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

  // Timer for reasoning duration (Claude-style)
  const elapsedTime = useReasoningTimer(isStreaming ?? false);
  // Track the last valid elapsed time (before it resets to empty)
  const lastElapsedTimeRef = useRef<string>("");
  // Track the previous step count to detect new steps arriving
  const prevStepCountRef = useRef(0);
  // State for the reasoning text extractor (throttling, last valid text, etc.)
  const extractionStateRef = useRef<ExtractionState>(createExtractionState());

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

  // Continuously track the last non-empty elapsed time while streaming
  // This is crucial because elapsedTime may become empty before we can capture it in the transition effect
  useEffect(() => {
    if (isStreaming && elapsedTime) {
      lastElapsedTimeRef.current = elapsedTime;
    }
  }, [isStreaming, elapsedTime]);

  // Reset state when starting a NEW streaming session AND capture final time when ending
  useEffect(() => {
    if (!isStreaming && wasStreamingRef.current) {
      // Just stopped streaming - capture the final time
      // Use lastElapsedTimeRef as fallback if elapsedTime is already empty
      const timeToCapture = elapsedTime || lastElapsedTimeRef.current;
      if (timeToCapture) {
        setFinalElapsedTime(timeToCapture);
      }
    }

    if (isStreaming && !wasStreamingRef.current) {
      // Just started streaming - reset to initial state
      setCurrentSectionIndex(0);
      setIsTransitioning(false);
      setIsExpanded(false);
      setFinalElapsedTime("");
      lastElapsedTimeRef.current = "";
      clearTimeouts();
      prevStepCountRef.current = 0;
      // Reset the extraction state for new streaming session
      extractionStateRef.current = createExtractionState();
    }

    // Update ref AFTER all checks
    wasStreamingRef.current = isStreaming ?? false;
  }, [isStreaming, elapsedTime, clearTimeouts]);

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
   * Truncate text to max length with ellipsis
   */
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 3)}...`;
  };

  /**
   * Get the streaming status text from available sources
   * Priority: tool execution > semantic status > structured steps > raw text extraction > fallback
   */
  const getStreamingStatus = (): string => {
    // 0. HIGHEST PRIORITY: Tool execution status (show when actively using tools)
    if (toolExecution && isStreaming) {
      const { toolName, success, sourceCount } = toolExecution;

      // If we have a result (success is defined), show completion status
      if (success !== undefined) {
        if (success && sourceCount !== undefined) {
          return `Found ${sourceCount} source${sourceCount !== 1 ? 's' : ''}`;
        }
        return success ? `${toolName} completed` : `${toolName} failed`;
      }

      // Otherwise show in-progress status
      return `Searching web...`;
    }

    // 1. Prefer explicit semantic status from GLM-4.5-Air (AI Commentator)
    if (reasoningStatus) {
      return reasoningStatus;
    }

    // 2. Prefer structured reasoning steps
    if (validatedSteps && currentSection) {
      return currentSection.title;
    }

    // 3. Extract status from GLM native streaming text
    if (hasStreamingText && streamingReasoningText) {
      const result = extractStatusText(
        streamingReasoningText,
        extractionStateRef.current
      );
      extractionStateRef.current = result.state;
      return result.text;
    }

    // 4. Use last known text
    return extractionStateRef.current.lastText;
  };

  /**
   * Get the pill label text based on current state
   * - During streaming: current status ("Thinking...", "Scrutinizing...", etc.)
   * - Waiting for render: "Rendering..." (after streaming completes but before artifact renders)
   * - Collapsed after streaming: last status ("Interrogated feasibility gaps...")
   * - Expanded after streaming: "Thought process" (Claude-style)
   */
  const getPillLabel = (): string => {
    // Expanded after streaming: show "Thought process" (like Claude)
    if (isExpanded && !isStreaming && artifactRendered) {
      return "Thought process";
    }

    // Streaming done but artifact not rendered: show "Rendering the generated artifact..."
    if (!isStreaming && !artifactRendered) {
      return "Rendering the generated artifact...";
    }

    // During streaming: show current step title
    if (isStreaming) {
      return getStreamingStatus();
    }

    // After streaming (collapsed): show last step title
    // This will be the AI-generated summary like "Created a counter button component"
    // or fall back to "Thought process" for generic/missing titles
    if (validatedSteps && lastStep) {
      const title = lastStep.title.trim(); // FIX: Trim whitespace to catch whitespace-only titles
      // Only use fallback for truly generic titles that don't describe what was created
      // Keep meaningful summaries like "Created a counter button component"
      if (title === 'Model reasoning' || title === 'AI reasoning complete' || !title) {
        return 'Thought process';
      }
      return truncateText(title, 70);
    }

    // Fallback for non-structured reasoning
    const text = (reasoning || "").trim(); // FIX: Trim fallback text too
    return text ? truncateText(text, 70) : "View reasoning";
  };

  // Don't render if no displayable content and not streaming
  // validatedSteps might have empty steps array, so check totalSections > 0
  const hasDisplayableSteps = validatedSteps && totalSections > 0;
  if (!isStreaming && !hasDisplayableSteps && !reasoning && !streamingReasoningText) {
    return null;
  }

  const hasStructuredContent = hasDisplayableSteps;
  const hasContent = hasStructuredContent || hasStreamingText || sanitizedReasoning;
  // STABILITY FIX: Always show the spinner when streaming, even if we have text.
  // This prevents the "different sized pill" jump when switching from "Thinking..." to text.
  // PHASE 2: Also show spinner if streaming is complete but artifact hasn't rendered yet
  const showThinkingBar = isStreaming || (!isStreaming && !artifactRendered);
  const showShimmer = isStreaming || (!isStreaming && !artifactRendered);
  const showExpandButton = hasContent || isStreaming;

  // Get timer display value (shows during streaming AND after completion)
  // Priority: parentElapsedTime > local timer values (handles component unmount/remount)
  const timerValue = parentElapsedTime || (isStreaming ? elapsedTime : finalElapsedTime);
  const showTimer = Boolean(timerValue);

  return (
    <div className="w-full">
      {/* Pill container - background lightens when expanded (Claude-style) */}
      <div
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2",
          "rounded-2xl border",
          "px-3 py-2 text-left",
          // Use specific transitions instead of transition-all for better performance
          // Only animate properties that actually change (background, border)
          "transition-colors duration-300",
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
          {showThinkingBar && !toolExecution && (
            <div
              className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0"
              aria-hidden="true"
            />
          )}

          {/* Show tool execution icon when using tools */}
          {showThinkingBar && toolExecution && isStreaming && (
            <div className="shrink-0">
              {toolExecution.success === undefined ? (
                // In progress - show animated search icon
                <Search className="w-4 h-4 text-muted-foreground animate-pulse" aria-hidden="true" />
              ) : toolExecution.success ? (
                // Success - show check mark briefly
                <Search className="w-4 h-4 text-green-500/70" aria-hidden="true" />
              ) : (
                // Failure - show warning
                <Wrench className="w-4 h-4 text-orange-500/70" aria-hidden="true" />
              )}
            </div>
          )}

          {/* Text with smooth transitions - Wrapped in fixed height container to prevent jumps */}
          <div className="flex-1 min-w-0 h-[20px] flex items-center overflow-hidden">
            {showShimmer ? (
              <TextShimmer
                className="font-mono text-sm text-muted-foreground truncate"
                duration={3}
                spread={25}
              >
                {getPillLabel()}
              </TextShimmer>
            ) : (
              <span
                className="text-sm text-muted-foreground truncate w-full"
              >
                {getPillLabel()}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Timer + Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Timer with clock icon (shows during streaming AND after) */}
          {showTimer && (
            <span className={cn(
              "flex items-center gap-1 text-xs font-mono tabular-nums",
              isStreaming ? "text-muted-foreground animate-pulse" : "text-muted-foreground"
            )}>
              {/* Show clock icon when NOT streaming (completed state) */}
              {!isStreaming && <Clock className="size-3" aria-hidden="true" />}
              {timerValue}
            </span>
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
          // Animate max-height and opacity for expand/collapse
          // Using GPU-accelerated opacity + max-height for smooth animation
          "overflow-hidden",
          "transition-[max-height,opacity,margin] duration-300 ease-out",
          isExpanded ? "max-h-[60vh] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        )}
        aria-hidden={!isExpanded}
      >
        <div className={cn(
          "pt-3 px-4 pb-4",
          "rounded-2xl",
          "bg-muted/30",  // Lighter gray background (matches Claude)
          "border border-border/40",
          "max-h-[50vh] overflow-y-auto"
        )}>
          {/* Structured reasoning steps - show FULL content */}
          {hasStructuredContent && sanitizedSteps && (
            <div className="space-y-4">
              {sanitizedSteps.steps.map((step, stepIndex) => (
                <div key={stepIndex} className="space-y-1">
                  {/* Step Title - Bold heading */}
                  <h4 className="text-sm font-semibold text-foreground/90">
                    {step.title}
                  </h4>

                  {/* All items as bullet points */}
                  {step.items.length > 0 && (
                    <ul className="space-y-0.5 ml-0.5">
                      {step.items.map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="text-sm text-muted-foreground/90 leading-snug flex items-start gap-1.5"
                        >
                          <span className="text-muted-foreground/40 mt-[0.35em] select-none text-[8px]">●</span>
                          <span className="flex-1">{stripListPrefix(item)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* GLM native streaming text (fallback) */}
          {hasStreamingText && sanitizedStreamingText && !hasStructuredContent && (
            <div
              className={cn(
                "whitespace-pre-wrap text-sm text-muted-foreground",
                "leading-relaxed"
              )}
            >
              {sanitizedStreamingText}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 bg-orange-500/60 animate-pulse" />
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
