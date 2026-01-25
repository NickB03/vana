/**
 * Intent Confirmation Message Generator
 *
 * Generates natural-language confirmation messages for tool calls.
 * Deterministic - no LLM call required.
 */

/**
 * Generate natural-language intent confirmation based on tool and arguments.
 * Deterministic - no LLM call required.
 */
export function getIntentConfirmationMessage(
  toolName: string,
  args: Record<string, unknown>
): string {
  switch (toolName) {
    case 'generate_artifact': {
      const artifactType = (args.artifactType as string) || 'component';
      const prompt = (args.prompt as string) || '';
      const keyNoun = extractKeyNoun(prompt) || artifactType;
      return `I'll build ${addArticle(keyNoun)} for you...`;
    }

    case 'generate_image': {
      const prompt = (args.prompt as string) || '';
      const mode = (args.mode as string) || 'generate';
      if (mode === 'edit') {
        return `I'll edit that image for you...`;
      }
      const subject = extractImageSubject(prompt) || 'that';
      return `I'll create an image of ${subject} for you...`;
    }

    case 'browser.search': {
      const query = (args.query as string) || '';
      const topic = extractSearchTopic(query) || 'that';
      return `I'll search for information about ${topic}...`;
    }

    default:
      return `I'll help you with that...`;
  }
}

/**
 * Extract main noun from artifact prompts.
 * Patterns: "build me a todo app", "create an interactive dashboard"
 * Returns lowercase noun or null.
 */
export function extractKeyNoun(prompt: string): string | null {
  if (!prompt) return null;

  const normalized = prompt.toLowerCase().trim();

  // Pattern 1: "build/create/make [me] [a/an] <noun>"
  const buildPattern = /(?:build|create|make)(?:\s+me)?(?:\s+an?)?(?:\s+interactive)?(?:\s+responsive)?\s+(\w+(?:\s+\w+){0,2})/i;
  const buildMatch = normalized.match(buildPattern);
  if (buildMatch && buildMatch[1]) {
    return buildMatch[1].trim();
  }

  // Pattern 2: "a/an <noun> that/for..."
  const nounPattern = /\ban?\s+(\w+(?:\s+\w+){0,2})(?:\s+(?:that|for|with|to))?/i;
  const nounMatch = normalized.match(nounPattern);
  if (nounMatch && nounMatch[1]) {
    return nounMatch[1].trim();
  }

  // Pattern 3: First meaningful noun (fallback)
  const words = normalized.split(/\s+/);
  const skipWords = new Set(['build', 'create', 'make', 'me', 'a', 'an', 'the', 'that', 'for', 'with', 'to']);
  for (const word of words) {
    if (!skipWords.has(word) && word.length > 2) {
      return word;
    }
  }

  return null;
}

/**
 * Add appropriate a/an article based on first letter.
 * Check first letter for vowel.
 */
export function addArticle(noun: string): string {
  if (!noun) return 'that';

  const firstChar = noun.charAt(0).toLowerCase();
  const vowels = new Set(['a', 'e', 'i', 'o', 'u']);

  // Special case: "hour" should be "an hour"
  if (noun.toLowerCase().startsWith('hour')) {
    return `an ${noun}`;
  }

  if (vowels.has(firstChar)) {
    return `an ${noun}`;
  }

  return `a ${noun}`;
}

/**
 * Extract subject from image generation prompts.
 * Remove prefixes like "generate", "create", "draw".
 * Limit to 40 chars.
 */
export function extractImageSubject(prompt: string): string | null {
  if (!prompt) return null;

  let normalized = prompt.trim();

  // Remove common prefixes
  const prefixes = [
    /^(?:generate|create|draw|make|produce|design|render)(?:\s+(?:me|an?|the))?\s+/i,
    /^(?:image|picture|photo|illustration)\s+of\s+/i,
  ];

  for (const prefix of prefixes) {
    normalized = normalized.replace(prefix, '');
  }

  // Remove leading articles
  normalized = normalized.replace(/^(?:a|an|the)\s+/i, '');

  // Limit to 40 characters
  if (normalized.length > 40) {
    normalized = normalized.substring(0, 37) + '...';
  }

  return normalized || null;
}

/**
 * Extract topic from search queries.
 * Remove question prefixes like "what is", "how to".
 * Limit to 50 chars.
 */
export function extractSearchTopic(query: string): string | null {
  if (!query) return null;

  let normalized = query.trim();

  // Remove common question prefixes
  const questionPrefixes = [
    /^(?:what|who|when|where|why|how)(?:\s+(?:is|are|was|were|do|does|did|can|could|should|would))?\s+/i,
    /^(?:search|find|look\s+up|look\s+for|tell\s+me\s+about)\s+/i,
  ];

  for (const prefix of questionPrefixes) {
    normalized = normalized.replace(prefix, '');
  }

  // Remove leading articles
  normalized = normalized.replace(/^(?:a|an|the)\s+/i, '');

  // Limit to 50 characters
  if (normalized.length > 50) {
    normalized = normalized.substring(0, 47) + '...';
  }

  return normalized || null;
}
