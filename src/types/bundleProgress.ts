/**
 * Bundle Progress Types
 *
 * Shared types for SSE streaming during artifact bundling.
 * These match the backend types in supabase/functions/_shared/sse-stream.ts.
 *
 * Uses Zod schemas as single source of truth to prevent type drift.
 */

import { z } from 'zod';

// ============================================================================
// Zod Schemas (Single Source of Truth)
// ============================================================================

/**
 * Bundle stage enum schema.
 * Defines the 5 stages of artifact bundling.
 */
export const BundleStageSchema = z.enum([
  "validate",
  "cache-check",
  "fetch",
  "bundle",
  "upload"
]);

/**
 * Bundle progress event schema.
 * Validates progress updates with stage, message, and percentage.
 */
export const BundleProgressSchema = z.object({
  stage: BundleStageSchema,
  message: z.string().min(1, "Progress message cannot be empty"),
  progress: z.number().int().min(0).max(100),
}).readonly();

/**
 * Bundle completion event schema.
 * Contains the final bundle URL and metadata.
 */
export const BundleCompleteSchema = z.object({
  success: z.literal(true),
  bundleUrl: z.string().url(),
  bundleSize: z.number().int().positive(),
  bundleTime: z.number().nonnegative(),
  dependencies: z.array(z.string()).nonempty(),
  expiresAt: z.string().datetime(),
  requestId: z.string(),
  cacheHit: z.boolean().optional(),
}).readonly();

/**
 * Bundle error event schema.
 * Contains error information if bundling fails.
 */
export const BundleErrorSchema = z.object({
  success: z.literal(false),
  error: z.string().min(1),
  details: z.string().optional(),
  requestId: z.string().optional(),
}).readonly();

/**
 * SSE event wrapper schema.
 * Discriminated union for all bundle event types.
 */
export const BundleStreamEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('progress'), data: BundleProgressSchema }),
  z.object({ type: z.literal('complete'), data: BundleCompleteSchema }),
  z.object({ type: z.literal('error'), data: BundleErrorSchema }),
]);

// ============================================================================
// TypeScript Types (Inferred from Schemas)
// ============================================================================

export type BundleStage = z.infer<typeof BundleStageSchema>;
export type BundleProgress = z.infer<typeof BundleProgressSchema>;
export type BundleComplete = z.infer<typeof BundleCompleteSchema>;
export type BundleError = z.infer<typeof BundleErrorSchema>;
export type BundleStreamEvent = z.infer<typeof BundleStreamEventSchema>;

// ============================================================================
// Factory Function (Backward Compatibility)
// ============================================================================

/**
 * Create a validated BundleProgress object.
 * Ensures progress is 0-100 and message is non-empty.
 *
 * @param stage - Current bundling stage
 * @param message - Progress message for display
 * @param progress - Progress percentage (0-100)
 * @returns Frozen BundleProgress object
 * @throws RangeError if progress is not in valid range
 * @throws Error if message is empty
 */
export function createBundleProgress(
  stage: BundleStage,
  message: string,
  progress: number
): BundleProgress {
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new RangeError(`Progress must be 0-100, got ${progress}`);
  }
  if (!message.trim()) {
    throw new Error("Progress message cannot be empty");
  }
  return Object.freeze({ stage, message, progress });
}

/**
 * Stage display labels for UI.
 */
export const STAGE_LABELS: Record<BundleStage, string> = {
  validate: "Validating...",
  "cache-check": "Checking cache...",
  fetch: "Fetching packages...",
  bundle: "Bundling...",
  upload: "Uploading...",
};
