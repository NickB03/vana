/**
 * Artifact Complexity Analyzer
 *
 * Analyzes artifact generation requests to determine complexity level.
 * Used for routing between streaming (complex) and non-streaming (simple) paths.
 *
 * Complexity is determined by:
 * 1. Artifact type (react, game, visualization are inherently more complex)
 * 2. Requirement keywords (interactive, animation, state management, etc.)
 * 3. Requirements length (longer prompts typically indicate more complex artifacts)
 *
 * @module artifact-complexity
 */

import type { GeneratableArtifactType } from './tool-executor.ts';

/**
 * Result of complexity analysis
 */
export interface ComplexityResult {
  /** Whether the artifact is considered complex */
  isComplex: boolean;
  /** Human-readable reason for the complexity determination */
  reason: string;
  /** Estimated token count for generation */
  estimatedTokens: number;
  /** Detected complexity factors */
  factors: ComplexityFactor[];
}

/**
 * Individual complexity factor
 */
export interface ComplexityFactor {
  name: string;
  weight: number;
  matched: boolean;
  detail?: string;
}

/**
 * Types that are inherently more complex to generate
 */
const COMPLEX_TYPES = new Set<GeneratableArtifactType | string>([
  'react', // React components often have state, effects, interactivity
]);

/**
 * Sub-categories within types that indicate complexity
 * These keywords in the requirements suggest complex artifacts
 */
const COMPLEX_KEYWORDS = [
  // Interactivity
  'interactive',
  'draggable',
  'drag and drop',
  'drag-and-drop',
  'click',
  'hover',
  'form',
  'input',
  'button',

  // Animation & Motion
  'animation',
  'animate',
  'animated',
  'motion',
  'transition',
  'framer',

  // State Management
  'state',
  'useState',
  'useReducer',
  'context',
  'store',

  // Data & APIs
  'api',
  'fetch',
  'websocket',
  'real-time',
  'realtime',
  'live',
  'socket',

  // Visualization
  'chart',
  'graph',
  'visualization',
  'plot',
  'recharts',
  'd3',
  'canvas',
  '3d',
  'three.js',
  'threejs',

  // Games
  'game',
  'player',
  'score',
  'level',

  // Complex UI
  'dashboard',
  'table',
  'grid',
  'carousel',
  'slider',
  'modal',
  'dialog',
  'tabs',
  'accordion',
] as const;

/**
 * Minimum requirements length that suggests complexity
 * Longer requirements typically mean more detailed, complex artifacts
 */
const LONG_REQUIREMENTS_THRESHOLD = 300;

/**
 * Token estimation constants
 */
const TOKENS_COMPLEX = 4000;
const TOKENS_SIMPLE = 1500;

/**
 * Analyze artifact complexity based on type and requirements.
 *
 * @param type - The artifact type being generated
 * @param requirements - The user's description/requirements for the artifact
 * @returns Complexity analysis result
 *
 * @example
 * ```typescript
 * const result = analyzeArtifactComplexity('react', 'Create a simple button');
 * // { isComplex: false, reason: 'Simple react artifact', estimatedTokens: 1500 }
 *
 * const result2 = analyzeArtifactComplexity('react', 'Create an interactive dashboard with charts');
 * // { isComplex: true, reason: 'Complex react artifact with interactive, dashboard, charts', estimatedTokens: 4000 }
 * ```
 */
export function analyzeArtifactComplexity(
  type: GeneratableArtifactType | string,
  requirements: string
): ComplexityResult {
  const factors: ComplexityFactor[] = [];
  const normalizedRequirements = requirements.toLowerCase();

  // Factor 1: Check artifact type
  const isComplexType = COMPLEX_TYPES.has(type);
  factors.push({
    name: 'complex_type',
    weight: 1,
    matched: isComplexType,
    detail: isComplexType ? `${type} is a complex artifact type` : undefined,
  });

  // Factor 2: Check for complex keywords
  const matchedKeywords = COMPLEX_KEYWORDS.filter(keyword =>
    normalizedRequirements.includes(keyword.toLowerCase())
  );
  const hasComplexKeywords = matchedKeywords.length > 0;
  factors.push({
    name: 'complex_keywords',
    weight: 2,
    matched: hasComplexKeywords,
    detail: hasComplexKeywords ? `Keywords: ${matchedKeywords.join(', ')}` : undefined,
  });

  // Factor 3: Check requirements length
  const isLongRequirements = requirements.length > LONG_REQUIREMENTS_THRESHOLD;
  factors.push({
    name: 'long_requirements',
    weight: 1,
    matched: isLongRequirements,
    detail: isLongRequirements ? `${requirements.length} chars (>${LONG_REQUIREMENTS_THRESHOLD})` : undefined,
  });

  // Determine complexity: complex type AND (complex keywords OR long requirements)
  const isComplex = isComplexType && (hasComplexKeywords || isLongRequirements);

  // Build reason string
  let reason: string;
  if (isComplex) {
    const details: string[] = [];
    if (hasComplexKeywords) {
      details.push(matchedKeywords.slice(0, 3).join(', '));
    }
    if (isLongRequirements) {
      details.push('detailed requirements');
    }
    reason = `Complex ${type} artifact with ${details.join(' and ')}`;
  } else if (!isComplexType) {
    reason = `${type} is a simple artifact type`;
  } else {
    reason = `Simple ${type} artifact (no complex patterns detected)`;
  }

  return {
    isComplex,
    reason,
    estimatedTokens: isComplex ? TOKENS_COMPLEX : TOKENS_SIMPLE,
    factors,
  };
}

/**
 * Quick complexity check without full analysis.
 * Useful for fast path decisions.
 *
 * @param type - The artifact type
 * @param requirements - The user's requirements
 * @returns True if the artifact is likely complex
 */
export function isComplexArtifact(
  type: GeneratableArtifactType | string,
  requirements: string
): boolean {
  return analyzeArtifactComplexity(type, requirements).isComplex;
}

/**
 * Get estimated generation time based on complexity.
 *
 * @param complexity - Complexity analysis result
 * @returns Estimated time in milliseconds
 */
export function estimateGenerationTime(complexity: ComplexityResult): number {
  // Rough estimate: ~10ms per token for generation
  return complexity.estimatedTokens * 10;
}
