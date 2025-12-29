import { memo, useState, useEffect, useMemo } from "react";
import { Markdown } from "@/components/ui/markdown";
import { InlineImage } from "@/components/InlineImage";
import { ArtifactCard } from "@/components/ArtifactCard";
import { ArtifactCardSkeleton } from "@/components/ArtifactCardSkeleton";
import { parseArtifacts } from "@/utils/artifactParser";
import { ArtifactData } from "@/components/ArtifactContainer";
import { bundleArtifact, needsBundling } from "@/utils/artifactBundler";
import { toast } from "sonner";
import { WebSearchResults as WebSearchResultsType } from "@/types/webSearch";
import { MessageErrorBoundary } from "@/components/MessageErrorBoundary";
import { CitationSource, stripCitationMarkers } from "@/utils/citationParser";
import { InlineCitation } from "@/components/ui/inline-citation";

interface MessageWithArtifactsProps {
  content: string;
  messageId?: string;
  sessionId: string;  // CRITICAL: Used for server-side bundling, not messageId
  onArtifactOpen: (artifact: ArtifactData) => void;
  searchResults?: WebSearchResultsType | null;
  citationSources?: Map<number, CitationSource[]>;
  className?: string;
}

/**
 * Converts web search results to citation sources map.
 * Each search source becomes a citation numbered sequentially [1], [2], etc.
 *
 * @param searchResults - Web search results from Tavily API
 * @returns Map of citation numbers to citation sources
 */
function webSearchToCitationSources(
  searchResults: WebSearchResultsType | null | undefined
): Map<number, CitationSource[]> {
  if (!searchResults?.sources) return new Map();

  const map = new Map<number, CitationSource[]>();
  searchResults.sources.forEach((source, index) => {
    const citationNumber = index + 1; // [1], [2], etc.
    map.set(citationNumber, [{
      citationNumber,
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      favicon: source.favicon,
      relevanceScore: source.relevanceScore,
    }]);
  });
  return map;
}

/**
 * Reusable component for rendering message content with parsed artifacts.
 *
 * Handles:
 * - Parsing artifact tags from message content
 * - Rendering clean content (text without artifact tags)
 * - Displaying inline images
 * - Showing artifact cards for interactive components
 * - Inline citations from web search results
 *
 * Used by both saved messages and streaming messages to ensure
 * consistent rendering behavior.
 */
