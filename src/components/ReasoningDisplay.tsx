import { memo, useState, useEffect, useRef, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { ChevronDown, Clock, Search, Wrench } from "lucide-react";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { useReasoningTimer } from "@/hooks/useReasoningTimer";
import type { ToolExecution } from "@/hooks/useChatMessages";

interface ReasoningDisplayProps {
  /** Raw reasoning text for display in expanded view */
  reasoning?: string | null;
  /** Raw reasoning text being streamed from GLM (native thinking mode) */
  streamingReasoningText?: string | null;
  /** Semantic status update from GLM-4.5-Air (from [STATUS:] markers) */
  reasoningStatus?: string | null;
  isStreaming?: boolean;
  /** Whether the artifact has finished rendering (optional, defaults to true) */
  artifactRendered?: boolean;
  /** Elapsed time passed from parent (for cross-component persistence) */
  parentElapsedTime?: string;
  /** Tool execution status for real-time display */
  toolExecution?: ToolExecution | null;
}

/**
 * Format duration in human-readable form
 *
 * @param seconds - Duration in seconds to format
 * @returns Formatted string like "45s", "2m 15s", or "3m"
 *
 * @remarks
 * Currently unused but prepared for future enhancement:
 * - Display reasoning duration in expanded view header
 * - Show tool execution timing in status messages
 *
 * @example
 * formatDuration(45)    // "45s"
 * formatDuration(135)   // "2m 15s"
 * formatDuration(180)   // "3m"
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

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
 * ReasoningDisplay component - Simplified ticker pill with "Thought process" expansion
 *
 * Key features:
 * - During streaming: Shows live status updates from backend [STATUS:] markers
 * - After streaming (collapsed): Shows "Thought process" + timer
 * - After streaming (expanded): Shows raw reasoning text
 * - Timer persists and shows clock icon
 */
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoning,
  streamingReasoningText,
  reasoningStatus,
  isStreaming,
  artifactRendered = true, // Default to true for backward compatibility
  parentElapsedTime,
  toolExecution,
}: ReasoningDisplayProps) {
  // Expand/collapse state
  const [isExpanded, setIsExpanded] = useState(false);
  // Store final elapsed time when streaming ends
  const [finalElapsedTime, setFinalElapsedTime] = useState<string>("");

  const wasStreamingRef = useRef(false);
  const expandedContentRef = useRef<HTMLDivElement>(null);

  // Timer for reasoning duration
  const elapsedTime = useReasoningTimer(isStreaming ?? false);
  // Track the last valid elapsed time (before it resets to empty)
  const lastElapsedTimeRef = useRef<string>("");

  // Memoize sanitized reasoning text
  const sanitizedReasoning = useMemo(() => {
    return reasoning ? sanitizeContent(reasoning) : null;
  }, [reasoning]);

  // Sanitize streaming reasoning text (GLM native thinking)
  const sanitizedStreamingText = useMemo(() => {
    return streamingReasoningText ? sanitizeContent(streamingReasoningText) : null;
  }, [streamingReasoningText]);

  // Continuously track the last non-empty elapsed time while streaming
  useEffect(() => {
    if (isStreaming && elapsedTime) {
      lastElapsedTimeRef.current = elapsedTime;
    }
  }, [isStreaming, elapsedTime]);

  // Reset state when starting a NEW streaming session AND capture final time when ending
  useEffect(() => {
    if (!isStreaming && wasStreamingRef.current) {
      // Just stopped streaming - capture the final time
      const timeToCapture = elapsedTime || lastElapsedTimeRef.current;
      if (timeToCapture) {
        setFinalElapsedTime(timeToCapture);
      }
    }

    if (isStreaming && !wasStreamingRef.current) {
      // Just started streaming - reset to initial state
      setIsExpanded(false);
      setFinalElapsedTime("");
      lastElapsedTimeRef.current = "";
    }

    // Update ref AFTER all checks
    wasStreamingRef.current = isStreaming ?? false;
  }, [isStreaming, elapsedTime]);

  // Auto-scroll to bottom when streaming
  useEffect(() => {
    if (isStreaming && isExpanded && expandedContentRef.current) {
      expandedContentRef.current.scrollTop = expandedContentRef.current.scrollHeight;
    }
  }, [sanitizedStreamingText, isStreaming, isExpanded]);

  /**
   * Get the streaming status text from available sources
   * Priority: semantic status > tool execution > fallback
   * FIX (2025-12-21): Semantic status takes precedence; tool messages are tool-specific
   */
  const getStreamingStatus = (): string => {
    // HIGHEST PRIORITY: Semantic status from backend [STATUS: ...] markers
    // This gives the most context-aware, human-readable status
    if (reasoningStatus && reasoningStatus !== "Thinking...") {
      return reasoningStatus;
    }

    // SECOND PRIORITY: Tool execution status (only for actual tool use)
    if (toolExecution && isStreaming) {
      const { toolName, success, sourceCount } = toolExecution;

      // If we have a result (success is defined), show completion status
      if (success !== undefined) {
        if (success && sourceCount !== undefined) {
          return `Found ${sourceCount} source${sourceCount !== 1 ? 's' : ''}`;
        }
        return success ? `${toolName} completed` : `${toolName} failed`;
      }

      // FIX (2025-12-21): Show tool-specific in-progress status, not hardcoded "Searching web..."
      switch (toolName) {
        case 'browser.search':
          return 'Searching web...';
        case 'generate_artifact':
          return 'Generating artifact...';
        case 'generate_image':
          return 'Generating image...';
        default:
          return `Using ${toolName}...`;
      }
    }

    // Generic fallback
    return "Thinking...";
  };

  /**
   * Get the pill label text based on current state
   * - During streaming: current status from getStreamingStatus()
   * - Waiting for render: "Rendering..." (after streaming completes but before artifact renders)
   * - After streaming: "Thought process"
   */
  const getPillLabel = (): string => {
    // Expanded after streaming: show "Thought process"
    if (isExpanded && !isStreaming && artifactRendered) {
      return "Thought process";
    }

    // Streaming done but artifact not rendered
    if (!isStreaming && !artifactRendered) {
      return "Rendering the generated artifact...";
    }

    // During streaming: show current status
    if (isStreaming) {
      return getStreamingStatus();
    }

    // After streaming (collapsed): show "Thought process"
    return "Thought process";
  };

  // Don't render if no displayable content and not streaming
  const hasAnyReasoningData = reasoning || streamingReasoningText || finalElapsedTime || parentElapsedTime;
  if (!isStreaming && !hasAnyReasoningData) {
    return null;
  }

  const hasContent = sanitizedReasoning || sanitizedStreamingText;
  // Show spinner when streaming OR when artifact hasn't rendered yet
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

      {/* Expanded content - Raw reasoning text */}
      <div
        id="reasoning-expanded-content"
        className={cn(
          "overflow-hidden",
          "transition-[max-height,opacity,margin] duration-300 ease-out",
          isExpanded ? "max-h-[60vh] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
        )}
        aria-hidden={!isExpanded}
      >
        <div
          ref={expandedContentRef}
          className={cn(
            "pt-3 px-4 pb-4",
            "rounded-2xl",
            "bg-muted/30",
            "border border-border/40",
            "max-h-[50vh] overflow-y-auto"
          )}
        >
          {/* Display streaming text if available */}
          {sanitizedStreamingText ? (
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
          ) : sanitizedReasoning ? (
            /* Display fallback reasoning */
            <div className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
              {sanitizedReasoning}
            </div>
          ) : (
            /* No data fallback */
            <p className="text-sm text-muted-foreground">
              No reasoning data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
