/**
 * Reasoning Status Extractor
 *
 * Extracts contextual status messages from Gemini reasoning text using patterns
 * optimized for Gemini 3 Flash's prose style. Provides time-based fallbacks
 * when patterns don't match.
 *
 * @module reasoning-status-extractor
 */

/**
 * Maps common verbs to their gerund (-ing) forms for status message generation
 */
const VERB_TO_GERUND: Record<string, string> = {
  'analyze': 'Analyzing',
  'check': 'Checking',
  'create': 'Creating',
  'design': 'Designing',
  'implement': 'Implementing',
  'plan': 'Planning',
  'build': 'Building',
  'generate': 'Generating',
  'validate': 'Validating',
  'process': 'Processing',
  'review': 'Reviewing',
  'examine': 'Examining',
  'evaluate': 'Evaluating',
  'consider': 'Considering',
  'organize': 'Organizing',
  'structure': 'Structuring',
  'format': 'Formatting',
  'optimize': 'Optimizing',
  'refactor': 'Refactoring',
  'debug': 'Debugging',
  'test': 'Testing',
  'verify': 'Verifying',
  'prepare': 'Preparing',
  'compile': 'Compiling',
  'execute': 'Executing',
  'calculate': 'Calculating',
  'compute': 'Computing',
  'search': 'Searching',
  'fetch': 'Fetching',
  'retrieve': 'Retrieving',
  'load': 'Loading',
  'save': 'Saving',
  'update': 'Updating',
  'modify': 'Modifying',
  'transform': 'Transforming',
  'convert': 'Converting',
  'parse': 'Parsing',
  'render': 'Rendering',
  'compose': 'Composing',
  'craft': 'Crafting',
  'write': 'Writing',
  'read': 'Reading',
  'scan': 'Scanning',
  'explore': 'Exploring',
  'investigate': 'Investigating',
  'research': 'Researching',
};

/**
 * Regex patterns optimized for Gemini 3 Flash's reasoning prose style.
 * Ordered by priority (more specific patterns first).
 */
const GEMINI_REASONING_PATTERNS = [
  // Markdown headers: **Analyzing the schema**
  {
    regex: /\*\*([A-Z][a-z]+ing)\s+([^*]+)\*\*/,
    extract: (match: RegExpMatchArray) => `${match[1]} ${cleanObject(match[2])}`,
    confidence: 'high' as const,
    name: 'markdown_header',
  },
  // "I will [verb] [object]" or "I'll [verb] [object]"
  {
    regex: /(?:I will|I'll)\s+([a-z]+)\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|$)/i,
    extract: (match: RegExpMatchArray) => {
      const verb = match[1].toLowerCase();
      const object = cleanObject(match[2]);
      return `${toGerund(verb)} ${object}`;
    },
    confidence: 'high' as const,
    name: 'future_action',
  },
  // "Let me [verb] [object]"
  {
    regex: /Let me\s+([a-z]+)\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|$)/i,
    extract: (match: RegExpMatchArray) => {
      const verb = match[1].toLowerCase();
      const object = cleanObject(match[2]);
      return `${toGerund(verb)} ${object}`;
    },
    confidence: 'high' as const,
    name: 'let_me',
  },
  // "First, I'll [verb] [object]" or "First, [verb] [object]"
  {
    regex: /First,\s+(?:I'll\s+)?([a-z]+)\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|$)/i,
    extract: (match: RegExpMatchArray) => {
      const verb = match[1].toLowerCase();
      const object = cleanObject(match[2]);
      return `${toGerund(verb)} ${object}`;
    },
    confidence: 'medium' as const,
    name: 'first_step',
  },
  // "I'm [verb]ing [object]"
  {
    regex: /I'm\s+([a-z]+ing)\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|$)/i,
    extract: (match: RegExpMatchArray) => {
      const gerund = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      const object = cleanObject(match[2]);
      return `${gerund} ${object}`;
    },
    confidence: 'high' as const,
    name: 'present_continuous',
  },
  // "The first step is to [verb] [object]"
  {
    regex: /The first step is to\s+([a-z]+)\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|$)/i,
    extract: (match: RegExpMatchArray) => {
      const verb = match[1].toLowerCase();
      const object = cleanObject(match[2]);
      return `${toGerund(verb)} ${object}`;
    },
    confidence: 'medium' as const,
    name: 'step_definition',
  },
  // "I'm thinking about [object]"
  {
    regex: /I'm thinking about\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|$)/i,
    extract: (match: RegExpMatchArray) => `Thinking about ${cleanObject(match[1])}`,
    confidence: 'low' as const,
    name: 'thinking_about',
  },
  // "[Verb]ing [object]" at start of line
  {
    regex: /^([A-Z][a-z]+ing)\s+(?:the\s+)?([a-z\s]+?)(?:\.|,|$)/m,
    extract: (match: RegExpMatchArray) => `${match[1]} ${cleanObject(match[2])}`,
    confidence: 'medium' as const,
    name: 'gerund_start',
  },
];

