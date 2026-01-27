/**
 * Skills System v2 - Skill Registry
 *
 * Centralized registry for all skill definitions. Skills are registered during
 * module initialization and accessed via type-safe lookup functions.
 *
 * ## Architecture
 *
 * The registry follows a simple registration pattern:
 * 1. Skills are defined in `definitions/*.ts` files
 * 2. Each definition calls `registerSkill()` during module load
 * 3. Skills are fetched via `getSkill(id)` at runtime
 *
 * ## Usage
 *
 * **Registering a skill** (in skill definition file):
 * ```typescript
 * import { registerSkill } from './registry.ts';
 *
 * export const webSearchSkill: Skill = { ... };
 * registerSkill(webSearchSkill);
 * ```
 *
 * **Fetching a skill** (in resolver or endpoint):
 * ```typescript
 * import { getSkill } from './registry.ts';
 *
 * const skill = getSkill('web-search');
 * if (!skill) {
 *   throw new Error('Skill not found');
 * }
 * ```
 *
 * ## Design Principles
 *
 * - **Type Safety**: Registry keys are constrained to SkillId union
 * - **Immutability**: Registry is mutated during initialization only
 * - **Fail-Fast**: Duplicate registration logs warning but doesn't throw
 * - **Simplicity**: No async loading or lazy initialization complexity
 *
 * @module skills/registry
 * @since 2026-01-25 (Skills System v2)
 */

import type { Skill, SkillId } from './types.ts';
import { createLogger } from '../logger.ts';

// Module-level logger for registration events (no requestId during initialization)
const logger = createLogger({ functionName: 'skills-registry' });

/**
 * Global skill registry mapping SkillId to Skill definitions
 *
 * @remarks
 * Initialized as empty and populated during module load when skill definitions
 * import and call `registerSkill()`.
 *
 * **Type Safety Note**: The `as Record<SkillId, Skill>` cast is necessary because
 * TypeScript cannot infer that all SkillId values will be present at runtime.
 * This is acceptable because `getSkill()` returns `Skill | undefined`.
 *
 * **Mutation**: Only mutated via `registerSkill()` during initialization.
 * DO NOT mutate directly in application code.
 */
export const SKILL_REGISTRY: Record<SkillId, Skill> = {} as Record<SkillId, Skill>;

/**
 * Register a skill in the global registry
 *
 * @param skill - Complete skill definition to register
 *
 * @remarks
 * **When to call**: During module initialization in skill definition files.
 * **Never call** in application code or request handlers (registration is static).
 *
 * **Duplicate Registration**: If a skill with the same ID is already registered,
 * logs a console warning but does NOT throw an error (fail-soft for hot reload).
 *
 * @example
 * ```typescript
 * // In definitions/web-search.ts
 * import { registerSkill } from '../registry.ts';
 *
 * export const webSearchSkill: Skill = {
 *   id: 'web-search',
 *   displayName: 'Web Search',
 *   description: 'Search the web and synthesize results',
 *   content: 'You are a web search assistant...',
 * };
 *
 * registerSkill(webSearchSkill);
 * ```
 */
export function registerSkill(skill: Skill): void {
  // Check for duplicate registration
  if (SKILL_REGISTRY[skill.id]) {
    logger.warn('duplicate_skill_registration', {
      skillId: skill.id,
      displayName: skill.displayName,
    });
  }

  // Register skill
  SKILL_REGISTRY[skill.id] = skill;

  logger.debug('skill_registered', {
    skillId: skill.id,
    displayName: skill.displayName,
  });
}

/**
 * Retrieve a skill from the registry by ID
 *
 * @param id - Skill ID to look up (type-safe via SkillId union)
 * @returns Skill definition if found, undefined otherwise
 *
 * @remarks
 * **Always check** for undefined before using the returned skill:
 * ```typescript
 * const skill = getSkill('web-search');
 * if (!skill) {
 *   throw new Error('Skill not found: web-search');
 * }
 * ```
 *
 * **Why undefined instead of throwing?** Allows caller to handle missing skills
 * gracefully (e.g., fallback to default behavior, return user-friendly error).
 *
 * @example
 * ```typescript
 * // In resolver.ts
 * import { getSkill } from './registry.ts';
 *
 * export async function resolveSkill(skillId: SkillId): Promise<ResolvedSkill> {
 *   const skill = getSkill(skillId);
 *   if (!skill) {
 *     throw new Error(`Skill not found: ${skillId}`);
 *   }
 *   // ... resolve placeholders and references
 *   return { skill, content: resolvedContent, loadedReferences: [] };
 * }
 * ```
 */
export function getSkill(id: SkillId): Skill | undefined {
  return SKILL_REGISTRY[id];
}
