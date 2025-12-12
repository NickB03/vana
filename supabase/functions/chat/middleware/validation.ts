/**
 * Input validation middleware
 * Validates request body and message format
 */

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
    forceImageMode?: boolean;
    forceArtifactMode?: boolean;
    includeReasoning: boolean;
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
      forceImageMode,
      forceArtifactMode,
      includeReasoning = false,
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
        console.error(
          `[${requestId}] Message content too long:`,
          typeof msg.content,
          msg.content?.length
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

    return {
      ok: true,
      data: {
        messages,
        sessionId,
        currentArtifact,
        isGuest: isGuest || false,
        forceImageMode,
        forceArtifactMode,
        includeReasoning,
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