/**
 * Result of status extraction from reasoning text
 */
export interface StatusExtractionResult {
  /** Extracted status message (null if no pattern matched) */
  status: string | null;
  /** Confidence level of the extraction */
  confidence: 'high' | 'medium' | 'low';
  /** Name of the pattern that matched (null if no match) */
  pattern: string | null;
}

/**
 * Converts a verb to its gerund (-ing) form.
 * Uses lookup table for common verbs, falls back to simple append for others.
 *
 * @param verb - The verb to convert
 * @returns The gerund form of the verb
 *
 * @example
 * toGerund('analyze') // => 'Analyzing'
 * toGerund('run') // => 'Running' (fallback)
 */
export function toGerund(verb: string): string {
  const lowerVerb = verb.toLowerCase();

  // Use lookup table if available
  if (VERB_TO_GERUND[lowerVerb]) {
    return VERB_TO_GERUND[lowerVerb];
  }

  // Fallback: simple -ing append (not perfect, but good enough)
  const gerund = lowerVerb + 'ing';
  return gerund.charAt(0).toUpperCase() + gerund.slice(1);
}

/**
 * Cleans extracted object text for status messages.
 * Removes extra whitespace, limits length, and normalizes formatting.
 *
 * @param text - The object text to clean
 * @returns Cleaned object text (max 30 chars)
 *
 * @example
 * cleanObject('the database schema  ') // => 'database schema'
 * cleanObject('a very long component name that exceeds limits') // => 'very long component name...'
 */
export function cleanObject(text: string): string {
  // Remove leading/trailing whitespace and normalize internal whitespace
  let cleaned = text.trim().replace(/\s+/g, ' ');

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:!?]+$/, '');

  // Remove leading articles (the, a, an) to avoid redundancy
  cleaned = cleaned.replace(/^(?:the|a|an)\s+/i, '');

  // Add minimum length check to avoid awkward status like "Analyzing a..."
  if (cleaned.length < 3) {
    return '';
  }

  // Limit length (leave room for verb prefix + "...")
  const maxLength = 30;
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + '...';
  }

  return cleaned;
}

/**
 * Extracts a contextual status message from Gemini reasoning text.
 * Uses pattern matching optimized for Gemini 3 Flash's prose style.
 *
 * @param text - The reasoning text to analyze
 * @returns Extraction result with status, confidence, and matched pattern
 *
 * @example
 * const result = extractStatusFromReasoning("**Analyzing the schema**");
 * // => { status: "Analyzing schema...", confidence: "high", pattern: "markdown_header" }
 */
export function extractStatusFromReasoning(text: string): StatusExtractionResult {
  // Try each pattern in order of priority
  for (const pattern of GEMINI_REASONING_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      try {
        let status = pattern.extract(match);

        // Skip if object extraction returned empty (too short)
        if (!status || status.trim() === '...') {
          continue;
        }

        // Ensure status ends with "..."
        if (!status.endsWith('...')) {
          status += '...';
        }

        // Ensure status is capitalized
        status = status.charAt(0).toUpperCase() + status.slice(1);

        // Enforce max length (45 chars including "...")
        if (status.length > 45) {
          status = status.substring(0, 42) + '...';
        }

        return {
          status,
          confidence: pattern.confidence,
          pattern: pattern.name,
        };
      } catch (error) {
        // Pattern matched but extraction failed, try next pattern
        console.warn(`Pattern ${pattern.name} matched but extraction failed:`, error);
        continue;
      }
    }
  }

  // No pattern matched
  return {
    status: null,
    confidence: 'low',
    pattern: null,
  };
}

/**
 * Returns a generic time-based status message as a fallback.
 * Used when pattern extraction fails or reasoning text is empty.
 *
 * @param elapsedMs - Milliseconds elapsed since request started
 * @returns Generic status message appropriate for elapsed time
 *
 * @example
 * getTimeBasedStatus(2000) // => "Analyzing your request..."
 * getTimeBasedStatus(50000) // => "Almost there, finalizing response..."
 */
export function getTimeBasedStatus(elapsedMs: number): string {
  if (elapsedMs < 3000) {
    return 'Analyzing your request...';
  } else if (elapsedMs < 10000) {
    return 'Still working on your request...';
  } else if (elapsedMs < 20000) {
    return 'Building a detailed response...';
  } else if (elapsedMs < 30000) {
    return 'Crafting a thorough answer...';
  } else if (elapsedMs < 45000) {
    return 'This is taking longer than usual...';
  } else {
    return 'Almost there, finalizing response...';
  }
}
