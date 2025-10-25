'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ExternalLink, Lock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { memoWithTracking } from '@/lib/react-performance'

interface SearchResultCardProps {
  title: string
  url: string
  domain: string
  snippet: string
  aiSummary: string
  credibilityScore: number
  relevanceScore: number
  publishedDate?: string | null
  faviconUrl?: string | null
  isHttps: boolean
  className?: string
}

/**
 * Displays an individual search result with AI-enhanced summary and scoring.
 *
 * Features:
 * - Title and clickable URL
 * - Domain with HTTPS indicator
 * - Snippet from search engine
 * - AI-generated summary (2-3 sentences)
 * - Credibility score badge (source trust)
 * - Relevance score badge (query match)
 * - Published date (if available)
 */
const SearchResultCard = memoWithTracking(({
  title,
  url,
  domain,
  snippet,
  aiSummary,
  credibilityScore,
  relevanceScore,
  publishedDate,
  faviconUrl,
  isHttps,
  className
}: SearchResultCardProps) => {
  // Format scores as percentages
  const credibilityPercent = Math.round(credibilityScore * 100)
  const relevancePercent = Math.round(relevanceScore * 100)

  // Determine badge colors based on score thresholds
  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (score >= 0.6) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  }

  // Format published date
  const formatDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return null
    }
  }

  const formattedDate = formatDate(publishedDate)

  return (
    <Card className={cn(
      "group relative overflow-hidden border-border/50 bg-card/50 p-4 transition-all hover:border-accent hover:bg-card/80 hover:shadow-md",
      className
    )}>
      {/* Header: Title + URL */}
      <div className="mb-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link inline-flex items-start gap-2 text-lg font-semibold text-foreground transition-colors hover:text-accent"
        >
          <span className="line-clamp-2">{title}</span>
          <ExternalLink className="mt-1 h-4 w-4 flex-shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
        </a>
      </div>

      {/* Domain + HTTPS + Date */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {faviconUrl && (
            <img
              src={faviconUrl}
              alt=""
              className="h-4 w-4"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          )}
          <span className="font-medium">{domain}</span>
          {isHttps && (
            <Lock className="h-3 w-3 text-green-600 dark:text-green-400" />
          )}
        </div>
        {formattedDate && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          </>
        )}
      </div>

      {/* AI Summary */}
      <div className="mb-3 rounded-md bg-accent/10 p-3 text-sm">
        <p className="text-foreground/90">
          <span className="font-semibold text-accent">AI Summary: </span>
          {aiSummary}
        </p>
      </div>

      {/* Original Snippet */}
      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
        {snippet}
      </p>

      {/* Scores */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-medium",
            getScoreColor(credibilityScore)
          )}
        >
          Trust: {credibilityPercent}%
        </Badge>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-medium",
            getScoreColor(relevanceScore)
          )}
        >
          Relevance: {relevancePercent}%
        </Badge>
      </div>
    </Card>
  )
}, (prevProps, nextProps) => {
  // Optimize re-renders by comparing all props
  return (
    prevProps.title === nextProps.title &&
    prevProps.url === nextProps.url &&
    prevProps.domain === nextProps.domain &&
    prevProps.snippet === nextProps.snippet &&
    prevProps.aiSummary === nextProps.aiSummary &&
    prevProps.credibilityScore === nextProps.credibilityScore &&
    prevProps.relevanceScore === nextProps.relevanceScore &&
    prevProps.publishedDate === nextProps.publishedDate &&
    prevProps.faviconUrl === nextProps.faviconUrl &&
    prevProps.isHttps === nextProps.isHttps &&
    prevProps.className === nextProps.className
  )
}, 'SearchResultCard')

SearchResultCard.displayName = 'SearchResultCard'

export default SearchResultCard
