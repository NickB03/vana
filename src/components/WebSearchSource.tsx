import { memo, useState } from "react";
import { ExternalLink, Copy, Check, Globe } from "lucide-react";
import { WebSearchSource as WebSearchSourceType } from "@/types/webSearch";
import { extractDomain, truncateSnippet, getFaviconUrl } from "@/types/webSearch";
import { cn } from "@/lib/utils";

interface WebSearchSourceProps {
  source: WebSearchSourceType;
  className?: string;
  compact?: boolean;
}

/**
 * Individual web search source card
 *
 * Features:
 * - Favicon display with fallback to Google's service
 * - Truncated snippet with domain attribution
 * - Click to open in new tab
 * - Copy link to clipboard action
 * - Responsive design (mobile-friendly)
 */
export const WebSearchSource = memo(function WebSearchSource({
  source,
  className = "",
  compact = false,
}: WebSearchSourceProps) {
  const [copied, setCopied] = useState(false);
  const [imageError, setImageError] = useState(false);

  const domain = extractDomain(source.url);
  const faviconUrl = getFaviconUrl(source.url, source.favicon);
  const displaySnippet = compact
    ? truncateSnippet(source.snippet, 120)
    : truncateSnippet(source.snippet, 200);

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

  const handleOpenLink = () => {
    window.open(source.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-border/40 bg-card/30 p-3 transition-all hover:border-border/60 hover:bg-card/50 cursor-pointer",
        className
      )}
      onClick={handleOpenLink}
      role="article"
      aria-label={`Search result: ${source.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Favicon */}
        <div className="shrink-0 mt-0.5">
          {!imageError ? (
            <img
              src={faviconUrl}
              alt=""
              className="size-5 rounded"
              onError={() => setImageError(true)}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="size-5 rounded bg-muted flex items-center justify-center">
              <Globe className="size-3 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-medium text-foreground mb-1 line-clamp-2 leading-snug">
            {source.title}
          </h4>

          {/* Snippet */}
          <p className="text-xs text-muted-foreground/80 line-clamp-3 leading-relaxed mb-2">
            {displaySnippet}
          </p>

          {/* Domain */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
            <span className="truncate">{domain}</span>
            {source.relevanceScore !== undefined && (
              <span className="shrink-0">
                • {Math.round(source.relevanceScore * 100)}% match
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
            aria-label="Copy link"
            title="Copy link"
          >
            {copied ? (
              <Check className="size-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="size-3.5 text-muted-foreground/60" />
            )}
          </button>

          {/* Open in New Tab */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenLink();
            }}
            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
            aria-label="Open in new tab"
            title="Open in new tab"
          >
            <ExternalLink className="size-3.5 text-muted-foreground/60" />
          </button>
        </div>
      </div>
    </div>
  );
});

WebSearchSource.displayName = 'WebSearchSource';
