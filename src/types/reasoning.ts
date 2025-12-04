import { z } from 'zod';

/**
 * Zod schemas for runtime validation of reasoning steps
 * Prevents crashes from malformed AI-generated data
 */

// Runtime validation schema for reasoning steps
export const ReasoningStepSchema = z.object({
  phase: z.enum(['research', 'analysis', 'solution', 'custom']),
  title: z.string().min(1).max(500),
  icon: z.enum(['search', 'lightbulb', 'target', 'sparkles']).optional(),
  items: z.array(z.string().min(1).max(2000)).min(1).max(20),
  timestamp: z.number().optional(),
});

export const StructuredReasoningSchema = z.object({
  steps: z.array(ReasoningStepSchema).min(1).max(10),
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

      // TODO: Log to monitoring service (Sentry, DataDog, etc.)
      // logToMonitoring('invalid_reasoning_steps', {
      //   errors: error.errors,
      //   rawData: data,
      // });
    }
    return null;
  }
}

/**
 * Validate structured reasoning on the client side
 * Throws error if validation fails (for strict validation)
 *
 * Note: This validates the full StructuredReasoning object (with steps array and optional summary),
 * matching the backend's validateReasoningSteps signature in reasoning-generator.ts
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
