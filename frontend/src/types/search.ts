/**
 * TypeScript types for Quick Search feature
 *
 * These types match the backend Pydantic models in app/models.py
 */

export interface SearchResult {
  title: string
  url: string
  snippet: string
  domain: string
  publishedDate?: string | null
  aiSummary: string
  credibilityScore: number
  relevanceScore: number
  faviconUrl?: string | null
  isHttps: boolean
}

export interface RelatedSearch {
  query: string
  reason?: string | null
}

export interface SearchResponse {
  query: string
  results: SearchResult[]
  relatedSearches: RelatedSearch[]
  totalResults: number
  searchTimeMs: number
  timestamp: string
}

/**
 * Type guard to check if a response contains search results
 */
export function isSearchResponse(data: any): data is SearchResponse {
  return (
    data &&
    typeof data === 'object' &&
    'query' in data &&
    'results' in data &&
    'relatedSearches' in data &&
    Array.isArray(data.results) &&
    Array.isArray(data.relatedSearches)
  )
}
