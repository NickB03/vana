/**
 * ArtifactErrorRecovery Component
 *
 * Displays error state with recovery options for failed artifacts.
 * Modern glassmorphism design with helpful, non-alarming visual language.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles, RefreshCw, AlertCircle, Code2 } from "lucide-react";
import { ArtifactError, FallbackRenderer, generateErrorDisplay } from "@/utils/artifactErrorRecovery";
import { cn } from "@/lib/utils";

/**
 * Maps fallback renderer type to user-friendly display name
 */
function getRendererDisplayName(renderer: FallbackRenderer): string {
  const names: Record<FallbackRenderer, string> = {
    sandpack: 'Sandpack',
    'static-preview': 'Alternative',
  };
  return names[renderer];
}

interface ArtifactErrorRecoveryProps {
  error: ArtifactError;
  isRecovering: boolean;
  canRetry: boolean;
  canUseFallback: boolean;
  onRetry: () => void;
  onUseFallback: () => void;
  onAskAIFix: () => void;
}

export function ArtifactErrorRecovery({
  error,
  isRecovering,
  canRetry,
  canUseFallback,
  onRetry,
  onUseFallback,
  onAskAIFix,
}: ArtifactErrorRecoveryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const display = generateErrorDisplay(error, isRecovering);

  // Map severity to visual styling (subtle, not alarming)
  const severityStyles = {
    red: {
      border: 'border-l-destructive',
      bg: 'bg-destructive/5',
      icon: 'text-destructive',
      iconBg: 'bg-destructive/10',
    },
    orange: {
      border: 'border-l-orange-500',
      bg: 'bg-orange-50/50 dark:bg-orange-950/20',
      icon: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    },
    yellow: {
      border: 'border-l-yellow-500',
      bg: 'bg-yellow-50/50 dark:bg-yellow-950/20',
      icon: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    blue: {
      border: 'border-l-blue-500',
      bg: 'bg-blue-50/50 dark:bg-blue-950/20',
      icon: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
  };

  const styles = severityStyles[display.color];

  return (
    <Card className={cn(
      "border-l-4 shadow-sm",
      styles.border,
      styles.bg,
    )}>
      <CardContent className="p-4 space-y-4">
        {/* Header with icon and title */}
        <div className="flex items-start gap-3">
          {/* Icon badge */}
          <div className={cn(
            "shrink-0 rounded-lg p-2 mt-0.5",
            styles.iconBg
          )}>
            <AlertCircle className={cn("h-5 w-5", styles.icon)} />
          </div>

          {/* Title and description */}
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-semibold text-sm leading-tight">
              {display.title}
            </h3>
            <p className="text-sm text-muted-foreground-accessible leading-relaxed">
              {display.description}
            </p>
          </div>
        </div>

        {/* Recovery Progress Indicator */}
        {isRecovering && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-background/60 border border-border/50">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium text-foreground">
              Attempting automatic recovery...
            </span>
          </div>
        )}

        {/* Action Buttons */}
        {!isRecovering && (
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Primary CTA: Auto-fix button for fixable errors */}
            {error.canAutoFix && canRetry && (
              <Button
                size="sm"
                onClick={onAskAIFix}
                className="h-9 gap-2 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                <Sparkles className="h-4 w-4" />
                Ask AI to Fix
              </Button>
            )}

            {/* Secondary actions */}
            {canUseFallback && error.fallbackRenderer && (
              <Button
                size="sm"
                variant="outline"
                onClick={onUseFallback}
                className="h-9 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try {getRendererDisplayName(error.fallbackRenderer)}
              </Button>
            )}

            {canRetry && !error.canAutoFix && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-9 gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Collapsible Technical Details */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                showDetails && "rotate-180"
              )} />
              <Code2 className="h-4 w-4" />
              <span className="text-xs font-medium">
                {showDetails ? 'Hide' : 'Show'} Technical Details
              </span>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="pt-3 space-y-3 border-t border-border/50 mt-3">
            {/* Error Type */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground-accessible">
                Error Type
              </h4>
              <code className="block text-xs font-mono bg-muted/50 px-3 py-2 rounded-md border border-border/50">
                {error.type}
              </code>
            </div>

            {/* Original Error */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground-accessible">
                Original Error
              </h4>
              <pre className="text-xs font-mono bg-muted/50 px-3 py-2.5 rounded-md border border-border/50 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                {error.originalError}
              </pre>
            </div>

            {/* Suggested Fix */}
            {error.suggestedFix && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground-accessible">
                  Suggested Fix
                </h4>
                <div className="text-xs bg-muted/50 px-3 py-2.5 rounded-md border border-border/50 leading-relaxed">
                  {error.suggestedFix}
                </div>
              </div>
            )}

            {/* Recovery Strategy */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-muted-foreground-accessible">
                Recovery Strategy
              </h4>
              <code className="block text-xs font-mono bg-muted/50 px-3 py-2 rounded-md border border-border/50">
                {error.retryStrategy}
                {error.fallbackRenderer && ` → ${error.fallbackRenderer}`}
              </code>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
