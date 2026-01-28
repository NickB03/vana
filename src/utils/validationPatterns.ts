/**
 * Shared validation patterns for artifact validation.
 * Single source of truth for regex patterns used across frontend and backend validation.
 *
 * USAGE:
 * - Frontend: Import directly from this file
 * - Backend: Copy to supabase/functions/_shared/validationPatterns.ts (Deno limitations)
 * - Keep both files synchronized manually until monorepo tooling is added
 *
 * INTEGRATION NOTES:
 * - XSS_PATTERNS matches both HTML and React - add context-aware logic in validators
 * - Patterns are intentionally generic - extend in consuming code for specific use cases
 * - See artifactValidator.ts for examples of stricter pattern variants
 *
 * Part of Track A: Artifact Validation Simplification (PR #A1)
 */

export const VALIDATION_PATTERNS = {
  /**
   * Import validation patterns
   * Global flag (g) required for counting multiple occurrences via .match()
   * Used in validation to report ALL violations, not just first occurrence
   */
  SHADCN_IMPORT: /@\/components\/ui\//g,
  LOCAL_IMPORT: /from ['"]\.\.?\//g,

  /**
   * Library detection patterns
   * Global flag (g) enables counting how many times libraries are imported
   * Useful for metrics and ensuring consistent library usage
   */
  RADIX_UI: /@radix-ui\//g,
  LUCIDE_REACT: /lucide-react/g,
  RECHARTS: /recharts/g,

  /**
   * Security patterns for dangerous HTML/JavaScript
   *
   * WARNING: XSS_PATTERNS matches BOTH dangerous HTML event handlers (onclick="...")
   * AND safe React event handlers (onClick={...}). Consuming code MUST differentiate:
   * - HTML artifacts: Block all matches
   * - React artifacts: Only block if followed by quotes (="), allow braces (={)
   *
   * See artifactValidator.ts:75 for correct usage with quote detection.
   *
   * DANGEROUS_HTML covers: <script>, <iframe>, javascript: URLs, data: URLs
   * Does NOT cover: <object>, <embed>, <meta refresh>, <base>, SVG attacks
   *
   * For comprehensive XSS prevention, combine with DOMPurify or CSP headers.
   */
  DANGEROUS_HTML: /<script|<iframe|javascript:|data:/gi,
  XSS_PATTERNS: /on\w+\s*=/gi,

  /**
   * Code structure patterns
   * No global flag needed - we only check for presence, not count occurrences
   */
  EXPORT_DEFAULT: /export\s+default\s+/,
  FUNCTION_COMPONENT: /^(?:export\s+default\s+)?function\s+\w+/m,
} as const;

export const VALIDATION_MESSAGES = {
  SHADCN_IMPORT_ERROR: 'Cannot use @/components/ui/* in artifacts. Use Radix UI primitives instead.',
  LOCAL_IMPORT_ERROR: 'Cannot use relative imports in artifacts. All dependencies must be from npm packages.',
  XSS_DETECTED: 'Potential XSS vulnerability detected in code.',
} as const;

// Type exports for consuming modules
export type ValidationPattern = keyof typeof VALIDATION_PATTERNS;
export type ValidationMessage = keyof typeof VALIDATION_MESSAGES;
