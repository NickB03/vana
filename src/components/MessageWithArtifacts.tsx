import { memo, useMemo, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { Markdown } from "@/components/ui/markdown";
import { InlineImage } from "@/components/InlineImage";
import { ArtifactCard } from "@/components/ArtifactCard";
import { ArtifactData, ArtifactType } from "@/components/ArtifactContainer";
import { WebSearchResults as WebSearchResultsType } from "@/types/webSearch";
import { MessageErrorBoundary } from "@/components/MessageErrorBoundary";
import { CitationSource, stripCitationMarkers } from "@/utils/citationParser";
import { InlineCitation } from "@/components/ui/inline-citation";
import { supabase } from "@/integrations/supabase/client";

/** Direct artifact data from DB or streaming - preferred over XML parsing */
export interface DirectArtifactData {
  id: string;
  type: string;
  title: string;
  content: string;
  language?: string;
}

interface MessageWithArtifactsProps {
  content: string;
  messageId?: string;
  onArtifactOpen: (artifact: ArtifactData) => void;
  artifactOverrides?: Record<string, Partial<ArtifactData>>;
  searchResults?: WebSearchResultsType | null;
  citationSources?: Map<number, CitationSource[]>;
  className?: string;
  /** Direct artifact data (from DB or streaming) - preferred over parsing */
  artifactData?: DirectArtifactData[];
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
 * Convert DirectArtifactData to ArtifactData
 * Maps the simplified interface to the full ArtifactData type
 */
function convertToArtifactData(direct: DirectArtifactData): ArtifactData {
  return {
    id: direct.id,
    type: direct.type as ArtifactType,
    title: direct.title,
    content: direct.content,
    language: direct.language,
  };
}

/**
 * Strip artifact XML tags from content to get clean display text
 * Used when artifacts are provided directly (not parsed from content)
 */
function stripArtifactTags(content: string): string {
  // Remove complete artifact blocks: <artifact ...>...</artifact>
  return content.replace(/<artifact[^>]*>[\s\S]*?<\/artifact>/g, '').trim();
}

/**
 * Reusable component for rendering message content with artifacts.
 *
 * Handles:
 * - Rendering clean content (text without artifact tags)
 * - Displaying inline images
 * - Showing artifact cards for interactive components
 * - Inline citations from web search results
 *
 * Artifact Data Sources (in priority order):
 * 1. artifactData prop - Direct data from DB or streaming (preferred)
 * 2. Database query - Fetched from artifact_versions table by message_id
 *
 * Used by both saved messages and streaming messages to ensure
 * consistent rendering behavior.
 */
export const MessageWithArtifacts = memo(({
  content,
  messageId,
  onArtifactOpen,
  artifactOverrides,
  searchResults,
  citationSources,
  className = "",
  artifactData
}: MessageWithArtifactsProps) => {
  // Defer content parsing to reduce computation during rapid streaming updates
  const deferredContent = useDeferredValue(content);

  // ============================================================================
  // ARTIFACT DATA SOURCES (Priority Order)
  // ============================================================================

  // 1. Check if artifactData prop is provided (from streaming or parent component)
  const hasDirectArtifactData = artifactData && artifactData.length > 0;

  // 2. Query artifact_versions table by message_id (only if no direct data)
  const { data: dbArtifacts } = useQuery({
    queryKey: ['message-artifacts', messageId],
    queryFn: async () => {
      if (!messageId) return [];

      const { data, error } = await supabase
        .from('artifact_versions')
        .select('artifact_id, artifact_type, artifact_title, artifact_content, artifact_language')
        .eq('message_id', messageId)
        .order('version_number', { ascending: false });

      if (error) {
        console.error('[MessageWithArtifacts] Failed to fetch artifacts from DB:', error);
        return [];
      }

      // Deduplicate by artifact_id (keep latest version)
      const seen = new Set<string>();
      const uniqueArtifacts: DirectArtifactData[] = [];
      for (const row of data) {
        if (!seen.has(row.artifact_id)) {
          seen.add(row.artifact_id);

          // DEBUG: Log artifact from DB query
          console.log('[MessageWithArtifacts] 🔍 Artifact from DB:', {
            id: row.artifact_id,
            contentLength: row.artifact_content?.length ?? 0,
            contentPreview: row.artifact_content?.substring(0, 100)
          });

          uniqueArtifacts.push({
            id: row.artifact_id,
            type: row.artifact_type,
            title: row.artifact_title,
            content: row.artifact_content,
            language: row.artifact_language ?? undefined,
          });
        }
      }

      return uniqueArtifacts;
    },
    // Only fetch from DB if no direct artifactData and we have a VALID messageId (not streaming-temp)
    enabled: !!messageId && messageId !== 'streaming-temp' && !hasDirectArtifactData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const hasDbArtifacts = dbArtifacts && dbArtifacts.length > 0;

  // ============================================================================
  // RESOLVE FINAL ARTIFACTS (Priority: prop > DB)
  // ============================================================================
  const artifacts = useMemo(() => {
    // Priority 1: Direct artifactData prop (from streaming or parent)
    if (hasDirectArtifactData && artifactData) {
      return artifactData.map(convertToArtifactData);
    }

    // Priority 2: Artifacts from database query
    if (hasDbArtifacts && dbArtifacts) {
      return dbArtifacts.map(convertToArtifactData);
    }

    // No artifacts found
    return [];
  }, [hasDirectArtifactData, artifactData, hasDbArtifacts, dbArtifacts]);

  // Apply artifact overrides (e.g., bundle status updates)
  const mergedArtifacts = useMemo(() => {
    if (!artifactOverrides || Object.keys(artifactOverrides).length === 0) {
      return artifacts;
    }

    return artifacts.map((artifact) => {
      const override = artifactOverrides[artifact.id];
      return override ? { ...artifact, ...override } : artifact;
    });
  }, [artifacts, artifactOverrides]);

  // Strip artifact tags from content for display
  const cleanContent = useMemo(() => {
    return stripArtifactTags(deferredContent);
  }, [deferredContent]);

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

  // Separate image artifacts from interactive artifacts
  const imageArtifacts = mergedArtifacts.filter(a => a.type === 'image');
  const otherArtifacts = mergedArtifacts.filter(a => a.type !== 'image');

  return (
    <MessageErrorBoundary messageContent={content}>
      {/* Render message text without artifact tags or citation markers */}
      {/* Citations are processed at MESSAGE level - one unified badge at the end */}
      <div
        className={`flex-1 transition-all duration-150 ${className}`}
      >
        <Markdown
          id={messageId}
          className="prose max-w-none dark:prose-invert text-foreground"
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
        />
      ))}
    </MessageErrorBoundary>
  );
});

MessageWithArtifacts.displayName = 'MessageWithArtifacts';
