/**
 * Prompt Injection Defense
 *
 * Sanitizes user-controlled inputs that are injected into system prompts.
 * Prevents prompt manipulation attacks via mode hints and artifact context.
 *
 * SECURITY FIX: Added Unicode normalization to prevent homoglyph attacks.
 * Attackers can use visually similar Unicode characters (e.g., Cyrillic 'а')
 * to bypass string matching checks.
 *
 * @security CWE-74 - Prompt Injection Prevention
 */

// =============================================================================
// Types
// =============================================================================

export type ModeHint = "artifact" | "image" | "auto";

export interface SanitizedContext {
  modeHint: ModeHint;
  artifactContext: string;
  userMessage: string;
}

// =============================================================================
// Unicode Normalization Utilities
// =============================================================================

/**
 * SECURITY FIX: Map of common confusable characters (homoglyphs)
 *
 * Attackers use visually similar characters from different Unicode blocks
 * to bypass security checks. For example:
 * - Cyrillic 'а' (U+0430) looks like Latin 'a' (U+0061)
 * - Greek 'ο' (U+03BF) looks like Latin 'o' (U+006F)
 *
 * This map normalizes common confusables to their ASCII equivalents.
 */
const CONFUSABLE_MAP: Record<string, string> = {
  // Cyrillic confusables
  "а": "a",
  "е": "e",
  "о": "o",
  "р": "p",
  "с": "c",
  "у": "y",
  "х": "x",
  "А": "A",
  "В": "B",
  "Е": "E",
  "К": "K",
  "М": "M",
  "Н": "H",
  "О": "O",
  "Р": "P",
  "С": "C",
  "Т": "T",
  "Х": "X",
  // Greek confusables
  "α": "a",
  "ο": "o",
  "ρ": "p",
  "τ": "t",
  "υ": "u",
  "ν": "v",
  "Α": "A",
  "Β": "B",
  "Ε": "E",
  "Η": "H",
  "Ι": "I",
  "Κ": "K",
  "Μ": "M",
  "Ν": "N",
  "Ο": "O",
  "Ρ": "P",
  "Τ": "T",
  "Υ": "Y",
  "Χ": "X",
  "Ζ": "Z",
  // Mathematical/special
  "ℊ": "g",
  "ℎ": "h",
  "ℯ": "e",
  "℮": "e",
  // Full-width Latin (commonly used in CJK contexts)
  "ａ": "a",
  "ｂ": "b",
  "ｃ": "c",
  "ｄ": "d",
  "ｅ": "e",
  "ｆ": "f",
  "ｇ": "g",
  "ｈ": "h",
  "ｉ": "i",
  "ｊ": "j",
  "ｋ": "k",
  "ｌ": "l",
  "ｍ": "m",
  "ｎ": "n",
  "ｏ": "o",
  "ｐ": "p",
  "ｑ": "q",
  "ｒ": "r",
  "ｓ": "s",
  "ｔ": "t",
  "ｕ": "u",
  "ｖ": "v",
  "ｗ": "w",
  "ｘ": "x",
  "ｙ": "y",
  "ｚ": "z",
};

/**
 * SECURITY FIX: Normalize Unicode string to prevent homoglyph attacks
 *
 * 1. Apply NFKC normalization (compatibility decomposition + canonical composition)
 * 2. Replace known confusable characters with ASCII equivalents
 * 3. Remove zero-width and invisible characters
 */
function normalizeUnicode(input: string): string {
  // Step 1: NFKC normalization (handles things like ligatures, width variants)
  let normalized = input.normalize("NFKC");

  // Step 2: Replace known confusables
  let result = "";
  for (const char of normalized) {
    result += CONFUSABLE_MAP[char] ?? char;
  }

  // Step 3: Remove zero-width and invisible characters
  result = result.replace(/[\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFEFF]/g, "");

  return result;
}

// =============================================================================
// Dangerous Pattern Detection
// =============================================================================

