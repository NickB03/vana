/**
 * ArtifactErrorRecovery Component
 *
 * Displays error state with recovery options for failed artifacts.
 * Shows retry/fallback buttons and expandable technical details.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, RefreshCw, Wrench } from "lucide-react";
import { ArtifactError, FallbackRenderer, generateErrorDisplay } from "@/utils/artifactErrorRecovery";

/**
 * Maps fallback renderer type to user-friendly display name
 */
function getRendererDisplayName(renderer: FallbackRenderer): string {
  const names: Record<FallbackRenderer, string> = {
    sandpack: 'Sandpack',
    babel: 'Babel',
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

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
    orange: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    blue: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
  };

  return (
    <Alert className={`${colorClasses[display.color]} border shadow-sm`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{display.emoji}</span>
        <div className="flex-1 space-y-3">
          <div>
            <AlertTitle className="text-base font-semibold mb-1">
              {display.title}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {display.description}
            </AlertDescription>
          </div>

          {/* Recovery Progress Indicator */}
          {isRecovering && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="font-medium">Attempting automatic recovery...</span>
            </div>
          )}

          {/* Action Buttons */}
          {!isRecovering && (
            <div className="flex flex-wrap gap-2">
              {/* Auto-fix button for fixable errors */}
              {error.canAutoFix && canRetry && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={onAskAIFix}
                  className="h-8 text-xs"
                >
                  <Wrench className="h-3 w-3 mr-1.5" />
                  Ask AI to Fix
                </Button>
              )}

              {/* Fallback renderer button */}
              {canUseFallback && error.fallbackRenderer && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUseFallback}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Try {getRendererDisplayName(error.fallbackRenderer)} Renderer
                </Button>
              )}

              {/* Manual retry button */}
              {canRetry && !error.canAutoFix && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" />
                  Retry
                </Button>
              )}

              {/* Expand technical details */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="h-8 text-xs"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1.5" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1.5" />
                    Technical Details
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Expandable Technical Details */}
          {showDetails && (
            <div className="space-y-2 border-t pt-3 mt-3 border-current/20">
              <div>
                <h4 className="text-xs font-semibold mb-1">Error Type:</h4>
                <code className="text-xs bg-black/10 dark:bg-white/10 px-2 py-1 rounded">
                  {error.type}
                </code>
              </div>

              <div>
                <h4 className="text-xs font-semibold mb-1">Original Error:</h4>
                <pre className="text-xs bg-black/10 dark:bg-white/10 px-3 py-2 rounded overflow-x-auto whitespace-pre-wrap break-words font-mono">
                  {error.originalError}
                </pre>
              </div>

              {error.suggestedFix && (
                <div>
                  <h4 className="text-xs font-semibold mb-1">Suggested Fix:</h4>
                  <p className="text-xs bg-black/10 dark:bg-white/10 px-3 py-2 rounded">
                    {error.suggestedFix}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold mb-1">Recovery Strategy:</h4>
                <code className="text-xs bg-black/10 dark:bg-white/10 px-2 py-1 rounded">
                  {error.retryStrategy}
                  {error.fallbackRenderer && ` → ${error.fallbackRenderer}`}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}
