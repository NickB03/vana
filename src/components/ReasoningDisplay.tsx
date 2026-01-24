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
  /** Semantic status update from GLM-4.5-Air (via ReasoningProvider) */
  reasoningStatus?: string | null;
  isStreaming?: boolean;
  /** Whether the artifact has finished rendering (optional, defaults to true) */
  artifactRendered?: boolean;
  /** Elapsed time passed from parent (for cross-component persistence) */
  parentElapsedTime?: string;
  /** Tool execution status for real-time display */
  toolExecution?: ToolExecution | null;
  /** Time elapsed since stream started (for time-based fallback status) */
  elapsedSeconds?: number;
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
 * Format reasoning text with proper styling
 * - Converts **bold** markdown to styled pill headers
 * - Collapses multiple newlines into compact spacing
 * - Returns React elements for rich formatting
 */
function FormattedReasoningText({ text }: { text: string }) {
  // Split by **header** pattern and process
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  // Group parts into sections (header + content pairs)
  const sections: Array<{ header?: string; content: string }> = [];
  let currentSection: { header?: string; content: string } = { content: '' };

  parts.forEach((part) => {
    const headerMatch = part.match(/^\*\*(.+)\*\*$/);
    if (headerMatch) {
      // Save previous section if it has content
      if (currentSection.content.trim() || currentSection.header) {
        sections.push(currentSection);
      }
      // Start new section with this header
      currentSection = { header: headerMatch[1], content: '' };
    } else {
      // Add to current section content
      currentSection.content += part;
    }
  });

  // Don't forget the last section
  if (currentSection.content.trim() || currentSection.header) {
    sections.push(currentSection);
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const cleanedContent = section.content
          .replace(/\n{3,}/g, '\n\n')
          .replace(/^\n+/, '')
          .replace(/\n+$/, '')
          .trim();

        return (
          <div key={index} className="space-y-2">
            {section.header && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-foreground/[0.08] text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                {section.header}
              </span>
            )}
            {cleanedContent && (
              <p className="text-sm text-foreground/80 leading-[1.7] max-w-prose">
                {cleanedContent}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * ReasoningDisplay component - Simplified ticker pill with "Thought process" expansion
 *
 * Key features:
 * - During streaming: Shows live semantic status updates from ReasoningProvider (GLM-4.5-Air)
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
  elapsedSeconds,
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
   * 5-Level Priority System:
   * P1: Semantic status from backend (reasoning_status events)
   * P2: Tool execution status (browser.search, generate_artifact, generate_image)
   * P3: Extract from streaming reasoning text (markdown headers or action phrases)
   * P4: Time-based fallback (guaranteed progression based on elapsed time)
   * P5: Generic fallback ("Thinking...")
   */
  const getStreamingStatus = (): string => {
    // P1: Semantic status from backend (reasoning_status events)
    if (reasoningStatus && reasoningStatus !== 'Thinking...') {
      return reasoningStatus;
    }

    // P2: Tool execution status (always available during tool use)
    if (toolExecution && isStreaming) {
      const { toolName, success, sourceCount } = toolExecution;
      if (success !== undefined) {
        if (success && sourceCount !== undefined) {
          return `Found ${sourceCount} source${sourceCount !== 1 ? 's' : ''}`;
        }
        return success ? `${toolName} completed` : `${toolName} failed`;
      }
      switch (toolName) {
        case 'browser.search': return 'Searching the web...';
        case 'generate_artifact': return 'Generating artifact...';
        case 'generate_image': return 'Creating image...';
        default: return `Using ${toolName}...`;
      }
    }

    // P3: Extract from streaming reasoning text (improved patterns)
    if (streamingReasoningText && isStreaming) {
      // Check for markdown headers: **Header Text**
      const headerMatch = streamingReasoningText.match(/\*\*([^*]{3,40})\*\*/);
      if (headerMatch) {
        const header = headerMatch[1].trim();
        return header.length > 35 ? header.substring(0, 32) + '...' : header + '...';
      }

      // Check for action phrases
      const actionMatch = streamingReasoningText.match(
        /(?:I (?:will|'ll|should) |Let me )(\w+) (?:the |a |an )?(.{3,25}?)(?:\.|,|$)/i
      );
      if (actionMatch) {
        const verb = actionMatch[1];
        const object = actionMatch[2].toLowerCase().replace(/[.,;:]+$/, '');
        const gerund = verb.endsWith('e') ? verb.slice(0, -1) + 'ing' : verb + 'ing';
        const status = `${gerund.charAt(0).toUpperCase() + gerund.slice(1)} ${object}...`;
        if (status.length <= 40) return status;
      }
    }

    // P4: Time-based fallback (guaranteed progression)
    if (typeof elapsedSeconds === 'number' && elapsedSeconds >= 0 && isStreaming) {
      if (elapsedSeconds < 3) return 'Analyzing your request...';
      if (elapsedSeconds < 10) return 'Still working on your request...';
      if (elapsedSeconds < 20) return 'Building a detailed response...';
      if (elapsedSeconds < 30) return 'Crafting a thorough answer...';
      if (elapsedSeconds < 45) return 'This is taking longer than usual...';
      return 'Almost there, finalizing response...';
    }

    // P5: Generic fallback (should rarely reach here)
    return 'Thinking...';
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

  // CRITICAL FIX: Don't hide the component just because streaming stopped!
  // Show the component if:
  // 1. Currently streaming (always show during active thinking)
  // 2. Has any reasoning data to display (text, status, or timer)
  // 3. Has a timer value (means reasoning happened, even if text is missing)
  const hasAnyReasoningData = reasoning || streamingReasoningText || reasoningStatus || finalElapsedTime || parentElapsedTime;
  const hasTimer = Boolean(parentElapsedTime || (isStreaming ? elapsedTime : finalElapsedTime));

  // Show component if streaming OR has data OR has timer
  if (!isStreaming && !hasAnyReasoningData && !hasTimer) {
    return null;
  }

  // Include reasoningStatus as content fallback for expanded view
  const hasContent = sanitizedReasoning || sanitizedStreamingText || (reasoningStatus && reasoningStatus !== "Thinking...");
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
          // FIXED: Consistent background in all states for text readability
          "bg-muted/30",
          isExpanded && !isStreaming
            ? "border-border/60"
            : "border-border/40",
          "hover:border-border/60 hover:bg-muted/40"
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
            "px-3 py-2.5",
            "rounded-2xl",
            "bg-muted/30",
            "border border-border/40",
            "max-h-[50vh] overflow-y-auto"
          )}
        >
          {/* Display streaming text if available */}
          {sanitizedStreamingText ? (
            <FormattedReasoningText text={sanitizedStreamingText} />
          ) : sanitizedReasoning ? (
            /* Display fallback reasoning */
            <FormattedReasoningText text={sanitizedReasoning} />
          ) : reasoningStatus && reasoningStatus !== "Thinking..." ? (
            /* Display status update as fallback when no reasoning text is available */
            <div className="text-sm text-muted-foreground">
              <p className="italic">{reasoningStatus}</p>
            </div>
          ) : (
            /* No data fallback */
            <p className="text-sm text-muted-foreground italic">
              Processing your request...
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
