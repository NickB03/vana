import { memo, useMemo } from "react";
import { Search } from "lucide-react";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ui/reasoning";
import { WebSearchResults as WebSearchResultsType } from "@/types/webSearch";
import { parseWebSearchResults } from "@/types/webSearch";
import { WebSearchSource } from "./WebSearchSource";

interface WebSearchResultsProps {
  searchResults?: WebSearchResultsType | unknown | null;
  isStreaming?: boolean;
  className?: string;
}

/**
 * WebSearchResults component displays web search results in a collapsible panel
 *
 * Key features:
 * - Collapsed by default with query and source count
 * - Expandable to show all source cards
 * - Mobile-friendly with vertical stacking
 * - Consistent styling with ReasoningDisplay
 * - Validates data at runtime (graceful degradation)
 *
 * Usage:
 * ```tsx
 * <WebSearchResults
 *   searchResults={message.searchResults}
 *   isStreaming={false}
 * />
 * ```
 */
export const WebSearchResults = memo(function WebSearchResults({
  searchResults,
  isStreaming = false,
  className = "",
}: WebSearchResultsProps) {
  // Validate and parse search results at runtime
  const validatedResults = useMemo(() => {
    if (!searchResults) return null;

    const parsed = parseWebSearchResults(searchResults);
    if (!parsed) {
      console.warn(
        "[WebSearchResults] Failed to parse search results, skipping display"
      );
      return null;
    }

    return parsed;
  }, [searchResults]);

  const sourceCount = validatedResults?.sources.length ?? 0;

  // Generate trigger text (must be called even if validatedResults is null to respect Rules of Hooks)
  const triggerText = useMemo(() => {
    if (!validatedResults) return "";
    if (isStreaming) {
      return `Searching: "${validatedResults.query}"...`;
    }
    return `Found ${sourceCount} source${sourceCount !== 1 ? 's' : ''} for "${validatedResults.query}"`;
  }, [isStreaming, validatedResults, sourceCount]);

  // Don't render if no valid results
  if (!validatedResults) return null;

  return (
    <div className={className}>
      <Reasoning
        isStreaming={isStreaming}
        showTimer={false} // No timer for search results (instant)
        className="mb-2"
      >
        <ReasoningTrigger className="bg-muted/5">
          <span className="flex items-center gap-2">
            <Search className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">{triggerText}</span>
          </span>
        </ReasoningTrigger>
        <ReasoningContent
          className="mt-2"
          contentClassName="!pl-0 !border-l-0 !ml-0"
        >
          <div className="space-y-2">
            {validatedResults.sources.map((source, index) => (
              <WebSearchSource
                key={`${source.url}-${index}`}
                source={source}
              />
            ))}
          </div>

          {/* Optional: Show search time if available */}
          {validatedResults.searchTime && (
            <div className="mt-3 text-xs text-muted-foreground/60 text-center">
              Search completed in {validatedResults.searchTime}ms
            </div>
          )}
        </ReasoningContent>
      </Reasoning>
    </div>
  );
});

WebSearchResults.displayName = 'WebSearchResults';
