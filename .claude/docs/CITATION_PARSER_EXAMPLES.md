# Citation Parser - Usage Examples

This document shows practical examples of how to use the citation parser utility in the codebase.

## Basic Usage

### Extract Citations from Text

```typescript
import { extractCitations } from '@/utils/citationParser';

const text = "AI has progressed [1][2][3] significantly over the past decade [4].";
const citations = extractCitations(text);

console.log(citations);
// Output:
// [
//   {
//     position: 18,
//     citationNumbers: [1, 2, 3],
//     startIndex: 18,
//     endIndex: 27,
//     rawText: "[1][2][3]"
//   },
//   {
//     position: 62,
//     citationNumbers: [4],
//     startIndex: 62,
//     endIndex: 65,
//     rawText: "[4]"
//   }
// ]
```

### Parse Text with Source Metadata

```typescript
import { parseCitationMarkersInText } from '@/utils/citationParser';
import type { CitationSource } from '@/utils/citationParser';

// Typically from Tavily API or database
const sources = new Map<number, CitationSource[]>([
  [1, [{
    citationNumber: 1,
    title: "AI Progress Report 2024",
    url: "https://arxiv.org/paper1",
    snippet: "Recent advances in machine learning...",
    relevanceScore: 0.95
  }]],
  [2, [{
    citationNumber: 2,
    title: "Deep Learning Breakthroughs",
    url: "https://nature.com/article2",
    snippet: "Novel architectures demonstrate...",
    relevanceScore: 0.88
  }]]
]);

const text = "AI has progressed [1][2] significantly.";
const segments = parseCitationMarkersInText(text, sources);

console.log(segments);
// Output:
// [
//   "AI has progressed ",
//   {
//     position: 18,
//     citationNumbers: [1, 2],
//     sources: [{ citationNumber: 1, ... }, { citationNumber: 2, ... }],
//     primaryDomain: "arxiv.org"
//   },
//   " significantly."
// ]
```

## React Component Integration

### Rendering Citations in Markdown

```tsx
import { parseCitationMarkersInText, type CitationGroup } from '@/utils/citationParser';
import { InlineCitation } from '@/components/ui/inline-citation';

interface MarkdownTextProps {
  text: string;
  citationSources: Map<number, CitationSource[]>;
}

function MarkdownText({ text, citationSources }: MarkdownTextProps) {
  const segments = parseCitationMarkersInText(text, citationSources);

  return (
    <span>
      {segments.map((segment, index) => {
        if (typeof segment === 'string') {
          return <span key={index}>{segment}</span>;
        } else {
          const citationGroup = segment as CitationGroup;
          return (
            <InlineCitation
              key={index}
              citationNumbers={citationGroup.citationNumbers}
              sources={citationGroup.sources}
              primaryDomain={citationGroup.primaryDomain}
            />
          );
        }
      })}
    </span>
  );
}
```

### Prefetch Citation Sources

```typescript
import { getUniqueCitationNumbers } from '@/utils/citationParser';
import { useCitationSources } from '@/hooks/useCitationSources';

function ChatMessage({ content }: { content: string }) {
  // Extract all citation numbers from content
  const citationNumbers = getUniqueCitationNumbers(content);

  // Prefetch sources for all citations
  const { data: sources, isLoading } = useCitationSources(citationNumbers);

  if (isLoading) {
    return <div>Loading citations...</div>;
  }

  return <MarkdownText text={content} citationSources={sources} />;
}
```

## Advanced Usage

### Validate Citations

```typescript
import { extractCitations, isValidCitation } from '@/utils/citationParser';

function validateMessageCitations(
  content: string,
  availableSources: Map<number, CitationSource[]>
) {
  const citations = extractCitations(content);
  const invalidCitations: number[] = [];

  for (const citation of citations) {
    for (const num of citation.citationNumbers) {
      if (!isValidCitation(num, availableSources)) {
        invalidCitations.push(num);
      }
    }
  }

  if (invalidCitations.length > 0) {
    console.warn('Missing sources for citations:', invalidCitations);
  }

  return invalidCitations.length === 0;
}
```

### Highlight Missing Citations

```tsx
import { isValidCitation } from '@/utils/citationParser';
import { InlineCitation } from '@/components/ui/inline-citation';
import { Badge } from '@/components/ui/badge';

function CitationBadge({
  citationNumber,
  sources
}: {
  citationNumber: number;
  sources: Map<number, CitationSource[]>;
}) {
  const isValid = isValidCitation(citationNumber, sources);

  if (!isValid) {
    return (
      <Badge variant="destructive" className="text-xs">
        [{citationNumber}]
      </Badge>
    );
  }

  const citationSources = sources.get(citationNumber) || [];
  return (
    <InlineCitation
      citationNumbers={[citationNumber]}
      sources={citationSources}
      primaryDomain={extractDomain(citationSources[0]?.url)}
    />
  );
}
```

### Custom Grouping Logic

