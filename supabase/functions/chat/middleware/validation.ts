/**
 * Input validation middleware
 * Validates request body and message format
 *
 * VALIDATION STAGES:
 * 1. Initial validation (validateInput): Per-message content length (100k chars)
 * 2. Cumulative validation (validateCumulativeContextSize): Total context after assembly
 *
 * The cumulative validation catches cases where individually valid messages
 * plus artifact/search/URL context exceed safe limits.
 */

import { VALIDATION_LIMITS } from '../../_shared/config.ts';

export interface ValidationError {
  error: string;
  requestId: string;
  debug?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  data?: {
    messages: Array<{ role: string; content: string }>;
    sessionId?: string;
    currentArtifact?: {
      title: string;
      type: string;
      content: string;
    };
    isGuest: boolean;
    toolChoice: "auto" | "generate_artifact" | "generate_image";
    includeReasoning: boolean;
    /** Pre-generated UUID for the assistant message (enables artifact DB linking) */
    assistantMessageId?: string;
  };
  error?: ValidationError;
}

/**
 * Validates the request body structure and message format
 */
export async function validateInput(
  req: Request,
  requestId: string
): Promise<ValidationResult> {
  try {
    const requestBody = await req.json();
    const {
      messages,
      sessionId,
      currentArtifact,
      isGuest,
      toolChoice = "auto",
      includeReasoning = false,
      assistantMessageId,
    } = requestBody;

    // Input validation
    if (!messages || !Array.isArray(messages)) {
      console.error(`[${requestId}] Invalid messages format`);
      return {
        ok: false,
        error: {
          error: "Invalid messages format",
          requestId,
        },
      };
    }

    if (messages.length > 100) {
      console.error(
        `[${requestId}] Too many messages in conversation:`,
        messages.length
      );
      return {
        ok: false,
        error: {
          error: "Too many messages in conversation",
          requestId,
        },
      };
    }

    // Validate each message
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        console.error(`[${requestId}] Invalid message format:`, msg);
        return {
          ok: false,
          error: {
            error: "Invalid message format",
            requestId,
          },
        };
      }

      if (!["user", "assistant", "system"].includes(msg.role)) {
        console.error(`[${requestId}] Invalid message role:`, msg.role);
        return {
          ok: false,
          error: {
            error: "Invalid message role",
            requestId,
          },
        };
      }

      if (typeof msg.content !== "string" || msg.content.length > 100000) {
        // Enhanced logging to help debug oversized messages
        const contentPreview = msg.content?.substring(0, 200) || '';
        const hasImageArtifact = contentPreview.includes('<artifact type="image"');
        const hasBase64Data = contentPreview.includes('data:image/');

        console.error(
          `[${requestId}] Message content too long:`,
          {
            type: typeof msg.content,
            length: msg.content?.length,
            role: msg.role,
            hasImageArtifact,
            hasBase64Data,
            preview: contentPreview
          }
        );
        return {
          ok: false,
          error: {
            error: "Message content too long",
            details: `Maximum 100,000 characters allowed, received ${msg.content?.length || 0}`,
            requestId,
          },
        };
      }

      if (msg.content.trim().length === 0) {
        console.error(`[${requestId}] Empty message content`);
        return {
          ok: false,
          error: {
            error: "Message content cannot be empty",
            requestId,
          },
        };
      }
    }

    const allowedToolChoices = ["auto", "generate_artifact", "generate_image"];
    if (
      typeof toolChoice !== "string" ||
      !allowedToolChoices.includes(toolChoice)
    ) {
      console.error(`[${requestId}] Invalid toolChoice:`, toolChoice);
      return {
        ok: false,
        error: {
          error: "Invalid toolChoice value",
          requestId,
        },
      };
    }

    // Validate assistantMessageId if provided (must be valid UUID)
    if (assistantMessageId !== undefined) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof assistantMessageId !== "string" || !uuidRegex.test(assistantMessageId)) {
        console.error(`[${requestId}] Invalid assistantMessageId:`, assistantMessageId);
        return {
          ok: false,
          error: {
            error: "Invalid assistantMessageId format (must be UUID)",
            requestId,
          },
        };
      }
    }

    return {
      ok: true,
      data: {
        messages,
        sessionId,
        currentArtifact,
        isGuest: isGuest || false,
        toolChoice,
        includeReasoning,
        assistantMessageId,
      },
    };
  } catch (e) {
    console.error(`[${requestId}] Failed to parse request body:`, e);
    return {
      ok: false,
      error: {
        error: "Invalid JSON in request body",
        requestId,
      },
    };
  }
}

