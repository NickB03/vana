/**
 * Skills System v2 - Public API
 *
 * Barrel export for the skills system. Import this module to access all
 * skills-related types, utilities, and registry functions.
 *
 * ## Architecture
 *
 * The skills system provides modular, composable prompt engineering with:
 * - **Types**: Core TypeScript definitions (Skill, SkillContext, etc.)
 * - **Registry**: Centralized skill storage and lookup
 * - **Resolver**: Dynamic context injection and placeholder replacement (TODO)
 *
 * ## Usage
 *
 * ```typescript
 * // Import everything from the skills system
 * import { getSkill, type SkillId, type ResolvedSkill } from '../_shared/skills/index.ts';
 *
 * // Or import specific items
 * import type { Skill, SkillContext } from '../_shared/skills/index.ts';
 * import { SKILL_REGISTRY, registerSkill } from '../_shared/skills/index.ts';
 * ```
 *
 * ## Module Structure
 *
 * ```
 * skills/
 * ├── types.ts          # Core type definitions (exported)
 * ├── registry.ts       # Skill registration and lookup (exported)
 * ├── resolver.ts       # Placeholder resolution (TODO, will be exported)
 * └── index.ts          # Public API (this file)
 * ```
 *
 * ## Roadmap
 *
 * - [x] Task #4: Core types and registry
 * - [x] Task #2: Resolver implementation with SafeErrorHandler
 * - [x] Task #5: Skill definitions (web-search, code-assistant, data-viz)
 * - [ ] Task #3: Deno tests for all modules
 *
 * @module skills
 * @since 2026-01-25 (Skills System v2)
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Re-export all types from types.ts
 *
 * @remarks
 * Use `import type { ... }` for type-only imports to avoid runtime overhead:
 * ```typescript
 * import type { Skill, SkillContext } from '../_shared/skills/index.ts';
 * ```
 */
export type {
  SkillId,
  SkillContext,
  ContextProvider,
  ActionParameter,
  SkillAction,
  SkillReference,
  Skill,
  ResolvedSkill,
} from './types.ts';

// ============================================================================
// REGISTRY EXPORTS
// ============================================================================

/**
 * Re-export registry utilities
 *
 * @remarks
 * - `SKILL_REGISTRY`: Global registry (read-only in app code, mutated during init)
 * - `registerSkill()`: Called by skill definitions during module load
 * - `getSkill()`: Type-safe skill lookup by ID
 */
export { SKILL_REGISTRY, registerSkill, getSkill } from './registry.ts';

// ============================================================================
// RESOLVER EXPORTS
// ============================================================================

/**
 * Re-export resolver utilities
 *
 * @remarks
 * - `resolveSkill()`: Resolves skill with dynamic context injection
 */
export { resolveSkill } from './resolver.ts';

// ============================================================================
// FACTORY EXPORTS
// ============================================================================

/**
 * Re-export factory functions for validated object creation
 *
 * @remarks
 * - `createSkillContext()`: Factory for creating branded, validated SkillContext
 * - `SkillContextValidationError`: Error thrown when factory validation fails
 */
export { createSkillContext, SkillContextValidationError } from './factories.ts';

// ============================================================================
// DETECTOR EXPORTS
// ============================================================================

/**
 * Re-export skill detector for automatic skill selection
 *
 * @remarks
 * - `detectSkill()`: Uses LLM to classify which skill applies to a message
 */
export { detectSkill, type SkillDetectionResult } from './detector.ts';

// ============================================================================
// SKILL DEFINITIONS
// ============================================================================

/**
 * Import skill definitions to trigger self-registration
 *
 * @remarks
 * Each skill calls registerSkill() during module initialization.
 * Re-export skill constants for direct access.
 */
import './definitions/index.ts';
export * from './definitions/index.ts';