```typescript
import { extractCitations, groupConsecutiveCitations } from '@/utils/citationParser';

// Custom grouping: limit group size to 3 citations max
function extractCitationsWithMaxGroupSize(
  content: string,
  maxGroupSize: number = 3
) {
  const rawMatches: Array<{ number: number; start: number; end: number; text: string }> = [];
  const CITATION_PATTERN = /\[(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = CITATION_PATTERN.exec(content)) !== null) {
    const citationNumber = parseInt(match[1], 10);
    if (citationNumber > 0) {
      rawMatches.push({
        number: citationNumber,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
  }

  // Group citations, but split into multiple groups if size exceeds limit
  const groups = groupConsecutiveCitations(rawMatches, content);
  const limitedGroups = [];

  for (const group of groups) {
    if (group.citationNumbers.length <= maxGroupSize) {
      limitedGroups.push(group);
    } else {
      // Split large groups
      for (let i = 0; i < group.citationNumbers.length; i += maxGroupSize) {
        const chunk = group.citationNumbers.slice(i, i + maxGroupSize);
        limitedGroups.push({
          ...group,
          citationNumbers: chunk
        });
      }
    }
  }

  return limitedGroups;
}
```

## Integration with Chat System

### Store Citations in Message State

```typescript
// In chat message hook or component
interface ChatMessage {
  id: string;
  content: string;
  citationSources?: Map<number, CitationSource[]>;
}

function useChatMessage(messageId: string) {
  const { data: message } = useQuery({
    queryKey: ['message', messageId],
    queryFn: async () => {
      const msg = await fetchMessage(messageId);

      // Extract and prefetch citation sources
      const citationNumbers = getUniqueCitationNumbers(msg.content);
      const sources = await fetchCitationSources(citationNumbers);

      return {
        ...msg,
        citationSources: sources
      };
    }
  });

  return message;
}
```

### Render in Markdown Renderer

```tsx
import ReactMarkdown from 'react-markdown';
import { parseCitationMarkersInText } from '@/utils/citationParser';

const MarkdownRendererWithCitations = ({ content, sources }: Props) => {
  return (
    <ReactMarkdown
      components={{
        // Override text renderer to parse citations
        text: ({ children }) => {
          const text = String(children);
          const segments = parseCitationMarkersInText(text, sources);

          return (
            <>
              {segments.map((segment, i) =>
                typeof segment === 'string' ? (
                  <span key={i}>{segment}</span>
                ) : (
                  <InlineCitation
                    key={i}
                    citationNumbers={segment.citationNumbers}
                    sources={segment.sources}
                    primaryDomain={segment.primaryDomain}
                  />
                )
              )}
            </>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
```

## Edge Cases Handling

### Robust Citation Extraction

```typescript
import { extractCitations } from '@/utils/citationParser';

// Handles all edge cases automatically
const edgeCases = [
  "No citations here",                    // Returns: []
  "[1] Citation at start",                // Returns: [{ citationNumbers: [1], position: 0, ... }]
  "Citation at end [1]",                  // Returns: [{ citationNumbers: [1], position: 17, ... }]
  "[1][2][3]",                           // Returns: [{ citationNumbers: [1,2,3], ... }]
  "[1] text [2]",                        // Returns: [{ citationNumbers: [1], ... }, { citationNumbers: [2], ... }]
  "Invalid [abc] valid [1]",             // Returns: [{ citationNumbers: [1], ... }]
  "Code array[0] citation [1]",          // Returns: [{ citationNumbers: [1], ... }]
  "[1]  [2]  [3]",                       // Returns: [{ citationNumbers: [1,2,3], ... }] (grouped)
  "Large [999] number",                  // Returns: [{ citationNumbers: [999], ... }]
];

edgeCases.forEach(text => {
  const result = extractCitations(text);
  console.log(`"${text}" =>`, result);
});
```

## Performance Tips

### Memoize Parsed Citations

```tsx
import { useMemo } from 'react';
import { parseCitationMarkersInText } from '@/utils/citationParser';

function ChatMessageContent({ content, sources }: Props) {
  // Only reparse when content or sources change
  const segments = useMemo(
    () => parseCitationMarkersInText(content, sources),
    [content, sources]
  );

  return (
    <div>
      {segments.map((segment, i) =>
        typeof segment === 'string' ? (
          segment
        ) : (
          <InlineCitation key={i} {...segment} />
        )
      )}
    </div>
  );
}
```

### Prefetch on Hover

```tsx
import { getUniqueCitationNumbers } from '@/utils/citationParser';

function MessagePreview({ content }: { content: string }) {
  const handleMouseEnter = useCallback(() => {
    const citationNumbers = getUniqueCitationNumbers(content);

    // Prefetch sources before user clicks
    queryClient.prefetchQuery({
      queryKey: ['citations', citationNumbers],
      queryFn: () => fetchCitationSources(citationNumbers)
    });
  }, [content]);

  return <div onMouseEnter={handleMouseEnter}>{content}</div>;
}
```

## Testing Examples

### Mock Citation Data

```typescript
import { describe, it, expect } from 'vitest';
import { parseCitationMarkersInText } from '@/utils/citationParser';

describe('Chat message with citations', () => {
  const mockSources = new Map([
    [1, [{
      citationNumber: 1,
      title: 'Test Source',
      url: 'https://example.com',
      snippet: 'Test snippet'
    }]]
  ]);

  it('should render citations correctly', () => {
    const text = 'Text with citation [1]';
    const segments = parseCitationMarkersInText(text, mockSources);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toBe('Text with citation ');
    expect(segments[1]).toMatchObject({
      citationNumbers: [1],
      primaryDomain: 'example.com'
    });
  });
});
```

---

**Related Files**:
- Implementation: `/src/utils/citationParser.ts`
- Tests: `/src/utils/__tests__/citationParser.test.ts`
- Types: `/src/types/citation.ts`
- Documentation: `/claude/docs/CITATION_PARSER_PHASE2.md`
