import { z } from "zod";

/**
 * Zod schema for citation source data structure
 * Matches the WebSearchSource schema from Tavily integration
 */
export const CitationSourceSchema = z.object({
  /** Citation marker number [1], [2], etc. */
  citationNumber: z.number().int().positive(),
  /** Source page title */
  title: z.string().min(1),
  /** Full URL to source */
  url: z.string().url(),
  /** Snippet/description from the source */
  snippet: z.string().min(1),
  /** Optional favicon URL */
  favicon: z.string().url().optional(),
  /** Optional relevance score 0-1 */
  relevanceScore: z.number().min(0).max(1).optional(),
  /** Optional published date (ISO 8601 format) */
  publishedDate: z.string().optional(),
});

/**
 * TypeScript type inferred from CitationSourceSchema
 * Use this for type annotations throughout the application
 */
export type CitationSource = z.infer<typeof CitationSourceSchema>;

/**
 * Zod schema for grouped consecutive citations
 * Used when multiple citations appear at the same text position
 * Note: sources array can be empty when citation numbers don't have corresponding sources
 */
export const CitationGroupSchema = z.object({
  /** Character offset in text where citations appear */
  position: z.number().int().nonnegative(),
  /** Array of citation numbers (e.g., [1, 2, 3] for consecutive citations) */
  citationNumbers: z.array(z.number().int().positive()).min(1),
  /** Array of citation sources for this group (can be empty for missing sources) */
  sources: z.array(CitationSourceSchema),
  /** Primary domain (first source's domain) for badge display */
  primaryDomain: z.string().min(1),
});

/**
 * TypeScript type inferred from CitationGroupSchema
 * Use this for type annotations throughout the application
 */
export type CitationGroup = z.infer<typeof CitationGroupSchema>;

/**
 * Validates and parses a citation source object
 * Throws ZodError if validation fails
 *
 * @param data - Raw citation source data to validate
 * @returns Validated CitationSource object
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * const source = parseCitationSource({
 *   citationNumber: 1,
 *   title: "Example Article",
 *   url: "https://example.com",
 *   snippet: "This is a snippet from the article",
 * });
 * ```
 */
export function parseCitationSource(data: unknown): CitationSource {
  return CitationSourceSchema.parse(data);
}

/**
 * Validates and parses a citation group object
 * Throws ZodError if validation fails
 *
 * @param data - Raw citation group data to validate
 * @returns Validated CitationGroup object
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * const group = parseCitationGroup({
 *   position: 42,
 *   citationNumbers: [1, 2],
 *   sources: [...],
 *   primaryDomain: "example.com",
 * });
 * ```
 */
export function parseCitationGroup(data: unknown): CitationGroup {
  return CitationGroupSchema.parse(data);
}

/**
 * Safe parsing variant that returns a Result type instead of throwing
 * Useful for error handling without try/catch blocks
 *
 * @param data - Raw citation source data to validate
 * @returns Zod SafeParseReturnType with success boolean and data/error
 *
 * @example
 * ```typescript
 * const result = safeParseCitationSource(untrustedData);
 * if (result.success) {
 *   console.log(result.data.title);
 * } else {
 *   console.error(result.error.errors);
 * }
 * ```
 */
export function safeParseCitationSource(data: unknown) {
  return CitationSourceSchema.safeParse(data);
}

/**
 * Safe parsing variant for citation groups
 * Returns a Result type instead of throwing
 *
 * @param data - Raw citation group data to validate
 * @returns Zod SafeParseReturnType with success boolean and data/error
 *
 * @example
 * ```typescript
 * const result = safeParseCitationGroup(untrustedData);
 * if (result.success) {
 *   console.log(result.data.primaryDomain);
 * } else {
 *   console.error(result.error.errors);
 * }
 * ```
 */
export function safeParseCitationGroup(data: unknown) {
  return CitationGroupSchema.safeParse(data);
}

/**
 * Validates an array of citation sources
 * Useful for bulk validation of search results
 *
 * @param data - Array of raw citation source data
 * @returns Array of validated CitationSource objects
 * @throws {z.ZodError} If any source fails validation
 *
 * @example
 * ```typescript
 * const sources = parseCitationSourceArray([
 *   { citationNumber: 1, title: "Source 1", url: "https://example.com", snippet: "..." },
 *   { citationNumber: 2, title: "Source 2", url: "https://test.com", snippet: "..." },
 * ]);
 * ```
 */
export function parseCitationSourceArray(data: unknown): CitationSource[] {
  return z.array(CitationSourceSchema).parse(data);
}
