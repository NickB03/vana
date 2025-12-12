import * as React from "react";
import { ChevronDown, Sparkles, Clock, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";

/**
 * ResearchPlan Component
 *
 * Based on the AI SDK Plan component pattern (https://ai-sdk.dev/elements/components/plan)
 * Provides a collapsible container for displaying AI-generated research execution plans.
 *
 * Features:
 * - Collapsible content with smooth animations
 * - Streaming support with shimmer loading states
 * - Step-by-step plan display with status indicators
 * - Action button for initiating research
 */

export interface ResearchPlanStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  estimatedTime?: string;
}

export interface ResearchPlanProps {
  /** Plan title */
  title: string;
  /** Plan description/scope */
  description: string;
  /** Array of research steps */
  steps: ResearchPlanStep[];
  /** Whether the plan is being streamed/generated */
  isStreaming?: boolean;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Estimated total time */
  estimatedTime?: string;
  /** Sources count */
  sourcesCount?: number;
  /** Callback when "Begin Research" is clicked */
  onBeginResearch?: () => void;
  /** Whether research is in progress */
  isResearching?: boolean;
  /** Additional className */
  className?: string;
}

export function ResearchPlan({
  title,
  description,
  steps,
  isStreaming = false,
  defaultOpen = true,
  estimatedTime,
  sourcesCount,
  onBeginResearch,
  isResearching = false,
  className,
}: ResearchPlanProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const completedSteps = steps.filter(s => s.status === "completed").length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button
              className="flex w-full items-start justify-between gap-4 text-left hover:opacity-80 transition-opacity"
              aria-expanded={isOpen}
            >
              <div className="flex-1 space-y-1">
                {/* Title with shimmer during streaming */}
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {isStreaming ? (
                    <TextShimmer
                      className="text-lg font-semibold"
                      duration={2}
                      spread={20}
                    >
                      {title}
                    </TextShimmer>
                  ) : (
                    <h3 className="text-lg font-semibold">{title}</h3>
                  )}
                </div>

                {/* Description with shimmer during streaming */}
                {isStreaming ? (
                  <TextShimmer
                    className="text-sm text-muted-foreground"
                    duration={2.5}
                    spread={25}
                  >
                    {description}
                  </TextShimmer>
                ) : (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}

                {/* Meta info */}
                <div className="flex items-center gap-4 pt-1">
                  {estimatedTime && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {estimatedTime}
                    </span>
                  )}
                  {sourcesCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {sourcesCount} sources
                    </span>
                  )}
                  {steps.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {completedSteps}/{steps.length} steps
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200 mt-1",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>

          {/* Progress bar (shown when collapsed or during research) */}
          {!isOpen && progress > 0 && (
            <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </CardHeader>

        {/* Collapsible Content - Steps */}
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg transition-colors",
                    step.status === "in_progress" && "bg-primary/5 border border-primary/20",
                    step.status === "completed" && "bg-muted/50",
                    step.status === "pending" && "opacity-70"
                  )}
                >
                  {/* Status icon */}
                  <div className="mt-0.5">
                    {step.status === "completed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : step.status === "in_progress" ? (
                      <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={cn(
                        "text-sm font-medium",
                        step.status === "completed" && "text-muted-foreground line-through"
                      )}>
                        {index + 1}. {step.title}
                      </h4>
                      {step.estimatedTime && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {step.estimatedTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>

        {/* Footer with action button */}
        <CardFooter className="border-t bg-muted/30 py-3">
          <div className="flex w-full items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {isResearching
                ? "Research in progress..."
                : isStreaming
                ? "Generating plan..."
                : "Ready to begin research"}
            </p>
            <Button
              onClick={onBeginResearch}
              disabled={isStreaming || isResearching}
              size="sm"
              className="gap-2"
            >
              {isResearching ? (
                <>
                  <div className="h-3 w-3 rounded-full border-2 border-background border-t-transparent animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Begin Research
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Collapsible>
    </Card>
  );
}

export default ResearchPlan;
