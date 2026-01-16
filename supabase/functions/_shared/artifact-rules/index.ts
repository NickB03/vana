/**
 * Artifact Rules - Barrel Export
 *
 * This file provides a single point of entry for all artifact rule modules.
 * These rules are used by the artifact generation system to ensure consistent,
 * reliable artifact output.
 *
 * @module artifact-rules
 */

// =============================================================================
// Core Restrictions
// =============================================================================

export {
  CORE_RESTRICTIONS,
  CORE_RESTRICTIONS_REMINDER,
} from './core-restrictions.ts';

// =============================================================================
// Template Matching
// =============================================================================

export {
  ARTIFACT_TEMPLATES,
  getMatchingTemplate,
  getTemplateMatches,
  getAvailableTemplateIds,
} from './template-matcher.ts';

export type {
  ArtifactTemplate,
  TemplateMatchResult,
  TemplateMatchOutput,
} from './template-matcher.ts';

// =============================================================================
// Design Tokens
// =============================================================================

export {
  LIGHT_COLORS,
  DARK_COLORS,
  TYPOGRAPHY,
  FLUID_TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOW,
  SHADOW_DARK,
  MOTION,
  Z_INDEX,
  BREAKPOINTS,
  DESIGN_DIRECTIONS,
  REQUIRED_COMPONENT_STATES,
  ANTI_PATTERNS,
  generateCSSVariables,
  generateThemeCSS,
} from './design-tokens.ts';

export type {
  ColorTokens,
  TypographyToken,
  MotionToken,
  DesignDirection,
  ComponentState,
} from './design-tokens.ts';

// =============================================================================
// Canonical Examples
// =============================================================================

export {
  CANONICAL_EXAMPLES,
  getCanonicalExampleSection,
  findRelevantExample,
} from './canonical-examples.ts';

export type {
  CanonicalExample,
} from './canonical-examples.ts';

// =============================================================================
// Mandatory Patterns
// =============================================================================

export {
  MANDATORY_REACT_BOILERPLATE,
  PACKAGE_VERSIONS,
  COMBINED_MANDATORY_PATTERNS,
  validateReactBoilerplate,
  getViolationFix,
} from './mandatory-patterns.ts';

export type {
  ValidationResult,
} from './mandatory-patterns.ts';

// =============================================================================
// Golden Patterns
// =============================================================================

export {
  GOLDEN_PATTERNS,
  GOLDEN_PATTERNS_REMINDER,
} from './golden-patterns.ts';

// =============================================================================
// Task Complexity Analysis
// =============================================================================

export {
  analyzeTaskComplexity,
} from './template-matcher.ts';

export type {
  TaskComplexity,
  TaskAnalysis,
} from './template-matcher.ts';

// =============================================================================
// Pattern Learning Cache
// =============================================================================

export {
  getCachedMatch,
  cacheSuccessfulMatch,
  getCacheStats,
  clearCache,
  normalizeRequest,
  preloadKnownPatterns,
} from './pattern-cache.ts';

export type {
  CachedPattern,
  CacheStats,
} from './pattern-cache.ts';

// =============================================================================
// Verification Checklist
// =============================================================================

export {
  VERIFICATION_CHECKLIST,
  getChecklistForPrompt,
  getCriticalChecklistSummary,
  getChecklistByPriority,
  getChecklistByCategory,
  getCategoryNames,
  getChecklistStats,
  getTotalChecklistItems,
} from './verification-checklist.ts';

export type {
  ChecklistItem,
  ChecklistCategory,
} from './verification-checklist.ts';

// =============================================================================
// Anti-Pattern Detection
// =============================================================================

export {
  detectAntiPatterns,
  validateQualityStandards,
} from './design-tokens.ts';

// =============================================================================
// Pixi.js Game Patterns
// =============================================================================

export {
  PIXI_PATTERNS,
  PIXI_PATTERNS_REMINDER,
} from './pixi-patterns.ts';
