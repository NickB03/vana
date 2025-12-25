/**
 * Type Definitions for Structured Reasoning
 *
 * These types are shared across the backend for reasoning step data structures.
 * Frontend has independent Zod-based definitions in src/types/reasoning.ts
 *
 * Extracted from deprecated reasoning-generator.ts (Dec 2025) as part of
 * Phase 4 cleanup of the GLM Thinking Migration. The reasoning generation
 * logic is now handled by GLM-4.6's native thinking mode via streaming.
 *
 * @module reasoning-types
 * @since 2025-12-24
 */

/**
 * Reasoning step phases following research → analysis → solution pattern
 *
 * @remarks
 * The workflow pattern (research → analysis → solution) represents a structured
 * approach to problem-solving, but phase order is not enforced at runtime.
 *
 * Use 'custom' for domain-specific reasoning that doesn't fit the standard
 * workflow (e.g., mathematical proofs, code debugging, creative exploration).
 *
 * @example
 * ```typescript
 * const phase: ReasoningPhase = 'research';
 * if (isReasoningPhase(userInput)) {
 *   // Type-safe usage
 * }
 * ```
 */
export type ReasoningPhase = 'research' | 'analysis' | 'solution' | 'custom';

/**
 * Icon types matching the Chain of Thought component
 *
 * @remarks
 * Icons provide visual feedback for reasoning steps. Each icon has semantic meaning:
 * - 'search': Research and information gathering (typically paired with 'research' phase)
 * - 'lightbulb': Ideas and insights (typically paired with 'analysis' phase)
 * - 'target': Goals and solutions (typically paired with 'solution' phase)
 * - 'sparkles': Magic/AI/custom operations (typically paired with 'custom' phase)
 *
 * If icon is omitted from a ReasoningStep, use DEFAULT_PHASE_ICONS for sensible defaults.
 */
export type ReasoningIcon = 'search' | 'lightbulb' | 'target' | 'sparkles';

/**
 * Default icon mapping for each reasoning phase
 *
 * Provides semantic defaults when icon is not explicitly specified in a ReasoningStep.
 *
 * @example
 * ```typescript
 * const step: ReasoningStep = { phase: 'research', title: 'Analyzing...', items: [...] };
 * const icon = step.icon ?? DEFAULT_PHASE_ICONS[step.phase]; // 'search'
 * ```
 */
export const DEFAULT_PHASE_ICONS: Record<ReasoningPhase, ReasoningIcon> = {
  research: 'search',
  analysis: 'lightbulb',
  solution: 'target',
  custom: 'sparkles',
} as const;

/**
 * Single reasoning step with phase, title, and detailed items
 *
 * @remarks
 * Validation constraints (enforced by frontend Zod schemas, recommended for backend):
 * - **title**: 1-500 characters (after trim), no XSS patterns (`<script>`, `javascript:`, etc.)
 * - **items**: 1-20 items, each 1-2000 characters (after trim), no XSS patterns
 * - **icon**: Defaults to `DEFAULT_PHASE_ICONS[phase]` if omitted
 * - **timestamp**: Optional Unix timestamp (milliseconds) for debugging/ordering
 *
 * All fields are readonly to prevent accidental mutation after construction.
 * Use `validateReasoningStep()` for runtime validation before persisting to database.
 *
 * @example
 * ```typescript
 * const step: ReasoningStep = {
 *   phase: 'research',
 *   title: 'Analyzing user requirements',
 *   items: [
 *     'User needs real-time updates',
 *     'Must support offline mode',
 *   ],
 *   timestamp: Date.now(),
 * };
 * validateReasoningStep(step); // Throws if invalid
 * ```
 */
export interface ReasoningStep {
  readonly phase: ReasoningPhase;
  readonly title: string;
  readonly icon?: ReasoningIcon;
  readonly items: readonly string[];
  readonly timestamp?: number;
}

