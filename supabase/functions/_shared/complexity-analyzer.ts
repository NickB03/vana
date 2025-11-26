/**
 * Complexity Analyzer for Adaptive Model Selection
 *
 * Analyzes user queries to determine computational complexity and
 * route to appropriate AI models for cost optimization.
 *
 * @module complexity-analyzer
 */

export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'expert';

export interface ComplexityAnalysis {
  level: ComplexityLevel;
  score: number;  // 0-100
  factors: {
    queryLength: number;       // Token estimate
    hasCodeRequest: boolean;   // Needs code generation
    needsReasoning: boolean;   // Multi-step thinking
    isCreative: boolean;       // Creative writing/generation
    domainSpecific: boolean;   // Technical domain
  };
  estimatedOutputTokens: number;
}

/**
 * Rough token estimation (1 token ≈ 4 characters for English text)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Detects if query requests code generation
 */
function detectCodeRequest(query: string): boolean {
  const codePatterns = [
    /\b(write|create|build|implement|code|program|script|function|component|class)\b.*\b(code|function|component|app|application|script|program|algorithm)\b/i,
    /\b(react|javascript|typescript|python|java|html|css|sql)\b/i,
    /\b(debug|fix|refactor|optimize)\b.*\b(code|function|bug|error)\b/i,
    /<artifact/i,
    /```/,  // Code blocks
    /generate.*code/i,
    /build.*app/i,
  ];

  return codePatterns.some(pattern => pattern.test(query));
}

/**
 * Detects if query requires multi-step reasoning
 */
function detectReasoningNeed(query: string): boolean {
  const reasoningPatterns = [
    /\b(why|how|explain|analyze|compare|evaluate|justify|reasoning|think through)\b/i,
    /\b(step by step|walk me through|break down|elaborate)\b/i,
    /\b(pros and cons|advantages and disadvantages|trade-?offs)\b/i,
    /\b(multiple|several|various)\b.*\b(options|approaches|solutions|ways)\b/i,
    /\b(decide|choose|recommend|suggest)\b.*\b(between|among|which)\b/i,
    /\b(complex|complicated|intricate|sophisticated)\b/i,
  ];

  return reasoningPatterns.some(pattern => pattern.test(query));
}

/**
 * Detects creative writing or content generation tasks
 */
function detectCreativeTask(query: string): boolean {
  const creativePatterns = [
    /\b(write|compose|create|generate)\b.*\b(story|poem|essay|article|blog|content)\b/i,
    /\b(creative|imaginative|original|unique)\b/i,
    /\b(brainstorm|ideate|come up with)\b/i,
    /\b(narrative|fiction|screenplay|dialogue)\b/i,
  ];

  return creativePatterns.some(pattern => pattern.test(query));
}

/**
 * Detects domain-specific technical queries
 */
function detectDomainSpecific(query: string): boolean {
  const domainPatterns = [
    // Programming/CS
    /\b(algorithm|data structure|complexity|big-?o|optimization|performance)\b/i,
    /\b(database|sql|nosql|schema|query|index|transaction)\b/i,
    /\b(api|rest|graphql|websocket|http|authentication)\b/i,
    /\b(docker|kubernetes|ci\/cd|deployment|devops)\b/i,

    // Math/Science
    /\b(calculus|algebra|statistics|probability|theorem|proof)\b/i,
    /\b(quantum|molecular|neural|genetic|biochemical)\b/i,

    // Architecture/Design
    /\b(architecture|design pattern|microservices|monolith)\b/i,
    /\b(scalability|reliability|availability|consistency)\b/i,
  ];

  return domainPatterns.some(pattern => pattern.test(query));
}

/**
 * Detects simple conversational queries
 */
function isSimpleQuery(query: string, queryTokens: number): boolean {
  // Very short queries are likely simple
  if (queryTokens < 10) {
    const simplePatterns = [
      /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure)\b/i,
      /^what is\b/i,
      /^who is\b/i,
      /^when is\b/i,
      /^where is\b/i,
    ];

    return simplePatterns.some(pattern => pattern.test(query));
  }

  return false;
}

/**
 * Estimates expected output length based on query characteristics
 */
function estimateOutputTokens(analysis: {
  queryLength: number;
  hasCodeRequest: boolean;
  needsReasoning: boolean;
  isCreative: boolean;
  domainSpecific: boolean;
}): number {
  let baseTokens = 150; // Default response length

  // Code requests typically generate more tokens
  if (analysis.hasCodeRequest) {
    baseTokens = 800; // Typical code artifact
  }

  // Creative tasks can be lengthy
  if (analysis.isCreative) {
    baseTokens = Math.max(baseTokens, 600);
  }

  // Reasoning adds explanation tokens
  if (analysis.needsReasoning) {
    baseTokens *= 1.5;
  }

  // Domain-specific adds technical detail
  if (analysis.domainSpecific) {
    baseTokens *= 1.3;
  }

  // Scale with input length (longer questions → longer answers)
  const inputLengthMultiplier = Math.min(2.0, 1 + (analysis.queryLength / 500));
  baseTokens *= inputLengthMultiplier;

  return Math.round(baseTokens);
}

/**
 * Calculate complexity score from 0-100
 */
function calculateComplexityScore(factors: {
  queryLength: number;
  hasCodeRequest: boolean;
  needsReasoning: boolean;
  isCreative: boolean;
  domainSpecific: boolean;
}, query: string): number {
  let score = 0;

  // Length contribution (max 20 points)
  if (factors.queryLength < 20) {
    score += 5;
  } else if (factors.queryLength < 50) {
    score += 10;
  } else if (factors.queryLength < 100) {
    score += 15;
  } else {
    score += 20;
  }

  // Code request (heavy weight - 35 points)
  if (factors.hasCodeRequest) {
    score += 35;
  }

  // Reasoning requirement (25 points)
  if (factors.needsReasoning) {
    score += 25;
  }

  // Creative task (15 points)
  if (factors.isCreative) {
    score += 15;
  }

  // Domain-specific (20 points)
  if (factors.domainSpecific) {
    score += 20;
  }

  // Simple query penalty
  if (isSimpleQuery(query, factors.queryLength)) {
    score = Math.max(0, score - 30);
  }

  return Math.min(100, score);
}

/**
 * Determine complexity level from score
 */
function getComplexityLevel(score: number): ComplexityLevel {
  if (score <= 25) return 'simple';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'complex';
  return 'expert';
}

/**
 * Analyzes query complexity for model routing
 *
 * @param query - User's input query
 * @param context - Optional conversation context for better analysis
 * @returns ComplexityAnalysis with level, score, and factors
 *
 * @example
 * ```typescript
 * const analysis = analyzeComplexity("Build a React todo app");
 * // { level: 'expert', score: 85, factors: { hasCodeRequest: true, ... } }
 * ```
 */
export function analyzeComplexity(query: string, context?: string[]): ComplexityAnalysis {
  // Combine query with recent context for better analysis
  const fullContext = context ? [...context, query].join(' ') : query;

  const factors = {
    queryLength: estimateTokens(query),
    hasCodeRequest: detectCodeRequest(fullContext),
    needsReasoning: detectReasoningNeed(fullContext),
    isCreative: detectCreativeTask(fullContext),
    domainSpecific: detectDomainSpecific(fullContext),
  };

  const score = calculateComplexityScore(factors, query);
  const level = getComplexityLevel(score);
  const estimatedOutputTokens = estimateOutputTokens(factors);

  return {
    level,
    score,
    factors,
    estimatedOutputTokens,
  };
}
