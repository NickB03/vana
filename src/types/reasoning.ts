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
 */
export function parseReasoningSteps(data: unknown): StructuredReasoning | null {
  try {
    return StructuredReasoningSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[ReasoningParser] Invalid reasoning steps:', {
        errors: error.errors,
        rawData: data,
      });

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
 * Validate reasoning steps on the server side
 * Throws error if validation fails (for API endpoints)
 */
export function validateReasoningSteps(steps: unknown): asserts steps is ReasoningStep[] {
  if (!Array.isArray(steps)) {
    throw new Error('Reasoning steps must be an array');
  }

  for (const step of steps) {
    // Reject HTML/JavaScript injection attempts
    const dangerousPatterns = [
      /<script|<iframe|javascript:|onerror=|onload=|onclick=/i,
    ];

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

  // Validate with Zod schema
  const result = z.array(ReasoningStepSchema).safeParse(steps);
  if (!result.success) {
    throw new Error(`Reasoning steps validation failed: ${result.error.message}`);
  }
}
