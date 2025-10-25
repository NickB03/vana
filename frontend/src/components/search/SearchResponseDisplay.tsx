'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { memoWithTracking } from '@/lib/react-performance'
import SearchResults from './SearchResults'
import RelatedSearches from './RelatedSearches'
import type { SearchResponse } from '@/types/search'

interface SearchResponseDisplayProps {
  searchResponse: SearchResponse
  onRelatedSearchClick?: (query: string) => void
  className?: string
}

/**
 * Displays a complete search response including results and related searches.
 *
 * This component combines SearchResults and RelatedSearches into a unified display
 * that matches the backend SearchResponse Pydantic model.
 *
 * Features:
 * - Search results grid with AI summaries and scoring
 * - Related search suggestions
 * - Performance-optimized with memoization
 * - Responsive layout
 */
const SearchResponseDisplay = memoWithTracking(({
  searchResponse,
  onRelatedSearchClick,
  className
}: SearchResponseDisplayProps) => {
  const {
    query,
    results,
    relatedSearches,
    totalResults,
    searchTimeMs
  } = searchResponse

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Search Results */}
      <SearchResults
        query={query}
        results={results}
        totalResults={totalResults}
        searchTimeMs={searchTimeMs}
      />

      {/* Related Searches */}
      {relatedSearches && relatedSearches.length > 0 && (
        <RelatedSearches
          searches={relatedSearches}
          onSearchClick={onRelatedSearchClick}
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Shallow comparison of searchResponse object
  return (
    prevProps.searchResponse === nextProps.searchResponse &&
    prevProps.onRelatedSearchClick === nextProps.onRelatedSearchClick &&
    prevProps.className === nextProps.className
  )
}, 'SearchResponseDisplay')

SearchResponseDisplay.displayName = 'SearchResponseDisplay'

export default SearchResponseDisplay
