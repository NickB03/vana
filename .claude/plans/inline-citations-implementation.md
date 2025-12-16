# Inline Citations Implementation Plan

**Feature**: AI SDK-style Inline Citations with Carousel Support
**Reference**: https://ai-sdk.dev/elements/components/inline-citation
**Status**: Approved with Changes
**Created**: 2025-12-15
**Last Updated**: 2025-12-15 (Expert Review Incorporated)

---

## Executive Summary

Upgrade the existing citation system from basic tooltips to rich hover cards with full source metadata (snippet, favicon, relevance score) and **carousel support for multiple/grouped citations**.

### Key Changes from Expert Review

| Issue | Severity | Resolution |
|-------|----------|------------|
| Wrong Markdown component | 🔴 CRITICAL | Switch to `prompt-kit/markdown` |
| Component location | 🟡 MEDIUM | Use `ui/citations/` not `citations/` |
| Missing memoization | 🟡 MEDIUM | Wrap `parseCitations()` in `useMemo` |
| Mobile UX conflict | 🟡 MEDIUM | Media queries for hover vs tap |
| HoverCard positioning | 🟡 MEDIUM | Add `collisionPadding` prop |

---

## Architecture Overview

### Current State (Two Disconnected Systems)

```
┌─────────────────────────────────────────────────────────────┐
│ CURRENT: Two Disconnected Systems                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  prompt-kit/markdown.tsx           WebSearchResults.tsx      │
│  ┌──────────────────┐               ┌──────────────────┐   │
│  │ Parses [1], [2]  │               │ Shows full cards │   │
│  │ from AI text     │               │ with snippets    │   │
│  │                  │               │                  │   │
│  │ Shows BASIC      │      ❌       │ Rich metadata:   │   │
│  │ tooltip:         │  NO BRIDGE    │ - Favicon        │   │
│  │ - Title          │               │ - Snippet        │   │
│  │ - URL only       │               │ - Domain         │   │
│  └──────────────────┘               │ - Relevance %    │   │
│                                     └──────────────────┘   │
│                                                              │
│  ⚠️ MessageWithArtifacts uses WRONG markdown (ui/markdown)  │
└─────────────────────────────────────────────────────────────┘
```

### Target State (Unified with Rich Cards + Carousel)

```
┌─────────────────────────────────────────────────────────────┐
│ TARGET: Unified Citation System with Rich Cards + Carousel  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  prompt-kit/markdown.tsx ←── searchResults prop             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Inline citations [1], [2] with HoverCard:            │  │
│  │                                                       │  │
│  │ SINGLE SOURCE:                                        │  │
│  │ ┌─────────────────────────────────────────────────┐  │  │
│  │ │ 🌐 react.dev                              [Copy] │  │  │
│  │ │ React 19 Release Notes                          │  │  │
│  │ │                                                  │  │  │
│  │ │ "React 19 introduces the use() hook for         │  │  │
│  │ │  reading resources in render..."                │  │  │
│  │ │                                                  │  │  │
│  │ │ 95% match  •  Dec 2025          [Open in tab ↗] │  │  │
│  │ └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │ GROUPED CITATIONS [1][2][3] - CAROUSEL:               │  │
│  │ ┌─────────────────────────────────────────────────┐  │  │
│  │ │ ◀ │ Source 1 of 3 │ ▶                    [Copy] │  │  │
│  │ │ ─────────────────────────────────────────────── │  │  │
│  │ │ 🌐 react.dev                                    │  │  │
│  │ │ React 19 Release Notes                          │  │  │
│  │ │ "React 19 introduces the use() hook..."         │  │  │
│  │ │                                                  │  │  │
│  │ │ ● ○ ○                           [Open in tab ↗] │  │  │
│  │ └─────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Critical Fixes & Foundation

### 1.1 🔴 CRITICAL: Fix Markdown Import

**File**: `src/components/MessageWithArtifacts.tsx`

```typescript
// ❌ CURRENT (WRONG - no citation support)
import { Markdown } from "@/components/ui/markdown";

