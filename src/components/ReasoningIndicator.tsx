import { memo, useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { Virtuoso } from "react-virtuoso";
import { ThinkingIndicator } from "./ThinkingIndicator";
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
  getIconComponent,
} from "./prompt-kit/chain-of-thought";
import {
  StructuredReasoning,
  ReasoningStep,
  parseReasoningSteps,
  REASONING_CONFIG,
} from "@/types/reasoning";
import { Button } from "./ui/button";

interface ReasoningIndicatorProps {
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
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'span'],
    ALLOWED_ATTR: ['class'], // Allow class for styling
    KEEP_CONTENT: true,
  });
}

/**
 * Memoized individual reasoning step component
 * Prevents re-renders when parent updates
 */
const MemoizedReasoningStep = memo(
  ({
    step,
    index,
  }: {
    step: ReasoningStep;
    index: number;
  }) => {
    const [showAllItems, setShowAllItems] = useState(false);

    // Memoize icon to prevent re-computation
    const icon = useMemo(() => getIconComponent(step.icon), [step.icon]);

    // Sanitize content once on mount/update
    const sanitizedTitle = useMemo(
      () => sanitizeContent(step.title),
      [step.title]
    );

    const visibleItems = useMemo(() => {
      const items = showAllItems
        ? step.items
        : step.items.slice(0, REASONING_CONFIG.INITIAL_VISIBLE_ITEMS);

      return items.map((item) => sanitizeContent(item));
    }, [step.items, showAllItems]);

    return (
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger leftIcon={icon} swapIconOnHover={true}>
          {/* Render sanitized HTML safely */}
          <span dangerouslySetInnerHTML={{ __html: sanitizedTitle }} />
        </ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          {visibleItems.map((sanitizedItem, itemIndex) => (
            <ChainOfThoughtItem key={itemIndex}>
              <span dangerouslySetInnerHTML={{ __html: sanitizedItem }} />
            </ChainOfThoughtItem>
          ))}
          {/* Show "more" button if items were truncated */}
          {!showAllItems && step.items.length > REASONING_CONFIG.INITIAL_VISIBLE_ITEMS && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
              onClick={() => setShowAllItems(true)}
            >
              +{step.items.length - REASONING_CONFIG.INITIAL_VISIBLE_ITEMS} more items
            </Button>
          )}
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    );
  },
  // Custom comparison for performance optimization
  (prevProps, nextProps) => {
    return (
      prevProps.step.title === nextProps.step.title &&
      prevProps.step.items.length === nextProps.step.items.length &&
      prevProps.step.icon === nextProps.step.icon
    );
  }
);

MemoizedReasoningStep.displayName = "MemoizedReasoningStep";

/**
 * Main ReasoningIndicator component
 * Displays structured reasoning steps with XSS protection and performance optimizations
 */
export function ReasoningIndicator({
  reasoning,
  reasoningSteps,
  isStreaming,
  percentage,
}: ReasoningIndicatorProps) {
  // Validate and parse reasoning steps at runtime
  const validatedSteps = useMemo(() => {
    if (!reasoningSteps) return null;

    // Runtime validation with Zod
    const parsed = parseReasoningSteps(reasoningSteps);
    if (!parsed) {
      console.warn(
        "[ReasoningIndicator] Failed to parse reasoning steps, falling back to simple indicator"
      );
      return null;
    }

    return parsed;
  }, [reasoningSteps]);

  // Memoize steps array to prevent re-renders
  // IMPORTANT: All hooks must be called before any conditional returns
  const memoizedSteps = useMemo(
    () => validatedSteps?.steps || [],
    [validatedSteps]
  );

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

  // Render structured reasoning steps
  return (
    <div className="mb-4">
      <ChainOfThought>
        {/* Use virtualization for large step counts (>5 steps) */}
        {memoizedSteps.length > REASONING_CONFIG.ENABLE_VIRTUALIZATION_THRESHOLD ? (
          <div className="max-h-[400px] overflow-auto">
            <Virtuoso
              style={{ height: '400px' }}
              totalCount={memoizedSteps.length}
              itemContent={(index) => (
                <MemoizedReasoningStep
                  step={memoizedSteps[index]}
                  index={index}
                />
              )}
            />
          </div>
        ) : (
          // Render directly for small step counts
          memoizedSteps.map((step, index) => (
            <MemoizedReasoningStep key={index} step={step} index={index} />
          ))
        )}
      </ChainOfThought>

      {/* Show progress bar during streaming with summary */}
      {isStreaming && percentage !== undefined && (
        <div className="mt-4">
          <ThinkingIndicator
            status={validatedSteps.summary || "Processing..."}
            isStreaming={isStreaming}
            percentage={percentage}
          />
        </div>
      )}
    </div>
  );
}
