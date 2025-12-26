import { z } from 'zod';
import * as Sentry from '@sentry/react';

/**
 * Zod schemas for runtime validation of reasoning steps
 * Prevents crashes from malformed AI-generated data
 */

/**
 * Trim all whitespace including Unicode variants (zero-width spaces, NBSP, etc.)
 * Common in AI-generated content where invisible characters may appear
 */
const trimAllWhitespace = (s: string): string =>
  s.replace(/^[\s\u200B-\u200D\uFEFF\u00A0]+|[\s\u200B-\u200D\uFEFF\u00A0]+$/g, '');

/**
 * Icon validation for reasoning steps
 *
 * @remarks
 * Icons must be one of: 'search', 'lightbulb', 'target', 'sparkles'.
 * Invalid icons cause validation errors (no graceful fallback).
 *
 * **Frontend Validation Behavior**: The frontend uses strict Zod validation (line 48)
 * without normalization. Invalid icons are rejected, causing `parseReasoningSteps()`
 * to return `null` for the entire reasoning object. This is intentional - it forces
 * the GLM API to send valid icons instead of silently accepting bad data.
 *
 * Icon is optional; if omitted, `getIconComponent()` returns `null` and the UI
 * renders without an icon.
 *
 * **Note**: The backend has a `normalizeReasoningIcon()` helper that provides graceful
 * fallback, but frontend validation deliberately does not use normalization to
 * enforce strict API contracts.
 *
 * @see DEFAULT_PHASE_ICONS in supabase/functions/_shared/reasoning-types.ts for default icon mapping per phase
 * @see getIconComponent() in src/components/prompt-kit/chain-of-thought-utils.tsx for UI rendering
 */

// Runtime validation schema for reasoning steps
export const ReasoningStepSchema = z.object({
  phase: z.enum(['research', 'analysis', 'solution', 'custom']),
  // FIX: Validate trimmed length without mutating original data
  // Uses refine() instead of transform() to preserve original data for debugging
  title: z.string()
    .refine(s => trimAllWhitespace(s).length > 0, {
      message: "Title cannot be empty or whitespace-only"
    })
    .refine(s => trimAllWhitespace(s).length <= 500, {
      message: "Title exceeds maximum length"
    }),
  icon: z.enum(['search', 'lightbulb', 'target', 'sparkles']).optional(),
  // FIX: Validate trimmed items without mutation
  items: z.array(
    z.string()
      .refine(s => trimAllWhitespace(s).length > 0, {
        message: "Item cannot be empty or whitespace-only"
      })
      .refine(s => trimAllWhitespace(s).length <= 2000, {
        message: "Item exceeds maximum length"
      })
  ).min(1).max(20),
  timestamp: z.number().optional(),
});

export const StructuredReasoningSchema = z.object({
  // Allow empty steps array - backend may send empty steps for searches without reasoning
  // hasStructuredContent check (validatedSteps && totalSections > 0) handles display logic
  steps: z.array(ReasoningStepSchema).min(0).max(10),
  summary: z.string().max(1000).optional(),
});

// Infer TypeScript types from Zod schemas (single source of truth)
export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;
export type StructuredReasoning = z.infer<typeof StructuredReasoningSchema>;

// Configuration constants
export const REASONING_CONFIG = {
  MAX_STEPS: 10,
  MAX_ITEMS_PER_STEP: 20,
  MAX_TITLE_LENGTH: 500,
  MAX_ITEM_LENGTH: 2000,
  MAX_SUMMARY_LENGTH: 1000,
  INITIAL_VISIBLE_ITEMS: 5,
  ENABLE_VIRTUALIZATION_THRESHOLD: 5,
} as const;

/**
 * Safe parsing function with error logging
 * Returns null if validation fails (graceful degradation)
 *
 * Uses rate-limited logging to avoid console spam during React re-renders.
 */
// Track last logged error to rate-limit logging (prevent console spam)
let lastLoggedError: string | null = null;
let lastLogTime = 0;
const LOG_THROTTLE_MS = 5000; // Only log same error once per 5 seconds

