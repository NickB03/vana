# Inline Citation System

**Last Updated**: 2025-12-18
**Issue**: #334 - Inline Citations Feature
**Status**: ✅ Complete

## Overview

The inline citation system transforms raw citation markers like `[1][2][3]` from AI responses into a single interactive badge with a carousel to browse all sources. This provides users with quick access to the web search sources that informed the AI's response.

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Response                                                      │
│                                                                  │
│ "Based on recent research, AI has made significant progress     │
│ in natural language understanding. The latest models achieve    │
│ near-human performance on many benchmarks."                     │
│                                                                  │
│ [📖 4 sources]  ← Unified badge (hover for carousel)            │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture

### Data Flow

```
┌─────────────────┐     SSE: web_search     ┌──────────────────┐
│  Backend Chat   │ ───────────────────────▶│  useChatMessages │
│  (tool-calling  │     { sources: [...] }  │  hook            │
│   -chat.ts)     │                         └────────┬─────────┘
└─────────────────┘                                  │
                                                     ▼
                                          ┌──────────────────┐
                                          │ MessageWithArtifacts │
                                          │ (message-level    │
                                          │  citation process)│
                                          └────────┬─────────┘
                                                   │
                        ┌──────────────────────────┼──────────────────────────┐
                        ▼                          ▼                          ▼
              ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
              │ stripCitationMarkers │ │    Markdown     │      │ InlineCitation  │
              │ (citationParser.ts)  │ │    (clean text) │      │ (unified badge) │
              └─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Key Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `tool-calling-chat.ts` | `supabase/functions/chat/handlers/` | Sends `web_search` SSE event with sources |
| `useChatMessages.tsx` | `src/hooks/` | Receives SSE events, stores `searchResults` |
| `MessageWithArtifacts.tsx` | `src/components/` | Message-level citation processing |
| `citationParser.ts` | `src/utils/` | Strips markers, aggregates sources |
| `inline-citation.tsx` | `src/components/ui/` | Renders badge + hover card carousel |
| `citation.ts` | `src/types/` | Type definitions |

## Implementation Details

### 1. Backend: SSE Event (`web_search`)

When Tavily web search completes, the backend sends a `web_search` SSE event:

```typescript
// supabase/functions/chat/handlers/tool-calling-chat.ts

if (toolResult.success && toolResult.toolName === 'browser.search') {
  const tavilyResults = toolResult.data.searchResults;

  sendEvent({
    type: 'web_search',
    data: {
      query: tavilyResults.query,
      sources: tavilyResults.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.content,
        relevanceScore: result.score,
      })),
      timestamp: Date.now(),
      searchTime: toolResult.latencyMs,
    },
  });
}
```

### 2. Frontend: Message Processing

Citations are processed at the **message level** (not per-paragraph):

```typescript
// src/components/MessageWithArtifacts.tsx

// Convert web search results to citation sources map
const citationSourcesMap = useMemo(() => {
  return citationSources || webSearchToCitationSources(searchResults);
}, [citationSources, searchResults]);

// Process citations at MESSAGE level
const { contentWithoutCitations, aggregatedSources } = useMemo(() => {
  if (citationSourcesMap.size === 0) {
    return { contentWithoutCitations: cleanContent, aggregatedSources: [] };
  }
  const { cleanContent: stripped, allSources } = stripCitationMarkers(
    cleanContent,
    citationSourcesMap
  );
  return { contentWithoutCitations: stripped, aggregatedSources: allSources };
}, [cleanContent, citationSourcesMap]);
```

### 3. Citation Parser: `stripCitationMarkers()`

Strips all `[N]` markers and aggregates sources:

```typescript
// src/utils/citationParser.ts

export function stripCitationMarkers(
  content: string,
  citationSources: Map<number, CitationSource[]>
): { cleanContent: string; allSources: CitationSource[]; citationNumbers: number[] } {
  // 1. Extract all citation markers
  const citations = extractCitations(content);

  // 2. Collect unique citation numbers
  const allCitationNumbers = new Set<number>();
  for (const citation of citations) {
    for (const num of citation.citationNumbers) {
      allCitationNumbers.add(num);
    }
  }

  // 3. Strip markers from text (reverse order to avoid index shift)
  let cleanContent = content;
  const sortedCitations = [...citations].sort((a, b) => b.startIndex - a.startIndex);
  for (const citation of sortedCitations) {
    cleanContent = cleanContent.slice(0, citation.startIndex) +
                   cleanContent.slice(citation.endIndex);
  }

  // 4. Aggregate all sources
  const allSources: CitationSource[] = [];
  for (const citationNumber of sortedNumbers) {
    const sourceList = citationSources.get(citationNumber);
    if (sourceList?.length > 0) {
      allSources.push(...sourceList);
    }
  }

  return { cleanContent, allSources, citationNumbers: sortedNumbers };
}
```

### 4. Unified Badge Rendering

One badge with all sources displayed at the end of the message:

```tsx
// src/components/MessageWithArtifacts.tsx

return (
  <MessageErrorBoundary messageContent={content}>
    <div className={`flex-1 transition-all duration-150 ${className}`}>
      {/* Clean content without citation markers */}
      <Markdown id={messageId} className="...">
        {contentWithoutCitations}
      </Markdown>

      {/* ONE unified citation badge */}
      {aggregatedSources.length > 0 && (
        <div className="mt-3">
          <InlineCitation sources={aggregatedSources} />
        </div>
      )}
    </div>
  </MessageErrorBoundary>
);
```

### 5. Citation Badge Component

Interactive badge with hover card carousel:

```tsx
// src/components/ui/inline-citation.tsx

