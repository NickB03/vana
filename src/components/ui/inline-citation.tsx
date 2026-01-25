import * as React from "react";
import { memo, useState, useCallback, useEffect, forwardRef } from "react";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import type { CitationSource } from "@/types/citation";

// Re-export for consumers
export type { CitationSource };

/**
 * Props for the InlineCitation component
 */
export interface InlineCitationProps {
  /** Array of citation sources to display */
  sources: CitationSource[];
  /** Optional class name for the trigger badge */
  className?: string;
  /** Optional children to wrap (defaults to badge) */
  children?: React.ReactNode;
}

/**
 * Extract domain name from URL for display
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Get favicon URL from domain (uses Google's favicon service as fallback)
 */
function getFaviconUrl(url: string, providedFavicon?: string): string {
  if (providedFavicon) return providedFavicon;
  try {
    const domain = extractDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return `https://www.google.com/s2/favicons?domain=example.com&sz=32`;
  }
}

/**
 * Citation trigger badge component
 * Shows domain name + additional source count (e.g., "example.com +5")
 * Uses forwardRef for Radix UI HoverCard compatibility
 */
const CitationTrigger = forwardRef<
  HTMLSpanElement,
  {
    sources: CitationSource[];
    className?: string;
  }
>(function CitationTrigger({ sources, className, ...props }, ref) {
  const sourceCount = sources.length;
  const primaryDomain = extractDomain(sources[0]?.url || '');
  const additionalCount = sourceCount > 1 ? sourceCount - 1 : 0;

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 cursor-pointer align-baseline",
        "rounded-md bg-muted hover:bg-muted/80 px-1.5 py-0.5",
        "text-xs font-medium text-muted-foreground hover:text-foreground",
        "transition-colors duration-150",
        "border border-border/50 hover:border-border",
        className
      )}
      {...props}
    >
      <span className="truncate max-w-[120px]">{primaryDomain}</span>
      {additionalCount > 0 && (
        <span className="text-muted-foreground/60">+{additionalCount}</span>
      )}
    </span>
  );
});

CitationTrigger.displayName = "CitationTrigger";

/**
 * Single citation source card
 * Displays title, snippet, and URL with favicon
 */
const CitationCard = memo(function CitationCard({
  source,
}: {
  source: CitationSource;
}) {
  const domain = extractDomain(source.url);
  const faviconUrl = getFaviconUrl(source.url, source.favicon);

  return (
    <div className="space-y-2.5">
      {/* Title */}
      <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
        {source.title}
      </h4>

      {/* Snippet/Description */}
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
        {truncateText(source.snippet, 200)}
      </p>

      {/* Domain footer with favicon and external link */}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          "hover:text-foreground transition-colors group"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={faviconUrl}
          alt=""
          className="w-4 h-4 rounded-sm"
          loading="lazy"
          onError={(e) => {
            // Hide broken favicon images
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <span className="truncate flex-1">{domain}</span>
        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    </div>
  );
});

CitationCard.displayName = "CitationCard";

/**
 * Simple navigation controls
 * Shows prev/next buttons and current page indicator at top
 */
const NavigationControls = memo(function NavigationControls({
  currentIndex,
  totalCount,
  onPrev,
  onNext,
  canScrollPrev,
  canScrollNext,
}: {
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
}) {
  return (
    <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={onPrev}
          disabled={!canScrollPrev}
          aria-label="Previous source"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md"
          onClick={onNext}
          disabled={!canScrollNext}
          aria-label="Next source"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {currentIndex + 1}/{totalCount}
      </span>
    </div>
  );
});

NavigationControls.displayName = "NavigationControls";

/**
 * InlineCitation - Hoverable citation badge with source preview navigation
 *
 * Displays a compact badge showing the primary domain and additional source count.
 * On hover, shows a card with source details and simple prev/next navigation
 * for multiple sources.
 *
 * @example
 * ```tsx
 * <InlineCitation
 *   sources={[
 *     { citationNumber: 1, title: "Article", url: "https://example.com", snippet: "..." },
 *     { citationNumber: 2, title: "Study", url: "https://research.org", snippet: "..." },
 *   ]}
 * />
 * ```
 */
export const InlineCitation = memo(function InlineCitation({
  sources,
  className,
  children,
}: InlineCitationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Reset to first source when hover opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(0);
    }
  }, [isOpen]);

  const scrollPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const scrollNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(sources.length - 1, prev + 1));
  }, [sources.length]);

  // Don't render if no sources
  if (!sources || sources.length === 0) {
    return null;
  }

  const currentSource = sources[currentIndex];

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={setIsOpen}
      openDelay={200}
      closeDelay={100}
    >
      <HoverCardTrigger asChild>
        {children || (
          <CitationTrigger sources={sources} className={className} />
        )}
      </HoverCardTrigger>

      <HoverCardContent
        className="w-80 px-4 pt-1.5 pb-4"
        align="start"
        sideOffset={8}
      >
        <NavigationControls
          currentIndex={currentIndex}
          totalCount={sources.length}
          onPrev={scrollPrev}
          onNext={scrollNext}
          canScrollPrev={currentIndex > 0}
          canScrollNext={currentIndex < sources.length - 1}
        />
        <CitationCard source={currentSource} />
      </HoverCardContent>
    </HoverCard>
  );
});

InlineCitation.displayName = "InlineCitation";

/**
 * Export subcomponents for custom composition
 */
export { CitationTrigger, CitationCard, NavigationControls };