// ✅ CORRECT (has citation infrastructure)
import { Markdown } from "@/components/prompt-kit/markdown";
```

**Why**: The `ui/markdown.tsx` is blocks-based with NO citation parsing. All citation logic (`extractSources`, `parseCitations`) exists only in `prompt-kit/markdown.tsx`.

### 1.2 Component File Structure

```
src/components/ui/citations/          # ✅ Follows codebase convention
├── index.ts                          # Exports
├── inline-citation.tsx               # Main component
├── inline-citation-card.tsx          # HoverCard content
├── inline-citation-carousel.tsx      # Carousel for grouped citations
└── citation-matcher.ts               # Source matching utility
```

### 1.3 Type Definitions

**File**: `src/components/ui/citations/types.ts`

```typescript
import { WebSearchSource } from "@/types/webSearch";

/**
 * Discriminated union for single vs. grouped citations
 * Prevents runtime errors from empty arrays
 */
export type InlineCitationProps =
  | {
      mode: "single";
      citationNum: number;
      source: WebSearchSource;
      children?: React.ReactNode;
    }
  | {
      mode: "carousel";
      citationNums: number[];         // [1, 2, 3] for grouped
      sources: WebSearchSource[];
      children?: React.ReactNode;
    };

/**
 * Unified citation source type (rich or basic)
 */
export type CitationSource = WebSearchSource | {
  title: string;
  url: string;
};

/**
 * Type guard for rich sources (have snippet, favicon, etc.)
 */
export function isRichSource(source: CitationSource): source is WebSearchSource {
  return 'snippet' in source;
}

/**
 * Parsed citation from message text
 */
export interface ParsedCitation {
  index: number;           // Position in text
  numbers: number[];       // [1] or [1,2,3] for grouped
  source?: WebSearchSource;
  sources?: WebSearchSource[];
  isGrouped: boolean;
}
```

### 1.4 Citation Matching Utility

**File**: `src/components/ui/citations/citation-matcher.ts`

```typescript
import { WebSearchResults, WebSearchSource } from "@/types/webSearch";

interface Source {
  title: string;
  url: string;
}

/**
 * Match citation number to source data
 * Priority: searchResults.sources (rich) > text-parsed sources (basic)
 */
export function matchCitationToSource(
  citationNum: number,
  searchResults?: WebSearchResults | null,
  textSources?: Source[]
): WebSearchSource | Source | null {
  // 1. Try structured data first (has rich metadata)
  if (searchResults?.sources?.[citationNum - 1]) {
    return searchResults.sources[citationNum - 1];
  }

  // 2. Fallback to text-parsed sources
  if (textSources?.[citationNum - 1]) {
    return textSources[citationNum - 1];
  }

  return null;
}

/**
 * Match multiple citation numbers (for grouped citations)
 */
export function matchCitationsToSources(
  citationNums: number[],
  searchResults?: WebSearchResults | null,
  textSources?: Source[]
): (WebSearchSource | Source)[] {
  return citationNums
    .map(num => matchCitationToSource(num, searchResults, textSources))
    .filter((s): s is WebSearchSource | Source => s !== null);
}

/**
 * Detect grouped citations in text
 * Matches: [1][2][3], [1][2], [1,2,3], [1, 2, 3]
 */
