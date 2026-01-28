/**
 * Type Safety Examples for SkillAction Generic Parameters
 *
 * This file demonstrates the compile-time type safety improvements
 * for SkillAction parameter definitions. These examples verify that
 * TypeScript correctly enforces type consistency between parameter
 * schemas and execute functions.
 *
 * ## Usage Patterns
 *
 * ### Type-Safe Pattern (Recommended)
 * Use `defineAction()` helper with `as const` on parameters array
 * to enable full type inference and compile-time error checking.
 *
 * ```typescript
 * const myAction = defineAction({
 *   parameters: [
 *     { name: 'query', type: 'string', required: true },
 *   ] as const,
 *   execute: async (params, context) => {
 *     // params.query is typed as `string`
 *     return { success: true };
 *   },
 * });
 * ```
 *
 * ### Legacy Pattern (Backward Compatible)
 * Plain `SkillAction` type annotation still works with manual casts.
 *
 * @module skills/type-safety-examples
 * @since 2026-01-27
 */

import type {
  ActionParameter,
  ActionResult,
  ExtractActionParams,
  SkillAction,
  SkillContext,
} from './types.ts';
import { defineAction } from './types.ts';

// =============================================================================
// Type-Safe Pattern Examples (Recommended)
// =============================================================================

/**
 * Example 1: Basic type-safe action with string and number parameters
 *
 * Use `defineAction()` helper with `as const` on parameters array
 * to enable full type inference in the execute function.
 */
export const searchAction = defineAction({
  id: 'search',
  name: 'Search',
  description: 'Search with type-safe parameters',
  parameters: [
    { name: 'query', type: 'string', required: true, description: 'Search query' },
    { name: 'maxResults', type: 'number', required: false, description: 'Max results' },
  ] as const, // <-- Required for type inference
  execute: async (params, _context) => {
    // TypeScript knows:
    // - params.query is `string` (required)
    // - params.maxResults is `number | undefined` (optional)

    const query: string = params.query; // Works - correct type
    const limit: number = params.maxResults ?? 10; // Works - optional with default

    // Compile-time error examples (uncomment to see errors):
    // const bad = params.nonexistent; // Error: Property 'nonexistent' does not exist
    // const wrong: number = params.query; // Error: Type 'string' not assignable to 'number'

    return {
      success: true,
      data: { query, limit },
    };
  },
});

/**
 * Example 2: Type-safe action with all parameter types
 */
export const allTypesAction = defineAction({
  id: 'all-types',
  name: 'All Types Demo',
  description: 'Demonstrates all supported parameter types',
  parameters: [
    { name: 'text', type: 'string', required: true },
    { name: 'count', type: 'number', required: true },
    { name: 'enabled', type: 'boolean', required: true },
    { name: 'optionalText', type: 'string', required: false },
    { name: 'optionalCount', type: 'number', required: false },
    { name: 'optionalFlag', type: 'boolean', required: false },
  ] as const,
  execute: async (params, _context) => {
    // Required parameters - guaranteed to have values
    const text: string = params.text;
    const count: number = params.count;
    const enabled: boolean = params.enabled;

    // Optional parameters - may be undefined
    const optText: string | undefined = params.optionalText;
    const optCount: number | undefined = params.optionalCount;
    const optFlag: boolean | undefined = params.optionalFlag;

    return {
      success: true,
      data: { text, count, enabled, optText, optCount, optFlag },
    };
  },
});

/**
 * Example 3: Type-safe action with typed return data
 */
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export const typedResultAction = defineAction({
  id: 'typed-result',
  name: 'Typed Result Demo',
  description: 'Action with typed return data',
  parameters: [
    { name: 'query', type: 'string', required: true },
  ] as const,
  execute: async (params, _context): Promise<ActionResult<SearchResult[]>> => {
    const results: SearchResult[] = [
      {
        title: 'Example Result',
        url: 'https://example.com',
        snippet: `Found results for: ${params.query}`,
      },
    ];

    return {
      success: true,
      data: results,
    };
  },
});

// =============================================================================
// Legacy Pattern (Backward Compatible)
// =============================================================================

/**
 * Example 4: Legacy action definition (still works)
 *
 * Using plain `SkillAction` type annotation provides backward compatibility.
 * Parameters are typed as `Record<string, unknown>`, requiring manual casts.
 */
export const legacyAction: SkillAction = {
  id: 'legacy',
  name: 'Legacy Action',
  description: 'Backward compatible pattern',
  parameters: [
    { name: 'input', type: 'string', required: true },
    { name: 'count', type: 'number', required: false },
  ],
  execute: async (params, _context: SkillContext) => {
    // Manual type assertions still work
    const input = params.input as string;
    const count = (params.count as number | undefined) ?? 10;

    return {
      success: true,
      data: { input, count },
    };
  },
};

// =============================================================================
// Type Utility Examples
// =============================================================================

/**
 * Example 5: Using ExtractActionParams directly
 *
 * You can use the type utility to extract parameter types for
 * reuse in other type definitions.
 */
const searchParams = [
  { name: 'query', type: 'string', required: true },
  { name: 'filters', type: 'string', required: false },
] as const;

// Extract the parameter types for reuse
type SearchParams = ExtractActionParams<typeof searchParams>;

// Use in function signatures
function processSearchParams(params: SearchParams): string {
  return params.query + (params.filters ? ` (filtered: ${params.filters})` : '');
}

// Verify it works at runtime
const _result = processSearchParams({ query: 'test', filters: undefined });

// =============================================================================
// Error Case Documentation (Compile-Time Errors)
// =============================================================================

/*
 * The following examples demonstrate compile-time errors that the type system
 * now catches. Uncomment any section to see the TypeScript error.
 */

/*
// ERROR 1: Accessing non-existent parameter
const errorAction1 = {
  parameters: [
    { name: 'query', type: 'string', required: true },
  ] as const,
  execute: async (params) => {
    const bad = params.nonexistent; // Error: Property 'nonexistent' does not exist
    return { success: true };
  },
} satisfies SkillAction;
*/

/*
// ERROR 2: Wrong type assignment
const errorAction2 = {
  parameters: [
    { name: 'query', type: 'string', required: true },
  ] as const,
  execute: async (params) => {
    const wrong: number = params.query; // Error: Type 'string' not assignable to 'number'
    return { success: true };
  },
} satisfies SkillAction;
*/

/*
// ERROR 3: Treating optional as required
const errorAction3 = {
  parameters: [
    { name: 'optional', type: 'number', required: false },
  ] as const,
  execute: async (params) => {
    // This would be unsafe - optional could be undefined
    const value: number = params.optional; // Error: Type 'number | undefined' not assignable to 'number'
    return { success: true };
  },
} satisfies SkillAction;
*/