/**
 * Reset the rate-limiting state (for testing purposes)
 * @internal
 */
export function _resetParserLogState(): void {
  lastLoggedError = null;
  lastLogTime = 0;
}

export function parseReasoningSteps(data: unknown): StructuredReasoning | null {
  // Early return for null/undefined - these are expected cases, not errors
  if (data === null || data === undefined) {
    return null;
  }

  // Quick structural check before Zod parsing to avoid noisy errors
  // for clearly invalid data (like error objects or primitives)
  if (typeof data !== 'object' || !('steps' in data)) {
    return null;
  }

  try {
    return StructuredReasoningSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Rate-limited logging to prevent console spam during React re-renders
      const errorKey = JSON.stringify(error.errors.map(e => e.path.join('.')));
      const now = Date.now();

      if (errorKey !== lastLoggedError || now - lastLogTime > LOG_THROTTLE_MS) {
        console.warn('[ReasoningParser] Invalid reasoning steps:', {
          errors: error.errors,
          rawData: typeof data === 'object' ? Object.keys(data) : typeof data,
        });
        lastLoggedError = errorKey;
        lastLogTime = now;
      }

      // Report validation errors to Sentry (rate-limited with the console.warn above)
      Sentry.captureMessage('Invalid reasoning steps', {
        level: 'warning',
        tags: {
          component: 'ReasoningParser',
          errorType: 'validation_failure',
        },
        extra: {
          zodErrors: error.errors,
          dataKeys: typeof data === 'object' && data !== null ? Object.keys(data) : typeof data,
        },
      });
    }
    return null;
  }
}

/**
 * Validate structured reasoning on the client side
 * Throws error if validation fails (for strict validation)
 *
 * Note: This validates the full StructuredReasoning object (with steps array and optional summary).
 * Frontend is the sole validation layer - backend types are structural only (no runtime validation).
 */
export function validateReasoningSteps(reasoning: unknown): asserts reasoning is StructuredReasoning {
  if (!reasoning || typeof reasoning !== 'object') {
    throw new Error('Invalid reasoning: must be an object');
  }

  if (!('steps' in reasoning)) {
    throw new Error('Invalid reasoning: must have steps array');
  }

  const { steps } = reasoning as { steps: unknown };

  if (!Array.isArray(steps)) {
    throw new Error('Reasoning steps must be an array');
  }

  // XSS prevention: detect dangerous patterns (expanded list)
  const dangerousPatterns = [
    /<script|<iframe|javascript:|onerror=|onload=|onclick=/i,
    /<svg[^>]*onload/i,
    /<img[^>]*onerror/i,
    /onfocus=|onmouseover=|onmouseout=/i,
    /<embed|<object/i,
    /data:text\/html/i,
  ];

  for (const step of steps) {
    if (typeof step.title === 'string' && dangerousPatterns.some(pattern => pattern.test(step.title))) {
      throw new Error('Invalid reasoning step content detected (potential XSS)');
    }

    if (Array.isArray(step.items)) {
      for (const item of step.items) {
        if (typeof item === 'string' && dangerousPatterns.some(pattern => pattern.test(item))) {
          throw new Error('Invalid reasoning item content detected (potential XSS)');
        }
      }
    }

    // Length limits (prevent DoS)
    if (typeof step.title === 'string' && step.title.length > REASONING_CONFIG.MAX_TITLE_LENGTH) {
      throw new Error(`Reasoning step title exceeds maximum length (${REASONING_CONFIG.MAX_TITLE_LENGTH})`);
    }

    if (Array.isArray(step.items)) {
      for (const item of step.items) {
        if (typeof item === 'string' && item.length > REASONING_CONFIG.MAX_ITEM_LENGTH) {
          throw new Error(`Reasoning item exceeds maximum length (${REASONING_CONFIG.MAX_ITEM_LENGTH})`);
        }
      }
    }
  }

  // Validate with Zod schema for full StructuredReasoning
  const result = StructuredReasoningSchema.safeParse(reasoning);
  if (!result.success) {
    throw new Error(`Reasoning validation failed: ${result.error.message}`);
  }
}