export function parseGroupedCitations(text: string): ParsedCitation[] {
  const results: ParsedCitation[] = [];

  // Pattern for grouped citations: [1][2][3] or [1,2,3]
  const groupedPattern = /(\[(\d+)\]){2,}|\[(\d+(?:\s*,\s*\d+)+)\]/g;
  // Pattern for single citations: [1]
  const singlePattern = /\[(\d+)\]/g;

  // Track positions already matched as grouped
  const groupedPositions = new Set<number>();

  // First pass: find grouped citations
  let match;
  while ((match = groupedPattern.exec(text)) !== null) {
    const fullMatch = match[0];
    const numbers: number[] = [];

    // Extract all numbers from the match
    const numMatches = fullMatch.matchAll(/\d+/g);
    for (const numMatch of numMatches) {
      numbers.push(parseInt(numMatch[0], 10));
    }

    if (numbers.length > 1) {
      results.push({
        index: match.index,
        numbers,
        isGrouped: true,
      });

      // Mark all positions in this group
      for (let i = match.index; i < match.index + fullMatch.length; i++) {
        groupedPositions.add(i);
      }
    }
  }

  // Second pass: find single citations (not part of groups)
  while ((match = singlePattern.exec(text)) !== null) {
    if (!groupedPositions.has(match.index)) {
      results.push({
        index: match.index,
        numbers: [parseInt(match[1], 10)],
        isGrouped: false,
      });
    }
  }

  // Sort by position
  results.sort((a, b) => a.index - b.index);

  return results;
}
```

---

## Phase 2: Core Components

### 2.1 InlineCitation Component

**File**: `src/components/ui/citations/inline-citation.tsx`

```typescript
"use client";

import { memo, useMemo } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { InlineCitationCard } from "./inline-citation-card";
import { InlineCitationCarousel } from "./inline-citation-carousel";
import { WebSearchSource } from "@/types/webSearch";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

interface InlineCitationSingleProps {
  citationNum: number;
  source: WebSearchSource;
  children?: React.ReactNode;
  className?: string;
}

interface InlineCitationGroupedProps {
  citationNums: number[];
  sources: WebSearchSource[];
  children?: React.ReactNode;
  className?: string;
}

type InlineCitationProps = InlineCitationSingleProps | InlineCitationGroupedProps;

function isGroupedProps(props: InlineCitationProps): props is InlineCitationGroupedProps {
  return 'citationNums' in props && Array.isArray(props.citationNums);
}

export const InlineCitation = memo(function InlineCitation(props: InlineCitationProps) {
  const { className } = props;

  // Detect touch devices - disable HoverCard, use direct navigation
  const isHoverCapable = useMediaQuery("(hover: hover)");
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const isGrouped = isGroupedProps(props);
  const displayText = isGrouped
    ? `[${props.citationNums.join('][')}]`
    : `[${props.citationNum}]`;

  const primaryUrl = isGrouped
    ? props.sources[0]?.url
    : props.source.url;

  // Touch devices: Direct link without HoverCard
  if (!isHoverCapable) {
    return (
      <a
        href={primaryUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center text-blue-500 hover:text-blue-600",
          "hover:underline cursor-pointer text-sm font-medium mx-0.5",
          className
        )}
        aria-label={
          isGrouped
            ? `Sources ${props.citationNums.join(', ')}`
            : `Source ${props.citationNum}: ${props.source.title}`
        }
      >
        {displayText}
      </a>
    );
  }

  // Desktop: HoverCard with rich content
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={primaryUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.preventDefault()} // Prevent navigation, let card handle it
          className={cn(
            "inline-flex items-center text-blue-500 hover:text-blue-600",
            "hover:underline cursor-pointer text-sm font-medium mx-0.5",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1",
            "rounded-sm",
            className
          )}
          aria-label={
            isGrouped
              ? `View sources ${props.citationNums.join(', ')}`
              : `View source ${props.citationNum}: ${props.source.title}`
          }
        >
          {displayText}
        </a>
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        collisionPadding={8}
        sideOffset={4}
        className={cn(
          "w-80 max-w-[calc(100vw-2rem)] p-0",
          prefersReducedMotion ? "duration-0" : "duration-200"
        )}
      >
        {isGrouped ? (
          <InlineCitationCarousel
            citationNums={props.citationNums}
            sources={props.sources}
          />
        ) : (
          <InlineCitationCard
            citationNum={props.citationNum}
            source={props.source}
          />
        )}
      </HoverCardContent>
    </HoverCard>
  );
});

InlineCitation.displayName = "InlineCitation";
```

### 2.2 InlineCitationCard Component

**File**: `src/components/ui/citations/inline-citation-card.tsx`

```typescript
"use client";