/**
 * Complete structured reasoning with steps and optional summary
 *
 * @remarks
 * Validation constraints (enforced by frontend Zod schemas, recommended for backend):
 * - **steps**: 0-10 steps (empty allowed for searches without reasoning)
 * - **summary**: Max 1000 characters (optional)
 *
 * All fields are readonly to prevent accidental mutation after construction.
 * Use `validateStructuredReasoning()` for runtime validation before persisting.
 *
 * @example
 * ```typescript
 * const reasoning: StructuredReasoning = {
 *   steps: [
 *     {
 *       phase: 'research',
 *       title: 'Gathering requirements',
 *       items: ['Requirement 1', 'Requirement 2'],
 *     },
 *   ],
 *   summary: 'Requirements analysis complete',
 * };
 * ```
 */
export interface StructuredReasoning {
  readonly steps: readonly ReasoningStep[];
  readonly summary?: string;
}

// ============================================================================
// RUNTIME VALIDATION HELPERS
// ============================================================================

/**
 * Type guard for ReasoningPhase
 *
 * Provides runtime validation that a value is a valid ReasoningPhase.
 * Useful for validating AI-generated or user-provided data.
 *
 * @param value - Value to check
 * @returns True if value is a valid ReasoningPhase
 *
 * @example
 * ```typescript
 * const userInput = 'research';
 * if (isReasoningPhase(userInput)) {
 *   // userInput is now typed as ReasoningPhase
 *   console.log(DEFAULT_PHASE_ICONS[userInput]);
 * }
 * ```
 */
export function isReasoningPhase(value: unknown): value is ReasoningPhase {
  return typeof value === 'string' &&
    (value === 'research' || value === 'analysis' || value === 'solution' || value === 'custom');
}

/**
 * Type guard for ReasoningIcon
 *
 * Provides runtime validation that a value is a valid ReasoningIcon.
 *
 * @param value - Value to check
 * @returns True if value is a valid ReasoningIcon
 */
export function isReasoningIcon(value: unknown): value is ReasoningIcon {
  return typeof value === 'string' &&
    (value === 'search' || value === 'lightbulb' || value === 'target' || value === 'sparkles');
}

/**
 * Normalize and validate an icon value, providing fallback to phase default
 *
 * If the provided icon is invalid, returns the default icon for the given phase.
 * This provides graceful degradation when AI-generated data contains invalid icon names.
 *
 * @param icon - Icon value to validate (may be invalid)
 * @param phase - Phase to use for fallback icon
 * @returns Valid ReasoningIcon (either normalized input or phase default)
 *
 * @example
 * ```typescript
 * normalizeReasoningIcon('search', 'research');      // 'search'
 * normalizeReasoningIcon('invalid', 'research');     // 'search' (fallback)
 * normalizeReasoningIcon(undefined, 'analysis');     // 'lightbulb' (fallback)
 * ```
 */
export function normalizeReasoningIcon(
  icon: unknown,
  phase: ReasoningPhase
): ReasoningIcon {
  if (isReasoningIcon(icon)) {
    return icon;
  }
  return DEFAULT_PHASE_ICONS[phase];
}

/**
 * Validate a ReasoningStep at runtime
 *
 * Throws descriptive errors if validation fails. Aligns with frontend Zod validation
 * constraints to ensure consistent data quality across frontend and backend.
 *
 * **Validation Rules:**
 * - `phase`: Must be valid ReasoningPhase
 * - `title`: 1-500 characters (after trim), no XSS patterns
 * - `items`: 1-20 items, each 1-2000 characters (after trim), no XSS patterns
 * - `icon`: Must be valid ReasoningIcon (if provided)
 * - `timestamp`: Must be number (if provided)
 *
 * @param step - Step to validate
 * @throws {Error} If validation fails with descriptive message
 *
 * @example
 * ```typescript
 * try {
 *   validateReasoningStep(aiGeneratedStep);
 *   // Safe to persist to database
 * } catch (error) {
 *   console.error('Invalid step:', error.message);
 *   // Handle validation error
 * }
 * ```
 */
