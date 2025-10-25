'use client'

import React from 'react'
import { Search, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { memoWithTracking } from '@/lib/react-performance'
import SearchResultCard from './SearchResultCard'

interface SearchResult {
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
}

interface SearchResultsProps {
  query: string
  results: SearchResult[]
  totalResults: number
  searchTimeMs?: number
  className?: string
}

/**
 * Displays a list of search results with query header and metadata.
 *
 * Features:
 * - Query header with search icon
 * - Results count and search time
 * - Grid of SearchResultCard components
 * - Responsive layout (1 column mobile, 2 columns tablet+)
 */
const SearchResults = memoWithTracking(({
  query,
  results,
  totalResults,
  searchTimeMs = 0,
  className
}: SearchResultsProps) => {
  // Format search time
  const formatSearchTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border/50 pb-4">
        <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/20">
          <Search className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground">
            Search Results
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-medium">"{query}"</span>
            {' • '}
            {totalResults} {totalResults === 1 ? 'result' : 'results'}
            {searchTimeMs > 0 && (
              <>
                {' • '}
                <span className="text-accent">{formatSearchTime(searchTimeMs)}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-1">
          {results.map((result, index) => (
            <SearchResultCard
              key={`${result.url}-${index}`}
              {...result}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">
            No results found
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Try a different search query or check your spelling
          </p>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Deep comparison for results array
  if (prevProps.results.length !== nextProps.results.length) return false
  if (prevProps.query !== nextProps.query) return false
  if (prevProps.totalResults !== nextProps.totalResults) return false
  if (prevProps.searchTimeMs !== nextProps.searchTimeMs) return false
  if (prevProps.className !== nextProps.className) return false

  // Compare each result
  for (let i = 0; i < prevProps.results.length; i++) {
    const prev = prevProps.results[i]
    const next = nextProps.results[i]
    if (
      prev.url !== next.url ||
      prev.title !== next.title ||
      prev.aiSummary !== next.aiSummary
    ) {
      return false
    }
  }

  return true
}, 'SearchResults')

SearchResults.displayName = 'SearchResults'

export default SearchResults