const DANGEROUS_PATTERNS = [
  // System instruction markers
  /\bSYSTEM\s*:/gi,
  /\bIMPORTANT\s*:/gi,
  /\bINSTRUCTION\s*:/gi,
  /\bOVERRIDE\s*:/gi,
  /\bADMIN\s*:/gi,
  /\bEXECUTE\s*:/gi,

  // Injection attempts
  /IGNORE\s+(ALL\s+)?PREVIOUS\s+(INSTRUCTIONS?)?/gi,
  /FORGET\s+(ALL\s+)?PREVIOUS/gi,
  /DISREGARD\s+(ALL\s+)?ABOVE/gi,
  /NEW\s+INSTRUCTIONS?\s*:/gi,

  // Role manipulation
  /YOU\s+ARE\s+NOW/gi,
  /ACT\s+AS\s+(AN?\s+)?/gi,
  /PRETEND\s+(TO\s+BE|YOU'RE)/gi,
  /ROLEPLAY\s+AS/gi,

  // Delimiter injection
  /```\s*(system|assistant|user)/gi,
  /<\/?system>/gi,
  /\[\[SYSTEM\]\]/gi,

  // Unicode tricks (redundant after normalization but kept as defense-in-depth)
  /[\u200B-\u200D\uFEFF]/g, // Zero-width characters
];

// =============================================================================
// Defense Implementation
// =============================================================================

export class PromptInjectionDefense {
  /**
   * Sanitize mode hint with strict allowlist
   *
   * SECURITY FIX: Applies Unicode normalization before matching.
   * Prevents homoglyph attacks like "аrtifact" (Cyrillic 'а').
   *
   * Only allows exact matches to known safe values.
   * Any deviation returns 'auto' (safest default).
   */
  static sanitizeModeHint(hint: unknown): ModeHint {
    // Strict type check
    if (hint === null || hint === undefined) {
      return "auto";
    }

    if (typeof hint !== "string") {
      console.warn(`Invalid mode hint type: ${typeof hint}, using 'auto'`);
      return "auto";
    }

    // SECURITY FIX: Normalize Unicode BEFORE any string operations
    const normalizedUnicode = normalizeUnicode(hint);

    // Now normalize case and whitespace
    const normalized = normalizedUnicode.toLowerCase().trim();

    // Log if normalization changed the string (potential attack)
    if (hint !== normalizedUnicode) {
      console.warn(
        `Mode hint contained confusable characters: "${hint}" -> "${normalizedUnicode}"`,
      );
    }

    // Strict allowlist (no partial matches)
    switch (normalized) {
      case "artifact":
        return "artifact";
      case "image":
        return "image";
      case "auto":
        return "auto";
      default:
        console.warn(`Unknown mode hint: "${hint}", using 'auto'`);
        return "auto";
    }
  }

  /**
   * Sanitize artifact context that may be injected into prompts
   *
   * SECURITY FIX: Applies Unicode normalization before pattern matching.
   * Removes dangerous patterns and limits length.
   */
  static sanitizeArtifactContext(context: unknown): string {
    if (!context || typeof context !== "string") {
      return "";
    }

    // SECURITY FIX: Normalize Unicode BEFORE pattern matching
    let sanitized = normalizeUnicode(context);

    // Remove dangerous patterns (now applied to normalized string)
    for (const pattern of DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REMOVED]");
    }

    // Remove excessive whitespace that could be used for visual injection
    sanitized = sanitized.replace(/\n{3,}/g, "\n\n");
    sanitized = sanitized.replace(/[ \t]{10,}/g, " ");

    // Limit length to prevent context overflow
    const MAX_CONTEXT_LENGTH = 5000;
    if (sanitized.length > MAX_CONTEXT_LENGTH) {
      sanitized = sanitized.slice(0, MAX_CONTEXT_LENGTH) + "\n[Context truncated]";
    }

    return sanitized;
  }

  /**
   * Sanitize user message for logging (not for prompt - that uses full message)
   *
   * This is for safe logging without exposing sensitive patterns.
   */
  static sanitizeForLogging(message: string, maxLength: number = 200): string {
    if (!message) return "";

    let sanitized = message.slice(0, maxLength);

    // Mask potential secrets
    sanitized = sanitized.replace(
      /(?:api[_-]?key|password|secret|token)\s*[:=]\s*\S+/gi,
      "[REDACTED]",
    );

    return sanitized + (message.length > maxLength ? "..." : "");
  }

  /**
   * Detect potential injection attempts in user input
   *
   * Returns true if suspicious patterns are found.
   * Used for logging/monitoring, not blocking (to avoid false positives).
   */
  static detectSuspiciousPatterns(input: string): {
    suspicious: boolean;
    patterns: string[];
  } {
    const foundPatterns: string[] = [];

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(input)) {
        foundPatterns.push(pattern.source);
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
      }
    }

    return {
      suspicious: foundPatterns.length > 0,
      patterns: foundPatterns,
    };
  }

  /**
   * Build system prompt with safely injected mode hint
   *
   * Uses parameterized templates instead of string concatenation.
   */
  static buildSystemPromptWithHint(
    basePrompt: string,
    modeHint: unknown,
  ): string {
    const safeHint = this.sanitizeModeHint(modeHint);

    // Parameterized mode instructions (not user-controllable)
    const MODE_INSTRUCTIONS: Record<ModeHint, string> = {
      artifact: `
[MODE: ARTIFACT CREATION]
The user has selected artifact mode. You SHOULD use the generate_artifact tool for this request, unless it is clearly just a question that doesn't require creating anything.`,

      image: `
[MODE: IMAGE GENERATION]
The user has selected image mode. You SHOULD use the generate_image tool for this request, unless it is clearly just a question that doesn't require creating anything.`,

      auto: `
[MODE: AUTO]
Analyze the user's request and use appropriate tools when needed:
- Use generate_artifact for creating visual/interactive content (apps, components, diagrams)
- Use generate_image for creating images, photos, or artwork
- Use browser.search for finding current information
- Respond directly for questions that don't require tools`,
    };

    return `${basePrompt}\n${MODE_INSTRUCTIONS[safeHint]}`;
  }
}