export function validateReasoningStep(step: unknown): asserts step is ReasoningStep {
  if (!step || typeof step !== 'object') {
    throw new Error('ReasoningStep must be an object');
  }

  const s = step as Partial<ReasoningStep>;

  // Validate phase
  if (!isReasoningPhase(s.phase)) {
    throw new Error(`Invalid phase: must be 'research', 'analysis', 'solution', or 'custom'`);
  }

  // Validate title
  if (!s.title || typeof s.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  const trimmedTitle = s.title.trim();
  if (trimmedTitle.length === 0) {
    throw new Error('Title cannot be empty or whitespace-only');
  }

  if (trimmedTitle.length > 500) {
    throw new Error(`Title exceeds maximum length (500 characters, got ${trimmedTitle.length})`);
  }

  // XSS protection: check for dangerous patterns in title
  const dangerousPatterns = [
    /<script|<iframe|javascript:|onerror=|onload=|onclick=/i,
    /<svg[^>]*onload/i,
    /<img[^>]*onerror/i,
    /onfocus=|onmouseover=|onmouseout=/i,
    /<embed|<object/i,
    /data:text\/html/i,
  ];

  if (dangerousPatterns.some(pattern => pattern.test(trimmedTitle))) {
    throw new Error('Title contains potentially dangerous content (XSS prevention)');
  }

  // Validate icon (optional)
  if (s.icon !== undefined && !isReasoningIcon(s.icon)) {
    throw new Error(`Invalid icon: must be 'search', 'lightbulb', 'target', or 'sparkles'`);
  }

  // Validate items array
  if (!Array.isArray(s.items)) {
    throw new Error('Items must be an array');
  }

  if (s.items.length === 0) {
    throw new Error('Items array must contain at least 1 item');
  }

  if (s.items.length > 20) {
    throw new Error(`Items array exceeds maximum (20 items, got ${s.items.length})`);
  }

  // Validate each item
  for (let i = 0; i < s.items.length; i++) {
    const item = s.items[i];

    if (typeof item !== 'string') {
      throw new Error(`Item ${i + 1} must be a string`);
    }

    const trimmedItem = item.trim();

    if (trimmedItem.length === 0) {
      throw new Error(`Item ${i + 1} cannot be empty or whitespace-only`);
    }

    if (trimmedItem.length > 2000) {
      throw new Error(`Item ${i + 1} exceeds maximum length (2000 characters, got ${trimmedItem.length})`);
    }

    // XSS protection for items
    if (dangerousPatterns.some(pattern => pattern.test(trimmedItem))) {
      throw new Error(`Item ${i + 1} contains potentially dangerous content (XSS prevention)`);
    }
  }

  // Validate timestamp (optional)
  if (s.timestamp !== undefined && typeof s.timestamp !== 'number') {
    throw new Error('Timestamp must be a number');
  }
}

/**
 * Validate StructuredReasoning at runtime
 *
 * Throws descriptive errors if validation fails. Validates all nested ReasoningStep
 * objects and summary constraints.
 *
 * **Validation Rules:**
 * - `steps`: 0-10 steps (each validated with `validateReasoningStep`)
 * - `summary`: Max 1000 characters (if provided)
 *
 * @param reasoning - Reasoning to validate
 * @throws {Error} If validation fails with descriptive message
 *
 * @example
 * ```typescript
 * try {
 *   validateStructuredReasoning(aiGeneratedReasoning);
 *   // Safe to persist to database
 * } catch (error) {
 *   console.error('Invalid reasoning:', error.message);
 * }
 * ```
 */
export function validateStructuredReasoning(reasoning: unknown): asserts reasoning is StructuredReasoning {
  if (!reasoning || typeof reasoning !== 'object') {
    throw new Error('StructuredReasoning must be an object');
  }

  const r = reasoning as Partial<StructuredReasoning>;

  // Validate steps array
  if (!Array.isArray(r.steps)) {
    throw new Error('Steps must be an array');
  }

  if (r.steps.length > 10) {
    throw new Error(`Steps array exceeds maximum (10 steps, got ${r.steps.length})`);
  }

  // Validate each step
  for (let i = 0; i < r.steps.length; i++) {
    try {
      validateReasoningStep(r.steps[i]);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Step ${i + 1}: ${err.message}`);
    }
  }

  // Validate summary (optional)
  if (r.summary !== undefined) {
    if (typeof r.summary !== 'string') {
      throw new Error('Summary must be a string');
    }

    if (r.summary.length > 1000) {
      throw new Error(`Summary exceeds maximum length (1000 characters, got ${r.summary.length})`);
    }
  }
}
