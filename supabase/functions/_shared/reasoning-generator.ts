/**
 * Reasoning Generator - Structured AI Reasoning for Chain of Thought UI
 *
 * Generates structured reasoning steps using AI to provide transparent,
 * educational insights into the AI's decision-making process.
 *
 * Architecture:
 * - Uses OpenRouter Gemini Flash for fast, cost-effective reasoning generation
 * - Server-side validation prevents XSS and malformed data
 * - JSON schema ensures consistent output format
 * - Graceful degradation if reasoning generation fails
 *
 * @module reasoning-generator
 * @since 2025-11-14
 */

import { type OpenRouterMessage } from './openrouter-client.ts';

/**
 * Reasoning step phases following research → analysis → solution pattern
 */
export type ReasoningPhase = 'research' | 'analysis' | 'solution' | 'custom';

/**
 * Icon types matching the Chain of Thought component
 */
export type ReasoningIcon = 'search' | 'lightbulb' | 'target' | 'sparkles';

/**
 * Single reasoning step with phase, title, and detailed items
 */
export interface ReasoningStep {
  phase: ReasoningPhase;
  title: string;
  icon?: ReasoningIcon;
  items: string[];
  timestamp?: number;
}

/**
 * Complete structured reasoning with steps and optional summary
 */
export interface StructuredReasoning {
  steps: ReasoningStep[];
  summary?: string;
}

/**
 * Options for reasoning generation
 */
export interface ReasoningOptions {
  /**
   * Model to use for reasoning generation
   * @default 'google/gemini-2.5-flash-lite-preview-09-2025'
   */
  model?: string;

  /**
   * Temperature for response generation (0-1)
   * @default 0.3
   */
  temperature?: number;

  /**
   * Maximum number of reasoning steps to generate
   * @default 5
   */
  maxSteps?: number;

  /**
   * Timeout in milliseconds for reasoning generation
   * @default 10000 (10 seconds)
   */
  timeout?: number;
}

/**
 * Generate structured reasoning steps using AI
 *
 * @param userMessage - The user's current message to analyze
 * @param conversationHistory - Previous conversation messages for context
 * @param options - Configuration options for reasoning generation
 * @returns Structured reasoning with steps and summary
 * @throws Error if reasoning generation fails or produces invalid output
 *
 * @example
 * ```typescript
 * const reasoning = await generateStructuredReasoning(
 *   "How can I optimize my database queries?",
 *   previousMessages,
 *   { maxSteps: 3 }
 * );
 * ```
 */
export async function generateStructuredReasoning(
  userMessage: string,
  conversationHistory: OpenRouterMessage[],
  options: ReasoningOptions = {}
): Promise<StructuredReasoning> {
  const {
    model = 'google/gemini-2.5-flash-lite-preview-09-2025',
    temperature = 0.3,
    maxSteps = 5,
    timeout = 10000,
  } = options;

  // Construct reasoning prompt with strict JSON output instructions
  const reasoningPrompt = `You are an AI assistant that breaks down complex reasoning into clear, structured steps.

**Task:** Analyze the user's request and generate structured reasoning steps following a research → analysis → solution pattern.

**Output Format (JSON only, no markdown code blocks, no explanation):**
{
  "steps": [
    {
      "phase": "research|analysis|solution",
      "title": "Brief step description (10-80 chars)",
      "icon": "search|lightbulb|target",
      "items": ["Detailed point 1 (20-200 chars)", "Detailed point 2", ...]
    }
  ],
  "summary": "Overall summary (max 200 chars)"
}

**Example:**
User: "How can I optimize my database queries?"
Response:
{
  "steps": [
    {
      "phase": "research",
      "title": "Understanding the performance problem",
      "icon": "search",
      "items": [
        "Current query execution time is 2-3 seconds",
        "Database has 10M+ records with complex JOINs",
        "Missing indexes on frequently queried columns"
      ]
    },
    {
      "phase": "analysis",
      "title": "Identifying optimization opportunities",
      "icon": "lightbulb",
      "items": [
        "N+1 query pattern detected in ORM usage",
        "No query result caching in place",
        "Inefficient JOIN order in multi-table queries"
      ]
    },
    {
      "phase": "solution",
      "title": "Implementing performance improvements",
      "icon": "target",
      "items": [
        "Add composite index on (category_id, created_at)",
        "Implement Redis caching with 5-minute TTL",
        "Refactor JOINs to use covering indexes"
      ]
    }
  ],
  "summary": "Optimize with indexing, caching, and query refactoring for 10x faster queries"
}

**User Request:** ${userMessage}

**Conversation Context:**
${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

**Constraints:**
- Maximum ${maxSteps} steps
- Each item: 20-200 characters
- Title: 10-80 characters
- Use appropriate phase and icon for each step
- Focus on actionable insights
- Return ONLY the JSON object, no markdown formatting

Generate reasoning steps as JSON:`;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Call OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_GEMINI_FLASH_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-app.com', // TODO: Replace with actual domain
        'X-Title': 'Chain of Thought Reasoning',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: reasoningPrompt }],
        temperature,
        max_tokens: 1500, // Increased for comprehensive reasoning
        response_format: { type: 'json_object' }, // Request JSON output
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reasoning generation failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No reasoning content in API response');
    }

    // Parse JSON response (handle markdown code blocks if present)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }

    const reasoning: StructuredReasoning = JSON.parse(jsonStr);

    // Validate and sanitize
    validateReasoningSteps(reasoning);

    console.log(`[Reasoning] Generated ${reasoning.steps.length} steps for: "${userMessage.substring(0, 50)}..."`);

    return reasoning;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error(`Reasoning generation timeout after ${timeout}ms`);
    }

    // Re-throw with context
    throw new Error(`Reasoning generation failed: ${error.message}`);
  }
}

