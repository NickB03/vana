import { memo, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ui/reasoning";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { StreamingText } from "./StreamingText";
import {
  StructuredReasoning,
  parseReasoningSteps,
} from "@/types/reasoning";

interface ReasoningDisplayProps {
  // Support both old and new formats for backward compatibility
  reasoning?: string | null;
  reasoningSteps?: StructuredReasoning | unknown | null;
  isStreaming?: boolean;
  percentage?: number;
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
 * Format reasoning steps into markdown for display
 */
function formatReasoningStepsAsMarkdown(steps: StructuredReasoning): string {
  const lines: string[] = [];

  if (steps.summary) {
    lines.push(`**${steps.summary}**\n`);
  }

  steps.steps.forEach((step, index) => {
    // Add step title
    lines.push(`### ${step.title}`);

    // Add step items as list
    if (step.items && step.items.length > 0) {
      step.items.forEach((item) => {
        lines.push(`- ${item}`);
      });
    }

    // Add spacing between steps
    if (index < steps.steps.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n");
}

/**
 * ReasoningDisplay component using prompt-kit's Reasoning API
 *
 * Key improvements over ReasoningIndicator:
 * - Auto-closes when streaming ends (built-in `isStreaming` support)
 * - Native markdown rendering without manual sanitization loops
 * - Consistent with other prompt-kit components (Message, PromptInput)
 * - Better accessibility with ARIA labels and keyboard navigation
 * - Smoother animations with ResizeObserver-based height transitions
 */
export const ReasoningDisplay = memo(function ReasoningDisplay({
  reasoning,
  reasoningSteps,
  isStreaming,
  percentage,
}: ReasoningDisplayProps) {
  // Validate and parse reasoning steps at runtime
  const validatedSteps = useMemo(() => {
    if (!reasoningSteps) return null;

    const parsed = parseReasoningSteps(reasoningSteps);
    if (!parsed) {
      console.warn(
        "[ReasoningDisplay] Failed to parse reasoning steps, falling back to simple indicator"
      );
      return null;
    }

    return parsed;
  }, [reasoningSteps]);

  // Format as markdown for prompt-kit Reasoning component
  const markdownContent = useMemo(() => {
    if (!validatedSteps) return null;
    return formatReasoningStepsAsMarkdown(validatedSteps);
  }, [validatedSteps]);

  // Generate summary text for trigger button
  const triggerText = useMemo(() => {
    if (isStreaming) {
      // During streaming, show summary or first step title
      if (validatedSteps?.summary) {
        return validatedSteps.summary;
      }
      if (validatedSteps?.steps?.[0]?.title) {
        return validatedSteps.steps[0].title;
      }
      return "Thinking...";
    } else {
      // After streaming, show concise summary
      if (validatedSteps?.summary) {
        // Truncate long summaries
        const summary = validatedSteps.summary;
        return summary.length > 80 ? `${summary.slice(0, 77)}...` : summary;
      }
      return "Show reasoning";
    }
  }, [isStreaming, validatedSteps]);

  // Fallback to old ThinkingIndicator if only string reasoning or validation failed
  if ((reasoning && !validatedSteps) || !validatedSteps) {
    return (
      <ThinkingIndicator
        status={reasoning || "Processing..."}
        isStreaming={isStreaming}
        percentage={percentage}
      />
    );
  }

  // Render using prompt-kit Reasoning component
  return (
    <div className="mb-2">
      <Reasoning
        isStreaming={isStreaming}
        showTimer={isStreaming}
        className=""
      >
        <ReasoningTrigger>
          {triggerText}
        </ReasoningTrigger>
        <ReasoningContent
          markdown={!isStreaming} // Use markdown for static, StreamingText handles markdown for streaming
          className="mt-2"
          contentClassName="text-sm leading-relaxed"
        >
          {isStreaming ? (
            <StreamingText
              content={sanitizeContent(markdownContent || "")}
              isStreaming={isStreaming}
              speed={40}
            />
          ) : (
            sanitizeContent(markdownContent || "")
          )}
        </ReasoningContent>
      </Reasoning>

      {/* Show progress bar during streaming */}
      {isStreaming && percentage !== undefined && (
        <div className="mt-3">
          <ThinkingIndicator
            status={validatedSteps.summary || "Processing..."}
            isStreaming={isStreaming}
            percentage={percentage}
          />
        </div>
      )}
    </div>
  );
});
