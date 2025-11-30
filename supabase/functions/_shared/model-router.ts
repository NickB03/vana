/**
 * Model Router for Cost-Optimized AI Selection
 *
 * Routes queries to appropriate AI models based on complexity analysis
 * to optimize costs while maintaining quality.
 *
 * @module model-router
 */

import { MODELS } from './config.ts';
import type { ComplexityAnalysis } from './complexity-analyzer.ts';

export interface ModelSelection {
  model: string;
  reason: string;
  estimatedCost: number;
  fallback?: string;
}

/**
 * Cost per 1M tokens (USD)
 * Source: OpenRouter pricing as of 2025-11
 */
const COST_PER_1M_TOKENS = {
  [MODELS.GEMINI_FLASH]: { input: 0.075, output: 0.30 },
  [MODELS.KIMI_K2]: { input: 0.15, output: 0.60 },
  [MODELS.GEMINI_FLASH_IMAGE]: { input: 0.075, output: 0.30 }, // Same as Gemini Flash
} as const;

/**
 * Estimates the cost of a request in USD
 *
 * @param inputTokens - Estimated input token count
 * @param outputTokens - Estimated output token count
 * @param model - Model identifier from MODELS constant
 * @returns Estimated cost in USD
 *
 * @example
 * ```typescript
 * const cost = estimateCost(100, 500, MODELS.GEMINI_FLASH);
 * // 0.000157 USD (~$0.16 per 1000 requests)
 * ```
 */
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  const pricing = COST_PER_1M_TOKENS[model as keyof typeof COST_PER_1M_TOKENS];

  if (!pricing) {
    console.warn(`Unknown model pricing: ${model}, using Gemini Flash as fallback`);
    const fallbackPricing = COST_PER_1M_TOKENS[MODELS.GEMINI_FLASH];
    return (inputTokens * fallbackPricing.input + outputTokens * fallbackPricing.output) / 1_000_000;
  }

  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Selects the optimal model based on complexity and task type
 *
 * Routing Rules:
 * - Chat (simple/moderate/complex) → Gemini Flash Lite (cost-optimized)
 * - Artifact generation → Kimi K2 (reasoning required)
 * - Image generation → Gemini Flash Image (specialized)
 *
 * @param complexity - ComplexityAnalysis from analyzeComplexity()
 * @param taskType - Type of task being performed
 * @returns ModelSelection with chosen model and cost estimate
 *
 * @example
 * ```typescript
 * const analysis = analyzeComplexity("What is the weather?");
 * const selection = selectModel(analysis, 'chat');
 * // { model: MODELS.GEMINI_FLASH, reason: "Simple chat...", estimatedCost: 0.00012 }
 * ```
 */
export function selectModel(
  complexity: ComplexityAnalysis,
  taskType: 'chat' | 'artifact' | 'image',
): ModelSelection {
  const { level, score, factors, estimatedOutputTokens } = complexity;
  const inputTokens = factors.queryLength;

  // Image generation always uses specialized model
  if (taskType === 'image') {
    return {
      model: MODELS.GEMINI_FLASH_IMAGE,
      reason: 'Image generation task requires specialized image model',
      estimatedCost: estimateCost(inputTokens, estimatedOutputTokens, MODELS.GEMINI_FLASH_IMAGE),
    };
  }

  // Artifact generation always uses Kimi K2 for deep reasoning
  if (taskType === 'artifact') {
    return {
      model: MODELS.KIMI_K2,
      reason: 'Artifact generation requires deep reasoning and code synthesis capabilities',
      estimatedCost: estimateCost(inputTokens, estimatedOutputTokens, MODELS.KIMI_K2),
      fallback: MODELS.GEMINI_FLASH,
    };
  }

  // Chat routing based on complexity
  // NOTE: Gemini Flash Lite is highly capable across all complexity levels
  // while being the most cost-effective option (0.075/0.30 per 1M tokens)

  if (level === 'simple') {
    return {
      model: MODELS.GEMINI_FLASH,
      reason: `Simple chat query (score: ${score}) - Gemini Flash Lite provides excellent quality at lowest cost`,
      estimatedCost: estimateCost(inputTokens, estimatedOutputTokens, MODELS.GEMINI_FLASH),
    };
  }

  if (level === 'moderate') {
    return {
      model: MODELS.GEMINI_FLASH,
      reason: `Moderate complexity (score: ${score}) - Gemini Flash Lite handles explanations and summaries efficiently`,
      estimatedCost: estimateCost(inputTokens, estimatedOutputTokens, MODELS.GEMINI_FLASH),
    };
  }

  if (level === 'complex') {
    // Even complex queries use Gemini Flash Lite for chat
    // It's capable of multi-step reasoning while remaining cost-effective
    return {
      model: MODELS.GEMINI_FLASH,
      reason: `Complex query (score: ${score}) - Gemini Flash Lite provides strong reasoning at optimal cost`,
      estimatedCost: estimateCost(inputTokens, estimatedOutputTokens, MODELS.GEMINI_FLASH),
    };
  }

  // Expert level (score 76-100)
  // Still use Gemini Flash Lite unless it's code generation (which goes to artifact)
  return {
    model: MODELS.GEMINI_FLASH,
    reason: `Expert-level query (score: ${score}) - Gemini Flash Lite capable of handling sophisticated queries cost-effectively`,
    estimatedCost: estimateCost(inputTokens, estimatedOutputTokens, MODELS.GEMINI_FLASH),
  };
}

/**
 * Gets cost savings compared to always using most expensive model
 *
 * @param selectedModel - The model chosen by selectModel()
 * @param inputTokens - Input token count
 * @param outputTokens - Output token count
 * @returns Object with cost savings and percentage
 *
 * @example
 * ```typescript
 * const savings = getCostSavings(MODELS.GEMINI_FLASH, 100, 500);
 * // { saved: 0.000075, percentSaved: 32.5 }
 * ```
 */
export function getCostSavings(
  selectedModel: string,
  inputTokens: number,
  outputTokens: number,
): { saved: number; percentSaved: number } {
  const selectedCost = estimateCost(inputTokens, outputTokens, selectedModel);
  const expensiveCost = estimateCost(inputTokens, outputTokens, MODELS.KIMI_K2);

  const saved = expensiveCost - selectedCost;
  const percentSaved = (saved / expensiveCost) * 100;

  return {
    saved,
    percentSaved,
  };
}

/**
 * Validates that a model is available and properly configured
 *
 * @param model - Model identifier to validate
 * @returns true if model is valid, false otherwise
 */
export function isValidModel(model: string): boolean {
  const validModels: readonly string[] = Object.values(MODELS);
  return validModels.includes(model);
}
