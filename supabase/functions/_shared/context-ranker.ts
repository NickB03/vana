/**
 * Smart Context Management System - Message Importance Ranking
 *
 * This module provides intelligent ranking of chat messages based on multiple
 * importance factors to optimize context window usage for AI conversations.
 *
 * Key Features:
 * - Exponential recency decay to prioritize recent messages
 * - Entity density tracking for topic relevance
 * - Question/answer pair detection for conversational coherence
 * - Code content detection for technical discussions
 * - Decision point identification for critical choices
 *
 * @module context-ranker
 */

/**
 * Importance factors that contribute to a message's overall ranking
 */
export interface ImportanceFactors {
  /** Recency score using exponential decay (0-1) */
  recency: number;

  /** Density of tracked entities mentioned in message (0-1) */
  entityDensity: number;

  /** Whether message is a question or answer (0-1) */
  questionAnswer: number;

  /** Whether message contains code blocks (0-1) */
  codeContent: number;

  /** Whether message represents a decision point (0-1) */
  decisionPoint: number;
}

/**
 * Ranked message with importance score and contributing factors
 */
export interface RankedMessage {
  /** Message identifier */
  id: string;

  /** Weighted importance score (0-1) */
  importance: number;

  /** Individual factor scores that contribute to importance */
  factors: ImportanceFactors;
}

/**
 * Minimal chat message interface for ranking
 */
interface ChatMessage {
  id: string;
  content: string;
  role?: string;
}

/**
 * Feature weights for computing final importance score
 * Total must sum to 1.0 for normalized scores
 */
const IMPORTANCE_WEIGHTS = {
  recency: 0.3,
  entityDensity: 0.2,
  questionAnswer: 0.2,
  codeContent: 0.15,
  decisionPoint: 0.15,
} as const;

/**
 * Recency decay rate - higher values = faster decay
 * 0.1 gives good balance between recent and historical context
 */
const RECENCY_DECAY_RATE = 0.1;

/**
 * Importance scores for specific message characteristics
 */
const SCORES = {
  QUESTION_ANSWER: 0.8,
  CODE_CONTENT: 0.7,
  DECISION_POINT: 0.9,
} as const;

/**
 * Regex patterns for message analysis
 */
const PATTERNS = {
  /** Matches markdown code blocks (```lang or ```) */
  CODE_BLOCK: /```[\s\S]*?```/g,

  /** Matches question patterns */
  QUESTION: /\?[\s]*$/m,

  /** Matches decision confirmation patterns */
  DECISION: /\b(yes|no|confirmed|agree|disagree|let'?s go with|i'?ll use|decided to|going with|sounds good|that works|perfect)\b/i,
} as const;

/**
 * Checks if a message contains markdown code blocks
 *
 * @param content - Message content to analyze
 * @returns True if message contains ``` code blocks
 *
 * @example
 * ```typescript
 * hasCodeBlock("Here's the code:\n```js\nconst x = 1;\n```") // true
 * hasCodeBlock("Just text") // false
 * ```
 */
export function hasCodeBlock(content: string): boolean {
  return PATTERNS.CODE_BLOCK.test(content);
}

/**
 * Checks if a message represents a decision point in conversation
 *
 * Detects confirmations, agreements, and explicit choices that indicate
 * important conversational decisions.
 *
 * @param content - Message content to analyze
 * @returns True if message contains decision keywords
 *
 * @example
 * ```typescript
 * isDecisionPoint("Yes, let's go with that approach") // true
 * isDecisionPoint("I'll use React for this") // true
 * isDecisionPoint("Just a regular message") // false
 * ```
 */
export function isDecisionPoint(content: string): boolean {
  return PATTERNS.DECISION.test(content);
}

/**
 * Checks if a message is a question or follows a question (likely an answer)
 *
 * @param content - Current message content
 * @param previousContent - Previous message content (optional)
 * @returns True if message is a Q or A in a Q&A pair
 *
 * @example
 * ```typescript
 * isQuestionOrAnswer("How do I deploy?") // true
 * isQuestionOrAnswer("Use the deploy script", "How do I deploy?") // true
 * isQuestionOrAnswer("Random statement") // false
 * ```
 */
export function isQuestionOrAnswer(
  content: string,
  previousContent?: string
): boolean {
  // Check if current message is a question
  if (PATTERNS.QUESTION.test(content)) {
    return true;
  }

  // Check if previous message was a question (this is likely an answer)
  if (previousContent && PATTERNS.QUESTION.test(previousContent)) {
    return true;
  }

  return false;
}