/**
 * Context size breakdown for debugging and user feedback
 */
export interface ContextSizeBreakdown {
  /** Total character count of all messages */
  messagesChars: number;
  /** Character count of artifact editing context */
  artifactContextChars: number;
  /** Character count of search results context */
  searchContextChars: number;
  /** Character count of URL extraction context */
  urlExtractContextChars: number;
  /** Total cumulative character count */
  totalChars: number;
  /** Maximum allowed cumulative characters */
  maxAllowedChars: number;
  /** Whether the context exceeds the limit */
  exceedsLimit: boolean;
  /** Percentage of limit used (0-100+) */
  percentUsed: number;
}

/**
 * Result of cumulative context validation
 */
export interface CumulativeValidationResult {
  ok: boolean;
  breakdown: ContextSizeBreakdown;
  error?: {
    error: string;
    userMessage: string;
    requestId: string;
    breakdown: ContextSizeBreakdown;
  };
}

/**
 * Result of content truncation operations
 */
export interface TruncationResult {
  /** The (potentially truncated) content */
  content: string;
  /** Whether truncation was applied */
  wasTruncated: boolean;
  /** Original content length (only set if truncated) */
  originalLength?: number;
  /** Truncated content length (only set if truncated) */
  truncatedLength?: number;
}

/**
 * Validates cumulative context size after all context is assembled.
 *
 * This is called AFTER initial validation and context assembly to ensure
 * the total request stays within Gemini's context window limits.
 *
 * @param params - Context components to validate
 * @param requestId - Request ID for logging
 * @returns Validation result with breakdown
 *
 * @example
 * ```typescript
 * const validation = validateCumulativeContextSize({
 *   messages: contextMessages,
 *   artifactContext: fullArtifactContext,
 *   searchContext: '',
 *   urlExtractContext: urlExtractResult.extractedContext || '',
 * }, requestId);
 *
 * if (!validation.ok) {
 *   // Return error response with user-friendly message
 *   return new Response(JSON.stringify(validation.error), { status: 400 });
 * }
 * ```
 */
export function validateCumulativeContextSize(
  params: {
    messages: Array<{ role: string; content: string }>;
    artifactContext: string;
    searchContext: string;
    urlExtractContext: string;
  },
  requestId: string
): CumulativeValidationResult {
  const { messages, artifactContext, searchContext, urlExtractContext } = params;

  // Calculate individual component sizes
  const messagesChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  const artifactContextChars = artifactContext?.length || 0;
  const searchContextChars = searchContext?.length || 0;
  const urlExtractContextChars = urlExtractContext?.length || 0;

  const totalChars = messagesChars + artifactContextChars + searchContextChars + urlExtractContextChars;
  const maxAllowedChars = VALIDATION_LIMITS.MAX_CUMULATIVE_CONTEXT_CHARS;
  const exceedsLimit = totalChars > maxAllowedChars;
  const percentUsed = Math.round((totalChars / maxAllowedChars) * 100);

  const breakdown: ContextSizeBreakdown = {
    messagesChars,
    artifactContextChars,
    searchContextChars,
    urlExtractContextChars,
    totalChars,
    maxAllowedChars,
    exceedsLimit,
    percentUsed,
  };

  // Log context breakdown for observability
  console.log(
    `[${requestId}] 📊 Cumulative context: ${totalChars.toLocaleString()} chars (${percentUsed}% of limit)`,
    {
      messages: messagesChars.toLocaleString(),
      artifact: artifactContextChars.toLocaleString(),
      search: searchContextChars.toLocaleString(),
      urlExtract: urlExtractContextChars.toLocaleString(),
    }
  );

  if (exceedsLimit) {
    // Log detailed breakdown for debugging
    console.error(
      `[${requestId}] ❌ Cumulative context size exceeded: ${totalChars.toLocaleString()} > ${maxAllowedChars.toLocaleString()} chars`,
      breakdown
    );

    // Identify the largest contributor for user feedback
    const contributors = [
      { name: 'conversation history', chars: messagesChars },
      { name: 'artifact being edited', chars: artifactContextChars },
      { name: 'search results', chars: searchContextChars },
      { name: 'extracted URL content', chars: urlExtractContextChars },
    ].filter(c => c.chars > 0).sort((a, b) => b.chars - a.chars);

    const largestContributor = contributors[0];
    const suggestion = largestContributor
      ? `The ${largestContributor.name} (${Math.round(largestContributor.chars / 1000)}K characters) is the largest contributor.`
      : '';

    const userMessage = `Your request is too large to process. The total context (${Math.round(totalChars / 1000)}K characters) exceeds our ${Math.round(maxAllowedChars / 1000)}K character limit. ${suggestion} Please try:
• Starting a new conversation for a fresh context
• Shortening your message or request
• Editing a smaller artifact`;

    return {
      ok: false,
      breakdown,
      error: {
        error: 'Cumulative context size exceeded',
        userMessage,
        requestId,
        breakdown,
      },
    };
  }

  // Warn if approaching limit (>80%)
  if (percentUsed > 80) {
    console.warn(
      `[${requestId}] ⚠️ Context size approaching limit: ${percentUsed}% used`,
      breakdown
    );
  }

  return {
    ok: true,
    breakdown,
  };
}

