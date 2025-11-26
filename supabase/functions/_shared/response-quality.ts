/**
 * Response Quality Validation and Ranking System
 *
 * Provides pattern-based quality checks for AI responses to ensure:
 * - Factual accuracy (verifiable claims)
 * - Consistency with conversation history
 * - Relevance to user query
 * - Completeness of answers
 * - Safety (no harmful content)
 *
 * @module response-quality
 */

export interface QualityMetrics {
  factuality: number;      // 0-1: Are claims verifiable?
  consistency: number;     // 0-1: Matches conversation history?
  relevance: number;       // 0-1: Addresses user's question?
  completeness: number;    // 0-1: Fully answers the question?
  safety: number;          // 0-1: No harmful content?
  overall: number;         // Weighted average
}

export interface QualityCheckResult {
  metrics: QualityMetrics;
  issues: QualityIssue[];
  recommendation: 'serve' | 'warn' | 'regenerate';
}

export interface QualityIssue {
  type: 'factuality' | 'consistency' | 'relevance' | 'completeness' | 'safety';
  severity: 'low' | 'medium' | 'high';
  description: string;
  location?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConsistencyResult {
  score: number;
  issues: QualityIssue[];
}

interface RelevanceResult {
  score: number;
  issues: QualityIssue[];
}

interface CompletenessResult {
  score: number;
  issues: QualityIssue[];
}

interface SafetyResult {
  score: number;
  issues: QualityIssue[];
}

interface FactualityResult {
  score: number;
  issues: QualityIssue[];
}

/**
 * Quality score thresholds for recommendation engine
 */
const THRESHOLDS = {
  SERVE: 0.7,      // High quality - serve immediately
  WARN: 0.4,       // Medium quality - serve with logging
  REGENERATE: 0.4, // Low quality - regenerate response
} as const;

/**
 * Weights for calculating overall quality score
 */
const WEIGHTS = {
  factuality: 0.25,
  consistency: 0.20,
  relevance: 0.25,
  completeness: 0.20,
  safety: 0.10,
} as const;

/**
 * Patterns indicating potential factual issues
 */
const FACTUALITY_PATTERNS = {
  // Uncertain language (good - shows awareness of limits)
  HEDGING: [
    /\b(might|may|could|possibly|perhaps|likely|probably|potentially)\b/gi,
    /\b(I think|I believe|in my opinion|it seems)\b/gi,
  ],
  // Overly certain claims (bad - may be hallucination)
  ABSOLUTE: [
    /\b(always|never|definitely|certainly|absolutely|guaranteed|100%)\b/gi,
    /\b(everyone knows|it's obvious that|clearly|undoubtedly)\b/gi,
  ],
  // Statistical claims without sources (suspicious)
  STATISTICS: [
    /\b\d+%\b/g,
    /\b\d+\s*(million|billion|thousand)\b/gi,
    /\b(study shows|research indicates|statistics show)\b/gi,
  ],
} as const;

/**
 * Patterns indicating safety concerns
 */
const SAFETY_PATTERNS = {
  // High severity - immediate rejection
  DANGEROUS: [
    /\b(how to (make|build|create) (a )?(bomb|explosive|weapon))\b/gi,
    /\b(self[- ]harm|suicide methods|how to (die|kill (yourself|myself)))\b/gi,
    /\b(illegal drugs|how to (hack|crack|steal))\b/gi,
  ],
  // Medium severity - warning
  SENSITIVE: [
    /\b(personal information|social security|credit card|password)\b/gi,
    /\b(medical advice|diagnosis|treatment for)\b/gi,
    /\b(legal advice|you should sue|file a lawsuit)\b/gi,
  ],
  // Low severity - monitoring
  CONTROVERSIAL: [
    /\b(political|controversial|sensitive topic)\b/gi,
  ],
} as const;

/**
 * Check factuality of response using pattern matching
 */
export function checkFactuality(response: string): FactualityResult {
  const issues: QualityIssue[] = [];
  let score = 1.0;

  // Count hedging vs absolute statements
  const hedgingCount = FACTUALITY_PATTERNS.HEDGING.reduce(
    (count, pattern) => count + (response.match(pattern)?.length || 0),
    0
  );
  const absoluteCount = FACTUALITY_PATTERNS.ABSOLUTE.reduce(
    (count, pattern) => count + (response.match(pattern)?.length || 0),
    0
  );

  // Penalize overly absolute statements (potential hallucinations)
  if (absoluteCount > hedgingCount && absoluteCount > 3) {
    score -= 0.2;
    issues.push({
      type: 'factuality',
      severity: 'medium',
      description: `Contains ${absoluteCount} absolute statements without hedging - may indicate overconfidence or hallucination`,
    });
  }

  // Check for unsourced statistics
  const statsCount = FACTUALITY_PATTERNS.STATISTICS.reduce(
    (count, pattern) => count + (response.match(pattern)?.length || 0),
    0
  );
  if (statsCount > 2) {
    score -= 0.15;
    issues.push({
      type: 'factuality',
      severity: 'low',
      description: `Contains ${statsCount} statistical claims - verify sources`,
    });
  }

  // Very short responses are often incomplete
  if (response.length < 100) {
    score -= 0.1;
    issues.push({
      type: 'factuality',
      severity: 'low',
      description: 'Response is very short - may lack necessary detail',
    });
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Check consistency with conversation history
 */
export function checkConsistency(
  response: string,
  conversationHistory: Message[]
): ConsistencyResult {
  const issues: QualityIssue[] = [];
  let score = 1.0;

  if (conversationHistory.length === 0) {
    return { score, issues }; // No history to check against
  }

  // Extract previous assistant messages
  const previousResponses = conversationHistory
    .filter(msg => msg.role === 'assistant')
    .map(msg => msg.content);

  if (previousResponses.length === 0) {
    return { score, issues }; // First response
  }

  // Check for direct contradictions
  const contradictionPatterns = [
    { current: /\bno\b/gi, previous: /\byes\b/gi },
    { current: /\byes\b/gi, previous: /\bno\b/gi },
    { current: /\b(never|cannot|impossible)\b/gi, previous: /\b(always|can|possible)\b/gi },
    { current: /\b(always|can|possible)\b/gi, previous: /\b(never|cannot|impossible)\b/gi },
  ];

  let contradictions = 0;
  for (const prevResponse of previousResponses) {
    for (const { current, previous } of contradictionPatterns) {
      if (response.match(current) && prevResponse.match(previous)) {
        contradictions++;
      }
    }
  }

  if (contradictions > 0) {
    score -= 0.3 * Math.min(contradictions, 3);
    issues.push({
      type: 'consistency',
      severity: contradictions > 2 ? 'high' : 'medium',
      description: `Detected ${contradictions} potential contradiction(s) with previous responses`,
    });
  }

  // Check if response acknowledges previous context
  const contextAcknowledgment = [
    /\b(as (I|we) (mentioned|said|discussed) (earlier|before|previously))\b/gi,
    /\b(following up on|building on|continuing from)\b/gi,
    /\b(you (asked|mentioned|said))\b/gi,
  ];

  const acknowledgesContext = contextAcknowledgment.some(
    pattern => response.match(pattern)
  );

  // If there's significant history but no acknowledgment, penalize slightly
  if (conversationHistory.length > 4 && !acknowledgesContext) {
    score -= 0.1;
    issues.push({
      type: 'consistency',
      severity: 'low',
      description: 'Response does not reference previous conversation context',
    });
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Check relevance to user query
 */
export function checkRelevance(response: string, userQuery: string): RelevanceResult {
  const issues: QualityIssue[] = [];
  let score = 1.0;

  const queryLower = userQuery.toLowerCase();
  const responseLower = response.toLowerCase();

  // Extract key terms from query (words > 3 chars, excluding common words)
  const commonWords = new Set([
    'what', 'when', 'where', 'who', 'why', 'how', 'the', 'is', 'are', 'was',
    'were', 'will', 'would', 'could', 'should', 'can', 'does', 'did', 'has',
    'have', 'had', 'this', 'that', 'these', 'those', 'with', 'from', 'for',
  ]);

  const queryTerms = queryLower
    .match(/\b\w{4,}\b/g)
    ?.filter(term => !commonWords.has(term)) || [];

  if (queryTerms.length === 0) {
    return { score, issues }; // Cannot evaluate relevance
  }

  // Calculate term overlap
  const matchedTerms = queryTerms.filter(term => responseLower.includes(term));
  const overlapRatio = matchedTerms.length / queryTerms.length;

  if (overlapRatio < 0.3) {
    score -= 0.4;
    issues.push({
      type: 'relevance',
      severity: 'high',
      description: `Only ${Math.round(overlapRatio * 100)}% of query terms appear in response - possible topic drift`,
    });
  } else if (overlapRatio < 0.5) {
    score -= 0.2;
    issues.push({
      type: 'relevance',
      severity: 'medium',
      description: `${Math.round(overlapRatio * 100)}% of query terms appear in response - may not fully address question`,
    });
  }

  // Check for explicit evasion patterns
  const evasionPatterns = [
    /\b(I (cannot|can't|won't) (answer|help with|discuss))\b/gi,
    /\b(I don't have (information|data) (about|on))\b/gi,
    /\b(that's (outside|beyond) my)\b/gi,
  ];

  const isEvasive = evasionPatterns.some(pattern => response.match(pattern));
  if (isEvasive) {
    score -= 0.3;
    issues.push({
      type: 'relevance',
      severity: 'medium',
      description: 'Response appears to evade or refuse the question',
    });
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Check completeness of answer
 */
export function checkCompleteness(
  response: string,
  userQuery: string
): CompletenessResult {
  const issues: QualityIssue[] = [];
  let score = 1.0;

  // Check for multi-part questions
  const questionParts = userQuery.match(/\?/g)?.length || 1;
  const queryHasMultipleParts = questionParts > 1 || /\band\b.*\?/.test(userQuery);

  if (queryHasMultipleParts) {
    // For multi-part questions, response should be longer
    const minLength = questionParts * 150;
    if (response.length < minLength) {
      score -= 0.3;
      issues.push({
        type: 'completeness',
        severity: 'medium',
        description: `Query has ${questionParts} parts but response is short - may not answer all parts`,
      });
    }
  }

  // Check for incomplete endings
  const incompletePatterns = [
    /\.\.\.$/, // Trailing ellipsis
    /\bin (summary|conclusion|short)\b$/gi, // Ends abruptly
  ];

  const hasIncompleteEnding = incompletePatterns.some(
    pattern => response.match(pattern)
  );

  if (hasIncompleteEnding) {
    score -= 0.2;
    issues.push({
      type: 'completeness',
      severity: 'low',
      description: 'Response appears to end abruptly or incompletely',
    });
  }

  // Check for "more information needed" patterns
  const needsMoreInfoPatterns = [
    /\b(need more (information|details|context))\b/gi,
    /\b(could you (clarify|provide more|specify))\b/gi,
    /\b(unclear what you mean)\b/gi,
  ];

  const needsMoreInfo = needsMoreInfoPatterns.some(
    pattern => response.match(pattern)
  );

  if (needsMoreInfo) {
    score -= 0.15;
    issues.push({
      type: 'completeness',
      severity: 'low',
      description: 'Response requests clarification instead of attempting to answer',
    });
  }

  // Very short responses are likely incomplete
  if (response.length < 50) {
    score -= 0.4;
    issues.push({
      type: 'completeness',
      severity: 'high',
      description: 'Response is extremely short - likely incomplete',
    });
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Check safety of response
 */
export function checkSafety(response: string): SafetyResult {
  const issues: QualityIssue[] = [];
  let score = 1.0;

  // Check dangerous content (immediate rejection)
  for (const pattern of SAFETY_PATTERNS.DANGEROUS) {
    const matches = response.match(pattern);
    if (matches) {
      score = 0; // Immediate fail
      issues.push({
        type: 'safety',
        severity: 'high',
        description: `Contains dangerous content: ${matches[0]}`,
        location: matches[0],
      });
    }
  }

  // Check sensitive content (warning)
  for (const pattern of SAFETY_PATTERNS.SENSITIVE) {
    const matches = response.match(pattern);
    if (matches) {
      score -= 0.3;
      issues.push({
        type: 'safety',
        severity: 'medium',
        description: `Contains sensitive content: ${matches[0]}`,
        location: matches[0],
      });
    }
  }

  // Check controversial content (monitoring only)
  for (const pattern of SAFETY_PATTERNS.CONTROVERSIAL) {
    const matches = response.match(pattern);
    if (matches) {
      score -= 0.1;
      issues.push({
        type: 'safety',
        severity: 'low',
        description: `May contain controversial content: ${matches[0]}`,
        location: matches[0],
      });
    }
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Main validation function - runs all quality checks
 *
 * @param response - AI-generated response to validate
 * @param userQuery - Original user query
 * @param conversationHistory - Previous messages in conversation
 * @returns Quality check result with metrics, issues, and recommendation
 */
export function validateResponse(
  response: string,
  userQuery: string,
  conversationHistory: Message[] = []
): QualityCheckResult {
  // Run all quality checks
  const factualityResult = checkFactuality(response);
  const consistencyResult = checkConsistency(response, conversationHistory);
  const relevanceResult = checkRelevance(response, userQuery);
  const completenessResult = checkCompleteness(response, userQuery);
  const safetyResult = checkSafety(response);

  // Combine all issues
  const issues = [
    ...factualityResult.issues,
    ...consistencyResult.issues,
    ...relevanceResult.issues,
    ...completenessResult.issues,
    ...safetyResult.issues,
  ];

  // Calculate weighted overall score
  const overall =
    factualityResult.score * WEIGHTS.factuality +
    consistencyResult.score * WEIGHTS.consistency +
    relevanceResult.score * WEIGHTS.relevance +
    completenessResult.score * WEIGHTS.completeness +
    safetyResult.score * WEIGHTS.safety;

  const metrics: QualityMetrics = {
    factuality: factualityResult.score,
    consistency: consistencyResult.score,
    relevance: relevanceResult.score,
    completeness: completenessResult.score,
    safety: safetyResult.score,
    overall,
  };

  // Determine recommendation
  let recommendation: 'serve' | 'warn' | 'regenerate';
  if (overall >= THRESHOLDS.SERVE) {
    recommendation = 'serve';
  } else if (overall >= THRESHOLDS.WARN) {
    recommendation = 'warn';
  } else {
    recommendation = 'regenerate';
  }

  // Safety issues always trigger regeneration
  const hasCriticalSafetyIssue = issues.some(
    issue => issue.type === 'safety' && issue.severity === 'high'
  );
  if (hasCriticalSafetyIssue) {
    recommendation = 'regenerate';
  }

  return {
    metrics,
    issues,
    recommendation,
  };
}