/**
 * Calculates entity density score for a message
 *
 * @param content - Message content to analyze
 * @param trackedEntities - Set of entities to track (case-insensitive)
 * @returns Ratio of tracked entities mentioned (0-1)
 *
 * @example
 * ```typescript
 * const entities = new Set(['React', 'TypeScript', 'Vite']);
 * calculateEntityDensity("Using React and TypeScript", entities) // 0.67
 * ```
 */
function calculateEntityDensity(
  content: string,
  trackedEntities: Set<string>
): number {
  if (trackedEntities.size === 0) {
    return 0;
  }

  const contentLower = content.toLowerCase();
  let matchCount = 0;

  for (const entity of trackedEntities) {
    if (contentLower.includes(entity.toLowerCase())) {
      matchCount++;
    }
  }

  return matchCount / trackedEntities.size;
}

/**
 * Calculates recency score using exponential decay
 *
 * More recent messages get higher scores, with exponential falloff
 * for older messages to maintain conversational context.
 *
 * @param index - Message position in array (0 = oldest)
 * @param totalMessages - Total number of messages
 * @returns Recency score (0-1)
 *
 * @example
 * ```typescript
 * calculateRecencyScore(99, 100) // ~0.95 (most recent)
 * calculateRecencyScore(0, 100)  // ~0.00 (oldest)
 * ```
 */
function calculateRecencyScore(index: number, totalMessages: number): number {
  const positionFromEnd = totalMessages - index - 1;
  return Math.exp(-RECENCY_DECAY_RATE * positionFromEnd);
}

/**
 * Calculates weighted importance score from individual factors
 *
 * @param factors - Individual importance factors
 * @returns Weighted sum of all factors (0-1)
 */
function calculateImportanceScore(factors: ImportanceFactors): number {
  return (
    factors.recency * IMPORTANCE_WEIGHTS.recency +
    factors.entityDensity * IMPORTANCE_WEIGHTS.entityDensity +
    factors.questionAnswer * IMPORTANCE_WEIGHTS.questionAnswer +
    factors.codeContent * IMPORTANCE_WEIGHTS.codeContent +
    factors.decisionPoint * IMPORTANCE_WEIGHTS.decisionPoint
  );
}

/**
 * Ranks messages by importance using multiple weighted factors
 *
 * This is the main entry point for the context ranking system. It analyzes
 * each message and assigns an importance score based on:
 * - Recency (30%): Recent messages are more relevant
 * - Entity density (20%): Messages mentioning tracked entities are important
 * - Question/answer (20%): Q&A pairs maintain conversational coherence
 * - Code content (15%): Technical discussions with code are valuable
 * - Decision points (15%): Critical choices shape conversation direction
 *
 * @param messages - Array of chat messages to rank
 * @param trackedEntities - Set of entities to track for relevance scoring
 * @returns Array of ranked messages with importance scores and factors
 *
 * @example
 * ```typescript
 * const messages = [
 *   { id: '1', content: 'How do I use React?' },
 *   { id: '2', content: 'Here's a React example:\n```jsx\nconst App = () => {};\n```' }
 * ];
 * const entities = new Set(['React', 'JSX']);
 * const ranked = rankMessageImportance(messages, entities);
 * // ranked[1].importance > ranked[0].importance (more recent + code + entities)
 * ```
 */
export function rankMessageImportance(
  messages: ChatMessage[],
  trackedEntities: Set<string>
): RankedMessage[] {
  const totalMessages = messages.length;

  return messages.map((message, index) => {
    // Calculate individual importance factors
    const recency = calculateRecencyScore(index, totalMessages);
    const entityDensity = calculateEntityDensity(message.content, trackedEntities);

    const previousContent = index > 0 ? messages[index - 1].content : undefined;
    const questionAnswer = isQuestionOrAnswer(message.content, previousContent)
      ? SCORES.QUESTION_ANSWER
      : 0;

    const codeContent = hasCodeBlock(message.content) ? SCORES.CODE_CONTENT : 0;
    const decisionPoint = isDecisionPoint(message.content) ? SCORES.DECISION_POINT : 0;

    const factors: ImportanceFactors = {
      recency,
      entityDensity,
      questionAnswer,
      codeContent,
      decisionPoint,
    };

    // Calculate weighted importance score
    const importance = calculateImportanceScore(factors);

    return {
      id: message.id,
      importance,
      factors,
    };
  });
}
