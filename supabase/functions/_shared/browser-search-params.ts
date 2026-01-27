/**
 * Browser Search Parameter Validation
 *
 * Pure validation functions for browser.search tool parameters.
 * Extracted for testability and reuse.
 *
 * @module browser-search-params
 */

/**
 * Default value for maxResults parameter
 */
export const DEFAULT_MAX_RESULTS = 5;

/**
 * Minimum allowed value for maxResults
 */
export const MIN_MAX_RESULTS = 1;

/**
 * Maximum allowed value for maxResults
 */
export const MAX_MAX_RESULTS = 10;

/**
 * Default value for searchDepth parameter
 */
export const DEFAULT_SEARCH_DEPTH = 'basic' as const;

/**
 * Valid searchDepth values
 */
export const VALID_SEARCH_DEPTHS = ['basic', 'advanced'] as const;
export type SearchDepth = typeof VALID_SEARCH_DEPTHS[number];

/**
 * Validates and normalizes the maxResults parameter.
 *
 * Rules:
 * - Defaults to 5 when not provided or invalid
 * - Clamps values to 1-10 range (including Infinity/-Infinity)
 * - Rounds decimal values using Math.round
 * - Returns default for NaN or non-numeric values
 *
 * @param value - The maxResults value from the tool call arguments
 * @returns Validated maxResults value (1-10)
 *
 * @example
 * ```typescript
 * validateMaxResults(undefined)  // 5 (default)
 * validateMaxResults(3.7)        // 4 (rounded)
 * validateMaxResults(0)          // 1 (clamped)
 * validateMaxResults(15)         // 10 (clamped)
 * validateMaxResults(Infinity)   // 10 (clamped to max)
 * validateMaxResults(-Infinity)  // 1 (clamped to min)
 * validateMaxResults(NaN)        // 5 (default)
 * validateMaxResults("5")        // 5 (default - non-numeric)
 * ```
 */
export function validateMaxResults(value: number | undefined): number {
  // Return default for undefined, null, or non-numeric values
  if (value === undefined || value === null || typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_MAX_RESULTS;
  }

  // Clamp Infinity values to bounds
  if (value === Infinity) return MAX_MAX_RESULTS;
  if (value === -Infinity) return MIN_MAX_RESULTS;

  // Round and clamp to valid range (1-10)
  const rounded = Math.round(value);
  return Math.max(MIN_MAX_RESULTS, Math.min(MAX_MAX_RESULTS, rounded));
}

/**
 * Validates and normalizes the searchDepth parameter.
 *
 * Rules:
 * - Defaults to 'basic' when not provided or invalid
 * - Only accepts exact string matches: 'basic' or 'advanced'
 * - Case-sensitive (no uppercase variants)
 * - Non-string values return 'basic'
 *
 * @param value - The searchDepth value from the tool call arguments
 * @returns Validated searchDepth value ('basic' or 'advanced')
 *
 * @example
 * ```typescript
 * validateSearchDepth(undefined)   // 'basic' (default)
 * validateSearchDepth('advanced')  // 'advanced'
 * validateSearchDepth('basic')     // 'basic'
 * validateSearchDepth('Advanced')  // 'basic' (case sensitive)
 * validateSearchDepth(123)         // 'basic' (non-string)
 * ```
 */
export function validateSearchDepth(value: string | undefined): SearchDepth {
  // Return 'advanced' for exact match, otherwise default to 'basic'
  return value === 'advanced' ? 'advanced' : DEFAULT_SEARCH_DEPTH;
}