/**
 * Server-side validation to prevent XSS and malformed data
 *
 * Validates:
 * - Structure (object with steps array)
 * - Step count (1-10 steps)
 * - Phase values (research|analysis|solution|custom)
 * - Icon values (search|lightbulb|target|sparkles)
 * - String lengths (titles, items, summary)
 * - XSS patterns (<script>, javascript:, etc.)
 *
 * @param reasoning - The reasoning structure to validate
 * @throws Error if validation fails with specific error message
 */
export function validateReasoningSteps(reasoning: StructuredReasoning): void {
  // Structure validation
  if (!reasoning || typeof reasoning !== 'object') {
    throw new Error('Invalid reasoning: must be an object');
  }

  if (!Array.isArray(reasoning.steps)) {
    throw new Error('Invalid reasoning: steps must be an array');
  }

  if (reasoning.steps.length === 0) {
    throw new Error('Invalid reasoning: steps array cannot be empty');
  }

  if (reasoning.steps.length > 10) {
    throw new Error('Invalid reasoning: maximum 10 steps allowed');
  }

  // Validation constants
  const validPhases: ReasoningPhase[] = ['research', 'analysis', 'solution', 'custom'];
  const validIcons: ReasoningIcon[] = ['search', 'lightbulb', 'target', 'sparkles'];

  // XSS prevention: detect dangerous patterns
  const dangerousPatterns = /<script|<iframe|javascript:|onerror=|onload=|onclick=|<embed|<object/i;

  // Validate each step
  for (const [index, step] of reasoning.steps.entries()) {
    const stepPrefix = `Step ${index + 1}:`;

    // Validate phase
    if (!step.phase || !validPhases.includes(step.phase)) {
      throw new Error(`${stepPrefix} Invalid phase "${step.phase}". Must be one of: ${validPhases.join(', ')}`);
    }

    // Validate title
    if (!step.title || typeof step.title !== 'string') {
      throw new Error(`${stepPrefix} Title must be a non-empty string`);
    }
    if (step.title.length < 10 || step.title.length > 500) {
      throw new Error(`${stepPrefix} Title must be 10-500 characters (got ${step.title.length})`);
    }
    if (dangerousPatterns.test(step.title)) {
      throw new Error(`${stepPrefix} Title contains potentially dangerous content`);
    }

    // Validate icon (optional)
    if (step.icon && !validIcons.includes(step.icon)) {
      throw new Error(`${stepPrefix} Invalid icon "${step.icon}". Must be one of: ${validIcons.join(', ')}`);
    }

    // Validate items array
    if (!Array.isArray(step.items)) {
      throw new Error(`${stepPrefix} Items must be an array`);
    }
    if (step.items.length === 0) {
      throw new Error(`${stepPrefix} Items array cannot be empty`);
    }
    if (step.items.length > 20) {
      throw new Error(`${stepPrefix} Maximum 20 items per step (got ${step.items.length})`);
    }

    // Validate each item
    for (const [itemIndex, item] of step.items.entries()) {
      const itemPrefix = `${stepPrefix} Item ${itemIndex + 1}:`;

      if (typeof item !== 'string') {
        throw new Error(`${itemPrefix} Must be a string`);
      }
      if (item.length < 1) {
        throw new Error(`${itemPrefix} Cannot be empty`);
      }
      if (item.length > 2000) {
        throw new Error(`${itemPrefix} Exceeds 2000 characters (got ${item.length})`);
      }
      if (dangerousPatterns.test(item)) {
        throw new Error(`${itemPrefix} Contains potentially dangerous content`);
      }
    }
  }

  // Validate summary (optional)
  if (reasoning.summary !== undefined && reasoning.summary !== null) {
    if (typeof reasoning.summary !== 'string') {
      throw new Error('Summary must be a string');
    }
    if (reasoning.summary.length > 1000) {
      throw new Error(`Summary exceeds 1000 characters (got ${reasoning.summary.length})`);
    }
    if (dangerousPatterns.test(reasoning.summary)) {
      throw new Error('Summary contains potentially dangerous content');
    }
  }
}

/**
 * Create a minimal default reasoning for error fallback
 *
 * Used when reasoning generation fails to provide graceful degradation
 *
 * @param errorMessage - The error message to include in the fallback
 * @returns A simple reasoning structure with error information
 */
export function createFallbackReasoning(errorMessage: string): StructuredReasoning {
  return {
    steps: [
      {
        phase: 'custom',
        title: 'Reasoning generation unavailable',
        icon: 'sparkles',
        items: [
          'Unable to generate structured reasoning for this response',
          `Error: ${errorMessage}`,
          'The assistant will still provide a helpful response',
        ],
      },
    ],
    summary: 'Proceeding with response generation despite reasoning error',
  };
}