/**
 * Truncates artifact context to fit within limits while preserving structure.
 *
 * When artifact editing context is too large, this function truncates it
 * intelligently to fit within MAX_ARTIFACT_CONTEXT_CHARS while preserving
 * the header and footer structure.
 *
 * @param artifactContext - Full artifact editing context
 * @param requestId - Request ID for logging
 * @returns Truncation result with metadata
 */
export function truncateArtifactContext(
  artifactContext: string,
  requestId: string
): TruncationResult {
  const maxChars = VALIDATION_LIMITS.MAX_ARTIFACT_CONTEXT_CHARS;

  if (!artifactContext || artifactContext.length <= maxChars) {
    return {
      content: artifactContext,
      wasTruncated: false,
    };
  }

  const originalLength = artifactContext.length;

  console.warn(
    `[${requestId}] ⚠️ Truncating artifact context: ${originalLength.toLocaleString()} > ${maxChars.toLocaleString()} chars`
  );

  // Preserve header (first ~500 chars) and footer (last ~500 chars)
  const headerChars = 500;
  const footerChars = 500;
  const truncationMarker = '\n\n... [ARTIFACT CONTENT TRUNCATED FOR SIZE] ...\n\n';

  const header = artifactContext.slice(0, headerChars);
  const footer = artifactContext.slice(-footerChars);

  // Calculate how much of the middle we can keep
  const availableMiddle = maxChars - headerChars - footerChars - truncationMarker.length;

  let truncatedContent: string;
  if (availableMiddle > 0) {
    // Try to include some middle content
    const middleStart = headerChars;
    const middleContent = artifactContext.slice(middleStart, middleStart + availableMiddle);
    truncatedContent = header + middleContent + truncationMarker + footer;
  } else {
    // If no room for middle, just use header + truncation marker + footer
    truncatedContent = header + truncationMarker + footer;
  }

  return {
    content: truncatedContent,
    wasTruncated: true,
    originalLength,
    truncatedLength: truncatedContent.length,
  };
}

/**
 * Truncates URL extract context to fit within limits.
 *
 * @param urlExtractContext - Full URL extraction context
 * @param requestId - Request ID for logging
 * @returns Truncation result with metadata
 */
export function truncateUrlExtractContext(
  urlExtractContext: string,
  requestId: string
): TruncationResult {
  const maxChars = VALIDATION_LIMITS.MAX_URL_EXTRACT_CONTEXT_CHARS;

  if (!urlExtractContext || urlExtractContext.length <= maxChars) {
    return {
      content: urlExtractContext,
      wasTruncated: false,
    };
  }

  const originalLength = urlExtractContext.length;

  console.warn(
    `[${requestId}] ⚠️ Truncating URL extract context: ${originalLength.toLocaleString()} > ${maxChars.toLocaleString()} chars`
  );

  // Find a clean break point (end of a paragraph or sentence)
  const truncationPoint = urlExtractContext.lastIndexOf('\n\n', maxChars - 100);
  const breakPoint = truncationPoint > maxChars * 0.5 ? truncationPoint : maxChars - 100;

  const truncatedContent = urlExtractContext.slice(0, breakPoint) + '\n\n... [URL CONTENT TRUNCATED FOR SIZE] ...';

  return {
    content: truncatedContent,
    wasTruncated: true,
    originalLength,
    truncatedLength: truncatedContent.length,
  };
}
