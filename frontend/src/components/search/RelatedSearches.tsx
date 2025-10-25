'use client'

import React from 'react'
import { Lightbulb, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { memoWithTracking } from '@/lib/react-performance'

interface RelatedSearch {
  query: string
  reason?: string | null
}

interface RelatedSearchesProps {
  searches: RelatedSearch[]
  onSearchClick?: (query: string) => void
  className?: string
}

/**
 * Displays related search suggestions to help users explore related topics.
 *
 * Features:
 * - Clickable search suggestions
 * - Explanatory reasons for each suggestion
 * - Visual hierarchy with icons
 * - Hover effects and transitions
 */
const RelatedSearches = memoWithTracking(({
  searches,
  onSearchClick,
  className
}: RelatedSearchesProps) => {
  if (searches.length === 0) return null

  const handleClick = (query: string) => {
    if (onSearchClick) {
      onSearchClick(query)
    }
  }

  return (
    <div className={cn("w-full space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-3">
        <Lightbulb className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">
          Related Searches
        </h3>
      </div>

      {/* Suggestions */}
      <div className="space-y-2">
        {searches.map((search, index) => (
          <Button
            key={`${search.query}-${index}`}
            variant="outline"
            onClick={() => handleClick(search.query)}
            className={cn(
              "group relative h-auto w-full justify-start gap-3 overflow-hidden px-4 py-3 text-left transition-all",
              "border-border/50 bg-card/30 hover:border-accent hover:bg-accent/10 hover:shadow-sm",
              onSearchClick && "cursor-pointer"
            )}
          >
            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {search.query}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-accent" />
              </div>
              {search.reason && (
                <p className="text-xs text-muted-foreground">
                  {search.reason}
                </p>
              )}
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Button>
        ))}
      </div>

      {/* Footer hint */}
      <p className="pt-2 text-center text-xs text-muted-foreground/70">
        Click any suggestion to search for related topics
      </p>
    </div>
  )
}, (prevProps, nextProps) => {
  // Compare searches array
  if (prevProps.searches.length !== nextProps.searches.length) return false
  if (prevProps.onSearchClick !== nextProps.onSearchClick) return false
  if (prevProps.className !== nextProps.className) return false

  // Compare each search
  for (let i = 0; i < prevProps.searches.length; i++) {
    const prev = prevProps.searches[i]
    const next = nextProps.searches[i]
    if (prev.query !== next.query || prev.reason !== next.reason) {
      return false
    }
  }

  return true
}, 'RelatedSearches')

RelatedSearches.displayName = 'RelatedSearches'

export default RelatedSearches