import { memo, useState } from "react";
import { ExternalLink, Copy, Check, Globe } from "lucide-react";
import { WebSearchSource } from "@/types/webSearch";
import { extractDomain, truncateSnippet, getFaviconUrl } from "@/types/webSearch";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InlineCitationCardProps {
  citationNum: number;
  source: WebSearchSource;
  showCitationBadge?: boolean;
  className?: string;
}

export const InlineCitationCard = memo(function InlineCitationCard({
  citationNum,
  source,
  showCitationBadge = true,
  className,
}: InlineCitationCardProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const domain = extractDomain(source.url);
  const faviconUrl = getFaviconUrl(source.url, source.favicon);
  const displaySnippet = truncateSnippet(source.snippet, 150);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(source.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleOpenLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(source.url, "_blank", "noopener,noreferrer");
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return "text-green-600 dark:text-green-400";
    if (score >= 0.7) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  return (
    <div className={cn("p-3", className)}>
      {/* Header: Favicon + Domain + Actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Favicon with loading state */}
          <div className="shrink-0 relative">
            {imageLoading && (
              <div className="absolute inset-0 size-5 rounded bg-muted animate-pulse" />
            )}
            {!imageError ? (
              <img
                src={faviconUrl}
                alt=""
                className={cn(
                  "size-5 rounded",
                  imageLoading && "opacity-0"
                )}
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="size-5 rounded bg-muted flex items-center justify-center">
                <Globe className="size-3 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Domain */}
          <span className="text-xs text-muted-foreground truncate">
            {domain}
          </span>

          {/* Citation badge */}
          {showCitationBadge && (
            <span className="shrink-0 text-xs font-medium text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
              [{citationNum}]
            </span>
          )}
        </div>

        {/* Copy button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleCopyLink}
          aria-label="Copy link"
        >
          {copied ? (
            <Check className="size-3.5 text-green-600 dark:text-green-400" />
          ) : (
            <Copy className="size-3.5 text-muted-foreground" />
          )}
        </Button>
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground mb-1.5 line-clamp-2 leading-snug">
        {source.title}
      </h4>

      {/* Snippet */}
      {source.snippet && (
        <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed mb-3">
          "{displaySnippet}"
        </p>
      )}

      {/* Footer: Relevance + Date + Open Button */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {source.relevanceScore !== undefined && (
            <span className={getRelevanceColor(source.relevanceScore)}>
              {Math.round(source.relevanceScore * 100)}% match
            </span>
          )}
          {source.publishedDate && (
            <>
              <span>•</span>
              <span>{source.publishedDate}</span>
            </>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={handleOpenLink}
        >
          Open
          <ExternalLink className="size-3" />
        </Button>
      </div>
    </div>
  );
});

InlineCitationCard.displayName = "InlineCitationCard";
```

### 2.3 InlineCitationCarousel Component

**File**: `src/components/ui/citations/inline-citation-carousel.tsx`

```typescript
"use client";

import { memo, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WebSearchSource } from "@/types/webSearch";
import { InlineCitationCard } from "./inline-citation-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

interface InlineCitationCarouselProps {
  citationNums: number[];
  sources: WebSearchSource[];
  className?: string;
}

export const InlineCitationCarousel = memo(function InlineCitationCarousel({
  citationNums,
  sources,
  className,
}: InlineCitationCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const totalSources = sources.length;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalSources - 1;

  const handlePrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [canGoPrev]);

  const handleNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [canGoNext]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    }
  }, [handlePrev, handleNext]);

  const currentSource = sources[currentIndex];
  const currentCitationNum = citationNums[currentIndex];

  if (!currentSource) {
    return null;
  }

  return (
    <div
      className={cn("flex flex-col", className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Citation carousel, showing source ${currentIndex + 1} of ${totalSources}`}
    >
      {/* Navigation Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handlePrev}
          disabled={!canGoPrev}
          aria-label="Previous source"
        >
          <ChevronLeft className="size-4" />
        </Button>

        <span className="text-xs text-muted-foreground font-medium">
          Source {currentIndex + 1} of {totalSources}
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label="Next source"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Card Content with Transition */}
      <div
        className={cn(
          "relative overflow-hidden",
          !prefersReducedMotion && "transition-all duration-200 ease-out"
        )}
      >
        <InlineCitationCard
          citationNum={currentCitationNum}
          source={currentSource}
          showCitationBadge={true}
        />
      </div>

      {/* Dot Indicators */}
      {totalSources > 1 && (
        <div
          className="flex items-center justify-center gap-1.5 py-2 border-t border-border/50"
          role="tablist"
          aria-label="Source indicators"
        >
          {sources.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                index === currentIndex
                  ? "bg-blue-500"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`Go to source ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
});

InlineCitationCarousel.displayName = "InlineCitationCarousel";
```

---

## Phase 3: Markdown Integration

### 3.1 Update Markdown Component Props

**File**: `src/components/prompt-kit/markdown.tsx`

```typescript
interface MarkdownProps {
  children: string;
  className?: string;
  id?: string;
  searchResults?: WebSearchResults | null;  // NEW: Rich source data
  hideSourcesFooter?: boolean;               // NEW: Option to hide footer
}
```

### 3.2 Enhanced Citation Parsing with Memoization

**File**: `src/components/prompt-kit/markdown.tsx` (update `parseCitations` function)

```typescript
import { useMemo, useCallback } from 'react';
import { InlineCitation } from '@/components/ui/citations';
import {
  matchCitationToSource,
  matchCitationsToSources,
  parseGroupedCitations
} from '@/components/ui/citations/citation-matcher';

// Inside Markdown component:

const Markdown = memo(function Markdown({
  children,
  className,
  id,
  searchResults,
  hideSourcesFooter = false
}: MarkdownProps) {

  // Extract sources with priority: searchResults > text-parsed
  const { sources, contentWithoutSources } = useMemo(() => {
    // Priority 1: Use structured search results if available
    if (searchResults?.sources && searchResults.sources.length > 0) {
      return {
        sources: searchResults.sources,
        contentWithoutSources: children.replace(/\*\*Sources:\*\*\s*[\s\S]*?$/i, '').trim()
      };
    }

    // Fallback: Parse from text (backward compatibility)
    return extractSources(children);
  }, [children, searchResults]);

  // Memoized citation parser with grouped citation support
  const parseCitationsWithGroups = useCallback(
    (text: string): React.ReactNode => {
      if (!sources.length) return text;

      const parsedCitations = parseGroupedCitations(text);
      if (parsedCitations.length === 0) return text;

      const result: React.ReactNode[] = [];
      let lastIndex = 0;

      parsedCitations.forEach((citation, idx) => {
        // Add text before this citation
        if (citation.index > lastIndex) {
          result.push(text.slice(lastIndex, citation.index));
        }

        if (citation.isGrouped) {
          // Grouped citation: [1][2][3] → Carousel
          const matchedSources = matchCitationsToSources(
            citation.numbers,
            searchResults,
            sources as any // Handle both types
          );

          if (matchedSources.length > 0) {
            result.push(
              <InlineCitation
                key={`group-${idx}`}
                citationNums={citation.numbers}
                sources={matchedSources as WebSearchSource[]}
              />
            );
          } else {
            // No matching sources, render as plain text
            result.push(`[${citation.numbers.join('][')}]`);
          }
        } else {
          // Single citation: [1] → Single card
          const source = matchCitationToSource(
            citation.numbers[0],
            searchResults,
            sources as any
          );

          if (source && 'snippet' in source) {
            result.push(
              <InlineCitation
                key={`single-${idx}`}
                citationNum={citation.numbers[0]}
                source={source}
              />
            );
          } else if (source) {
            // Basic source (from text parsing) - use simpler tooltip
            result.push(
              <a
                key={`basic-${idx}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mx-0.5"
                title={source.title}
              >
                [{citation.numbers[0]}]
              </a>
            );
          } else {
            result.push(`[${citation.numbers[0]}]`);
          }
        }

        // Update last index to skip the citation text
        const citationText = citation.isGrouped
          ? `[${citation.numbers.join('][')}]`
          : `[${citation.numbers[0]}]`;
        lastIndex = citation.index + citationText.length;
      });

      // Add remaining text after last citation
      if (lastIndex < text.length) {
        result.push(text.slice(lastIndex));
      }

      return result.length > 0 ? <>{result}</> : text;
    },
    [sources, searchResults]
  );

  // Memoize content rendering
  const renderedContent = useMemo(() => {
    // ... ReactMarkdown rendering with parseCitationsWithGroups
  }, [contentWithoutSources, parseCitationsWithGroups]);

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      {renderedContent}

      {/* Optional sources footer */}
      {!hideSourcesFooter && sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          {/* ... existing footer code ... */}
        </div>
      )}
    </div>
  );
});
```

### 3.3 Update MessageWithArtifacts

**File**: `src/components/MessageWithArtifacts.tsx`

```typescript
// Line 2: Fix import
import { Markdown } from "@/components/prompt-kit/markdown";

// Line 248-254: Pass searchResults to Markdown
<Markdown
  id={messageId}
  className="prose prose-sm prose-p:mb-3 prose-p:leading-relaxed max-w-none dark:prose-invert text-foreground text-[15px] leading-relaxed"
  searchResults={searchResults}  // NEW: Enable rich citations
>
  {cleanContent}
</Markdown>
```

---

## Phase 4: Mobile UX Strategy

### 4.1 Touch Device Detection Hook

**File**: `src/hooks/use-media-query.ts` (ensure this exists)

```typescript
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}
```

### 4.2 Mobile Behavior

| Device | Interaction | Result |
|--------|-------------|--------|
| Desktop (hover capable) | Hover over `[1]` | Show HoverCard |
| Desktop | Click `[1]` | Prevented, use "Open" button in card |
| Desktop | Click outside | Dismiss HoverCard |
| Mobile (touch) | Tap `[1]` | Navigate directly to URL |
| Mobile | No HoverCard | Direct navigation is faster UX |

### 4.3 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Focus next citation |
| Enter | Open HoverCard (desktop) or navigate (mobile) |
| Escape | Close HoverCard |
| ← Arrow | Previous source in carousel |
| → Arrow | Next source in carousel |

---

## Phase 5: Accessibility Requirements

### 5.1 ARIA Labels

```typescript
// Single citation
aria-label={`Source ${citationNum}: ${source.title}`}

// Grouped citations
aria-label={`View sources ${citationNums.join(', ')}`}

// Carousel region
role="region"
aria-label={`Citation carousel, showing source ${currentIndex + 1} of ${totalSources}`}

// Carousel dots
role="tablist"
aria-label="Source indicators"
```

### 5.2 Focus Management

- Return focus to trigger after HoverCard closes
- Trap focus within carousel when navigating with arrows
- Visible focus indicators on all interactive elements

### 5.3 Reduced Motion Support

```typescript
const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

<HoverCardContent
  className={cn(
    "transition-opacity",
    prefersReducedMotion ? "duration-0" : "duration-200"
  )}
/>
```

---

## Implementation Order

### Sprint 1: Foundation (Days 1-2)

| # | Task | Priority |
|---|------|----------|
| 1 | 🔴 Fix markdown import in `MessageWithArtifacts` | CRITICAL |
| 2 | Create `src/components/ui/citations/` directory | High |
| 3 | Implement `citation-matcher.ts` with grouped citation parsing | High |
| 4 | Create `InlineCitationCard` component | High |
| 5 | Add `searchResults` prop to `prompt-kit/markdown` | High |
| 6 | Implement basic memoization | High |

### Sprint 2: Rich Features (Days 3-4)

| # | Task | Priority |
|---|------|----------|
| 7 | Create `InlineCitation` wrapper with HoverCard | High |
| 8 | Implement `InlineCitationCarousel` | High |
| 9 | Add grouped citation detection | High |
| 10 | Mobile touch detection + direct navigation | High |
| 11 | Favicon loading with skeleton states | Medium |
| 12 | Dark mode styling verification | Medium |

### Sprint 3: Polish & Testing (Day 5)

| # | Task | Priority |
|---|------|----------|
| 13 | Keyboard navigation (Tab, Enter, Escape, Arrows) | High |
| 14 | Accessibility audit (ARIA, focus management) | High |
| 15 | Reduced motion support | Medium |
| 16 | Unit tests for citation-matcher | High |
| 17 | Integration tests for InlineCitation | Medium |
| 18 | Chrome DevTools MCP verification | High |

---

## File Changes Summary

### New Files

```
src/components/ui/citations/
├── index.ts                        # Exports
├── types.ts                        # TypeScript types
├── citation-matcher.ts             # Source matching + grouped parsing
├── inline-citation.tsx             # Main component
├── inline-citation-card.tsx        # HoverCard content
└── inline-citation-carousel.tsx    # Carousel for grouped
```

### Modified Files

```
src/components/MessageWithArtifacts.tsx    # Fix import + pass searchResults
src/components/prompt-kit/markdown.tsx     # Add props + enhanced parsing
src/hooks/use-media-query.ts               # Ensure exists for touch detection
```

---

## Testing Plan

### Unit Tests

```typescript
// citation-matcher.test.ts
describe('parseGroupedCitations', () => {
  it('detects single citations [1]', () => {...});
  it('detects grouped citations [1][2][3]', () => {...});
  it('detects comma-separated [1,2,3]', () => {...});
  it('handles mixed single and grouped', () => {...});
  it('ignores citations in code blocks', () => {...});
  it('handles citation at start/end of text', () => {...});
  it('handles malformed citations gracefully', () => {...});
});

describe('matchCitationToSource', () => {
  it('prioritizes searchResults over text sources', () => {...});
  it('falls back to text sources', () => {...});
  it('returns null for missing sources', () => {...});
});
```

### Integration Tests

```typescript
// InlineCitation.test.tsx
describe('InlineCitation', () => {
  it('renders single citation with HoverCard on desktop', () => {...});
  it('renders direct link on mobile', () => {...});
  it('renders carousel for grouped citations', () => {...});
  it('handles keyboard navigation', () => {...});
  it('respects reduced motion preference', () => {...});
});
```

### Edge Case Tests

```typescript
// Multiple citations in one word
"React[1][2][3] is great"

// Citation at boundaries
"[1] React is great"
"React is great [1]"

// Citation in code block (should NOT be parsed)
`const x = arr[1]`

// Missing source
"This is wrong [999]"

// Empty searchResults
searchResults={{ query: "test", sources: [], timestamp: Date.now() }}

// Backward compatibility (no searchResults)
<Markdown searchResults={null}>{"Text with [1] citation\n\n**Sources:**\n[1] [Title](url)"}</Markdown>
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| HoverCard load time | < 100ms |
| Citation parsing time | < 10ms for 50 citations |
| No layout shift (CLS) | < 0.1 |
| Accessibility score | 100% (axe-core) |
| Test coverage | 80%+ |
| Mobile tap success rate | 100% (direct navigation) |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Wrong markdown import | Fixed in Sprint 1, Task 1 |
| Performance with many citations | Memoization + lazy HoverCard |
| Mobile tap conflicts | Media query detection |
| HoverCard positioning | `collisionPadding` prop |
| Backward compatibility | Fallback to text-parsed sources |
| Streaming compatibility | searchResults arrives via SSE before message |

---

## References

- [AI SDK Inline Citation](https://ai-sdk.dev/elements/components/inline-citation)
- [shadcn/ui HoverCard](https://ui.shadcn.com/docs/components/hover-card)
- [Radix UI HoverCard API](https://www.radix-ui.com/primitives/docs/components/hover-card)
- Existing: `src/components/prompt-kit/markdown.tsx`
- Existing: `src/components/WebSearchSource.tsx`
