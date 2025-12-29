/**
 * Type Definitions for Structured Reasoning
 *
 * These types are shared across the backend for reasoning step data structures.
 * Frontend has independent Zod-based definitions in src/types/reasoning.ts
 *
 * Extracted from deprecated reasoning-generator.ts (Dec 2025) as part of
 * Phase 4 cleanup of the GLM Thinking Migration. The reasoning generation
 * logic is now handled by GLM-4.7's native thinking mode via streaming.
 *
 * ## Exports
 *
 * **Type Definitions:**
 * - `ReasoningPhase` - Union type for reasoning phases (research | analysis | solution | custom)
 * - `ReasoningIcon` - Icon types for UI (search | lightbulb | target | sparkles)
 * - `ReasoningStep` - Single reasoning step with phase, title, and items
 * - `StructuredReasoning` - Complete reasoning structure with steps and optional summary
 *
 * **Constants:**
 * - `DEFAULT_PHASE_ICONS` - Default icon mapping for each reasoning phase
 *
 * **Type Guards:**
 * - `isReasoningPhase(value)` - Runtime type guard for ReasoningPhase
 * - `isReasoningIcon(value)` - Runtime type guard for ReasoningIcon
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
 * Validation constraints (enforced by frontend Zod schemas in src/types/reasoning.ts):
 * - **title**: 1-500 characters (after trim), no XSS patterns (`<script>`, `javascript:`, etc.)
 * - **items**: 1-20 items, each 1-2000 characters (after trim), no XSS patterns
 * - **icon**: Defaults to `DEFAULT_PHASE_ICONS[phase]` if omitted
 * - **timestamp**: Optional Unix timestamp (milliseconds) for debugging/ordering
 *
 * All fields are readonly to prevent accidental mutation after construction.
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
 * Validation constraints (enforced by frontend Zod schemas in src/types/reasoning.ts):
 * - **steps**: 0-10 steps (empty allowed for searches without reasoning)
 * - **summary**: Max 1000 characters (optional)
 *
 * All fields are readonly to prevent accidental mutation after construction.
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