export const MessageWithArtifacts = memo(({
  content,
  messageId,
  sessionId,
  onArtifactOpen,
  searchResults,
  citationSources,
  className = ""
}: MessageWithArtifactsProps) => {
  const [artifacts, setArtifacts] = useState<ArtifactData[]>([]);
  const [cleanContent, setCleanContent] = useState(content);
  const [bundlingStatus, setBundlingStatus] = useState<Record<string, 'idle' | 'bundling' | 'success' | 'error'>>({});
  const [inProgressCount, setInProgressCount] = useState(0);

  // Convert web search results to citation sources map
  // Use provided citationSources if available, otherwise convert from searchResults
  const citationSourcesMap = useMemo(() => {
    return citationSources || webSearchToCitationSources(searchResults);
  }, [citationSources, searchResults]);

  // Process citations at MESSAGE level: strip markers and aggregate all sources
  const { contentWithoutCitations, aggregatedSources } = useMemo(() => {
    if (citationSourcesMap.size === 0) {
      return { contentWithoutCitations: cleanContent, aggregatedSources: [] };
    }
    const { cleanContent: stripped, allSources } = stripCitationMarkers(cleanContent, citationSourcesMap);
    return { contentWithoutCitations: stripped, aggregatedSources: allSources };
  }, [cleanContent, citationSourcesMap]);

  // Parse artifacts asynchronously (now uses crypto hash for stable IDs)
  useEffect(() => {
    parseArtifacts(content).then(({ artifacts: parsedArtifacts, cleanContent: parsed, inProgressCount: inProgress }) => {
      setArtifacts(parsedArtifacts);
      setCleanContent(parsed);
      setInProgressCount(inProgress);
    });
  }, [content]);

  // Handle server-side bundling for artifacts with npm imports
  useEffect(() => {
    async function handleBundling() {
      for (const artifact of artifacts) {
        // Skip if already bundled or bundling
        if (artifact.bundleUrl || bundlingStatus[artifact.id] !== undefined) {
          continue;
        }

        // Check if artifact needs bundling
        const shouldBundle = needsBundling(artifact.content, artifact.type);
        console.log(`[MessageWithArtifacts] Artifact ${artifact.id} (${artifact.title}) needsBundling:`, shouldBundle);

        if (!shouldBundle) {
          console.log(`[MessageWithArtifacts] Skipping bundling for ${artifact.id} - no npm imports detected`);
          continue;
        }

        console.log(`[MessageWithArtifacts] Starting server-side bundling for ${artifact.id}...`);

        // Validate sessionId before bundling (CRITICAL: prevent bundling with invalid session)
        if (!sessionId || sessionId.length === 0) {
          console.error(`[MessageWithArtifacts] Cannot bundle ${artifact.id} - invalid session ID`);

          setArtifacts(prev =>
            prev.map(a =>
              a.id === artifact.id
                ? {
                    ...a,
                    bundlingFailed: true,
                    bundleError: "Session expired",
                    bundleErrorDetails: "Please refresh the page to restore your session",
                    bundleStatus: 'error'
                  }
                : a
            )
          );

          toast.error("Unable to bundle artifact", {
            description: "Your session may have expired. Please refresh the page.",
            duration: 10000
          });

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'error' }));
          continue;
        }

        // Mark as bundling
        setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'bundling' }));

        // Show bundling toast
        toast.info(`Bundling ${artifact.title} with npm dependencies...`, {
          id: `bundle-${artifact.id}`,
          duration: 30000 // Long duration since bundling takes time
        });

        // Attempt to bundle (FIXED: Use sessionId, not messageId)
        try {
          const result = await bundleArtifact(
            artifact.content,
            artifact.id,
            sessionId,
            artifact.title
          );

          if (result.success) {
          // Update artifact with bundle URL
          setArtifacts(prev =>
            prev.map(a =>
              a.id === artifact.id
                ? {
                    ...a,
                    bundleUrl: result.bundleUrl,
                    bundleTime: result.bundleTime,
                    dependencies: result.dependencies
                  }
                : a
            )
          );

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'success' }));

          toast.success(`${artifact.title} bundled successfully!`, {
            id: `bundle-${artifact.id}`,
            duration: 3000
          });

          console.log(`[MessageWithArtifacts] Bundled ${artifact.id} in ${result.bundleTime}ms with ${result.dependencies.length} packages`);
        } else {
          // Bundling failed - check if artifact has npm imports
          const hasNpmImports = needsBundling(artifact.content, artifact.type);

          if (hasNpmImports) {
            // Mark artifact as unbundleable - don't try Babel fallback
            setArtifacts(prev =>
              prev.map(a =>
                a.id === artifact.id
                  ? {
                      ...a,
                      bundlingFailed: true,
                      bundleError: result.error,
                      bundleErrorDetails: result.details,
                      bundleStatus: 'error'
                    }
                  : a
              )
            );

            // Show error toast with appropriate message
            if (result.retryable) {
              toast.error(`Bundling failed for ${artifact.title}`, {
                id: `bundle-${artifact.id}`,
                description: `${result.error}. You can try again.`,
                duration: 7000
              });
            } else if (result.requiresAuth) {
              toast.error(result.error, {
                id: `bundle-${artifact.id}`,
                description: result.details || "Please refresh the page",
                duration: 10000
              });
            } else if (result.retryAfter) {
              toast.error(result.error, {
                id: `bundle-${artifact.id}`,
                description: result.details,
                duration: 10000
              });
            } else {
              toast.error(`Bundling failed for ${artifact.title}`, {
                id: `bundle-${artifact.id}`,
                description: result.details || result.error,
                duration: 7000
              });
            }

            console.error(`[MessageWithArtifacts] Bundle failed for ${artifact.id}:`, result.error, result.details);
          } else {
            // No npm imports - safe to fallback to Babel
            toast.warning(`Bundling failed for ${artifact.title}, using fallback renderer`, {
              id: `bundle-${artifact.id}`,
              description: "Artifact will render with limited features",
              duration: 5000
            });

            console.warn(`[MessageWithArtifacts] Bundle failed for ${artifact.id}, falling back to Babel:`, result.error);
          }

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'error' }));
        }
        } catch (error) {
          console.error(`[MessageWithArtifacts] Unexpected bundling error for ${artifact.id}:`, error);

          const errorMessage = error instanceof Error ? error.message : String(error);

          setArtifacts(prev =>
            prev.map(a =>
              a.id === artifact.id
                ? {
                    ...a,
                    bundlingFailed: true,
                    bundleError: "Bundling failed unexpectedly",
                    bundleErrorDetails: errorMessage,
                    bundleStatus: 'error'
                  }
                : a
            )
          );

          setBundlingStatus(prev => ({ ...prev, [artifact.id]: 'error' }));

          toast.error(`Failed to bundle ${artifact.title}`, {
            id: `bundle-${artifact.id}`,
            description: "An unexpected error occurred. Please try refreshing the page.",
            duration: 10000
          });
        }
      }
    }

    handleBundling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artifacts, sessionId]);

  // Separate image artifacts from interactive artifacts
  const imageArtifacts = artifacts.filter(a => a.type === 'image');
  const otherArtifacts = artifacts.filter(a => a.type !== 'image');

  return (
    <MessageErrorBoundary messageContent={content}>
      {/* Render message text without artifact tags or citation markers */}
      {/* Citations are processed at MESSAGE level - one unified badge at the end */}
      <div
        className={`flex-1 transition-all duration-150 ${className}`}
      >
        <Markdown
          id={messageId}
          className="prose prose-sm prose-p:mb-3 prose-p:leading-relaxed max-w-none dark:prose-invert text-foreground text-[15px] leading-relaxed"
        >
          {contentWithoutCitations}
        </Markdown>

        {/* Unified citation badge with all sources (carousel) */}
        {aggregatedSources.length > 0 && (
          <div className="mt-3">
            <InlineCitation sources={aggregatedSources} />
          </div>
        )}
      </div>

      {/* Render inline images */}
      {imageArtifacts.map(artifact => (
        <InlineImage
          key={artifact.id}
          artifact={artifact}
        />
      ))}

      {/* Render artifact cards for non-image artifacts */}
      {otherArtifacts.map(artifact => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          onOpen={() => onArtifactOpen(artifact)}
          className="mt-3"
          isBundling={bundlingStatus[artifact.id] === 'bundling'}
        />
      ))}

      {/* Render skeleton cards for in-progress artifacts (streaming) */}
      {inProgressCount > 0 && Array.from({ length: inProgressCount }, (_, i) => (
        <ArtifactCardSkeleton key={`skeleton-${i}`} className="mt-3" />
      ))}
    </MessageErrorBoundary>
  );
});

MessageWithArtifacts.displayName = 'MessageWithArtifacts';