export const InlineCitation = memo(function InlineCitation({
  sources,
  className,
}: InlineCitationProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <CitationTrigger sources={sources} className={className} />
      </HoverCardTrigger>

      <HoverCardContent className="w-80 p-0">
        <div className="p-4">
          {sources.length === 1 ? (
            <CitationCard source={sources[0]} />
          ) : (
            <Carousel setApi={setApi}>
              <CarouselContent>
                {sources.map((source, index) => (
                  <CarouselItem key={`${source.url}-${index}`}>
                    <CitationCard source={source} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}

          {sources.length > 1 && (
            <CarouselNavigation
              currentIndex={currentIndex}
              totalCount={sources.length}
              onPrev={scrollPrev}
              onNext={scrollNext}
            />
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});
```

## Type Definitions

```typescript
// src/types/citation.ts

export interface CitationSource {
  citationNumber: number;
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  relevanceScore?: number;
}

export interface CitationGroup {
  position: number;
  citationNumbers: number[];
  sources: CitationSource[];
  primaryDomain: string;
}
```

## Design Decisions

### Why Message-Level Processing?

**Problem with per-paragraph processing:**
- Multiple badges appeared per paragraph
- List items (`<li>`) weren't processed, leaving raw `[3][4]` visible
- Fragmented UX with many small badges

**Benefits of message-level processing:**
- ONE unified badge for all sources
- Clean text rendering (no raw markers anywhere)
- Simpler architecture (processing in one place)
- Consistent UX regardless of markdown structure

### Why Strip Then Render?

Instead of inline replacement (which requires complex markdown component overrides), we:
1. Strip all markers first
2. Render clean markdown
3. Add one badge at the end

This avoids issues with:
- Different block elements (p, li, blockquote)
- Nested markdown structures
- SSR hydration mismatches

## User Experience

### Badge Appearance

```
[📖 4 sources]
```

- Book icon for visual recognition
- Count shows total sources available
- Subtle primary color styling
- Hover effect with slight scale

### Hover Card

```
┌─────────────────────────────────────┐
│ SpaceX - Updates                    │
│                                     │
│ August 15, 2025. FLIGHT 9 AND      │
│ SHIP 36 REPORT. Flight 9. On May   │
│ 27, 2025, Starship's ninth...      │
│                                     │
│ 🌐 spacex.com          ↗           │
├─────────────────────────────────────┤
│ [◀] [▶]                    1/4     │
└─────────────────────────────────────┘
```

- Title (bold, truncated to 2 lines)
- Snippet (200 char limit, 3 lines max)
- Domain with favicon + external link icon
- Carousel navigation for multiple sources

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   └── inline-citation.tsx      # Badge + hover card + carousel
│   └── MessageWithArtifacts.tsx     # Message-level citation processing
├── utils/
│   ├── citationParser.ts            # stripCitationMarkers, extractCitations
│   └── __tests__/
│       └── citationParser.test.ts   # 48+ tests
├── types/
│   ├── citation.ts                  # CitationSource, CitationGroup types
│   └── webSearch.ts                 # WebSearchResults type (for SSE events)
└── hooks/
    └── useChatMessages.tsx          # SSE event handling for web_search

supabase/functions/
├── chat/
│   └── handlers/
│       └── tool-calling-chat.ts     # web_search SSE event emission
└── _shared/
    └── tavily-client.ts             # Web search API integration
```

**Removed Files** (legacy system):
- `src/components/WebSearchResults.tsx` - Old collapsible "Found X sources" panel
- `src/components/WebSearchSource.tsx` - Individual source cards for old panel

## Testing

### Unit Tests (citationParser.test.ts)

```bash
npm run test -- src/utils/__tests__/citationParser.test.ts

✓ extractCitations - basic functionality (3 tests)
✓ extractCitations - edge cases (16 tests)
✓ groupConsecutiveCitations (4 tests)
✓ parseCitationMarkersInText (11 tests)
✓ stripCitationMarkers (new tests)
✓ isValidCitation (4 tests)
✓ getUniqueCitationNumbers (4 tests)
✓ Integration tests (4 tests)
```

### Browser Testing

1. Start dev server: `npm run dev`
2. Send a message that triggers web search (e.g., "What's the latest news about...?")
3. Verify:
   - No raw `[1][2][3]` markers in text
   - One "📖 N sources" badge appears
   - Hover shows carousel with source details
   - Navigation works between sources

## Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Citation extraction | O(n) | Single regex pass |
| Source aggregation | O(c) | c = citation count |
| Badge rendering | ~1ms | Memoized component |
| Hover card | Lazy | Only renders on hover |

## Related Documentation

- [Citation Parser Phase 2](./CITATION_PARSER_PHASE2.md) - Original parser implementation
- [Citation Parser Examples](./CITATION_PARSER_EXAMPLES.md) - Usage examples
- [Tavily Integration](../../CLAUDE.md#tavily-web-search) - Web search API

## Changelog

### 2025-12-18 (Consolidation)
- **Removed legacy citation system**: Deleted `WebSearchResults.tsx` and `WebSearchSource.tsx`
- Unified to single citation display system (inline badge with carousel)
- Removed duplicate "Found X sources for 'query'" panel from message rendering
- Updated documentation to reflect consolidated architecture

### 2025-12-18 (Initial)
- Implemented message-level citation processing
- Added `stripCitationMarkers()` function
- Redesigned to show ONE unified badge with carousel
- Removed per-paragraph processing from markdown.tsx

### 2025-12-17
- Initial implementation (Phases 1-4)
- Per-paragraph citation processing
- Multiple inline badges approach
