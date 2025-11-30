// deno-lint-ignore-file no-explicit-any
/**
 * Request Validation Module
 *
 * Extracts all validation logic from edge functions into reusable validators.
 * Follows the Open/Closed Principle - easy to add new validators without modifying existing code.
 *
 * @module validators
 */

import { VALIDATION_LIMITS, MESSAGE_ROLES } from "./config.ts";
import { ValidationError } from "./error-handler.ts";

// Re-export ValidationError for convenience
export { ValidationError };

/**
 * Sanitize user input to prevent XSS attacks
 *
 * Encodes HTML entities to prevent script injection while preserving user content.
 * This is a defense-in-depth measure - the frontend should also escape when displaying.
 *
 * @param content - Raw user input
 * @returns Sanitized content with HTML entities encoded
 *
 * @example
 * sanitizeContent("<script>alert('XSS')</script>")
 * // Returns: "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;"
 *
 * @security CWE-79: Cross-Site Scripting Prevention
 */
function sanitizeContent(content: string): string {
  if (!content || typeof content !== "string") {
    return content;
  }

  return content
    .replace(/&/g, "&amp;")    // Must be first to avoid double-encoding
    .replace(/</g, "&lt;")     // Prevent opening tags
    .replace(/>/g, "&gt;")     // Prevent closing tags
    .replace(/"/g, "&quot;")   // Prevent attribute injection
    .replace(/'/g, "&#x27;")   // Prevent single-quote attribute injection
    .replace(/\//g, "&#x2F;"); // Prevent closing tag injection
}

/**
 * Message structure
 */
export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Image generation request
 */
export interface ImageRequest {
  prompt: string;
  mode: "generate" | "edit";
  baseImage?: string;
  sessionId?: string;
}

/**
 * Chat request structure
 */
export interface ChatRequest {
  messages: Message[];
  sessionId?: string;
  currentArtifact?: {
    title: string;
    type: string;
    content: string;
  };
  isGuest?: boolean;
}

/**
 * Base validator interface following Open/Closed Principle
 */
export interface Validator<T> {
  validate(data: T): void;
}

/**
 * Validates message array format
 */
export class MessageArrayValidator implements Validator<any> {
  validate(messages: any): asserts messages is Message[] {
    if (!messages || !Array.isArray(messages)) {
      throw new ValidationError(
        "Invalid messages format",
        "Messages must be an array"
      );
    }

    if (messages.length === 0) {
      throw new ValidationError(
        "Empty messages array",
        "At least one message is required"
      );
    }

    if (messages.length > VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION) {
      throw new ValidationError(
        "Too many messages in conversation",
        `Maximum ${VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION} messages allowed, received ${messages.length}`
      );
    }
  }
}

/**
 * Validates individual message structure
 */
export class MessageValidator implements Validator<any> {
  validate(msg: any, index?: number): asserts msg is Message {
    const position = index !== undefined ? ` at index ${index}` : "";

    if (!msg || typeof msg !== "object") {
      throw new ValidationError(
        `Invalid message${position}`,
        "Message must be an object"
      );
    }

    if (!msg.role || typeof msg.role !== "string") {
      throw new ValidationError(
        `Invalid message role${position}`,
        "Message must have a 'role' field of type string"
      );
    }

    if (!MESSAGE_ROLES.includes(msg.role)) {
      throw new ValidationError(
        `Invalid message role${position}: ${msg.role}`,
        `Role must be one of: ${MESSAGE_ROLES.join(", ")}`
      );
    }

    if (!msg.content || typeof msg.content !== "string") {
      throw new ValidationError(
        `Invalid message content${position}`,
        "Message must have a 'content' field of type string"
      );
    }

    // ✅ SECURITY FIX: Sanitize content BEFORE further validation
    // This prevents XSS attacks by encoding HTML entities in user input
    msg.content = sanitizeContent(msg.content);

    if (msg.content.trim().length === 0) {
      throw new ValidationError(
        `Empty message content${position}`,
        "Message content cannot be empty or whitespace-only"
      );
    }

    if (msg.content.length > VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH) {
      throw new ValidationError(
        `Message content too long${position}`,
        `Maximum ${VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH} characters allowed, received ${msg.content.length}`
      );
    }
  }
}

/**
 * Composite validator for complete message array validation
 */
export class MessagesValidator implements Validator<any> {
  private arrayValidator: MessageArrayValidator = new MessageArrayValidator();
  private messageValidator: MessageValidator = new MessageValidator();

  validate(messages: any): asserts messages is Message[] {
    // First validate the array structure
    this.arrayValidator.validate(messages);

    // Then validate each message
    messages.forEach((msg: any, index: number) => {
      this.messageValidator.validate(msg, index);
    });
  }
}

/**
 * Validates image generation request
 */
export class ImageRequestValidator implements Validator<any> {
  validate(data: any): asserts data is ImageRequest {
    if (!data || typeof data !== "object") {
      throw new ValidationError(
        "Invalid request format",
        "Request body must be an object"
      );
    }

    const { prompt, mode, baseImage } = data;

    // Validate prompt
    if (!prompt || typeof prompt !== "string") {
      throw new ValidationError(
        "Invalid prompt",
        "Prompt is required and must be a string"
      );
    }

    // ✅ SECURITY FIX: Sanitize prompt to prevent XSS attacks
    // Image generation prompts can also be vectors for script injection
    data.prompt = sanitizeContent(prompt);

    if (data.prompt.trim().length === 0) {
      throw new ValidationError(
        "Empty prompt",
        "Prompt cannot be empty or whitespace-only"
      );
    }

    if (data.prompt.length > VALIDATION_LIMITS.MAX_PROMPT_LENGTH) {
      throw new ValidationError(
        "Prompt too long",
        `Maximum ${VALIDATION_LIMITS.MAX_PROMPT_LENGTH} characters allowed, received ${data.prompt.length}`
      );
    }

    // Validate mode
    if (!mode || typeof mode !== "string") {
      throw new ValidationError(
        "Invalid mode",
        "Mode is required and must be a string"
      );
    }

    if (!["generate", "edit"].includes(mode)) {
      throw new ValidationError(
        "Invalid mode value",
        "Mode must be 'generate' or 'edit'"
      );
    }

    // Validate baseImage for edit mode
    if (mode === "edit") {
      if (!baseImage || typeof baseImage !== "string") {
        throw new ValidationError(
          "Missing base image",
          "Edit mode requires a base image"
        );
      }

      if (!baseImage.startsWith("data:image/")) {
        throw new ValidationError(
          "Invalid base image format",
          "Base image must be a valid data URL starting with 'data:image/'"
        );
      }
    }
  }
}

/**
 * Validates chat request structure
 */
export class ChatRequestValidator implements Validator<any> {
  private messagesValidator: MessagesValidator = new MessagesValidator();

  validate(data: any): asserts data is ChatRequest {
    if (!data || typeof data !== "object") {
      throw new ValidationError(
        "Invalid request format",
        "Request body must be an object"
      );
    }

    // Validate messages
    if (!data.messages) {
      throw new ValidationError(
        "Missing messages",
        "Request must include a 'messages' field"
      );
    }

    this.messagesValidator.validate(data.messages);

    // Validate optional fields
    if (data.sessionId !== undefined && typeof data.sessionId !== "string") {
      throw new ValidationError(
        "Invalid sessionId",
        "sessionId must be a string if provided"
      );
    }

    if (data.isGuest !== undefined && typeof data.isGuest !== "boolean") {
      throw new ValidationError(
        "Invalid isGuest",
        "isGuest must be a boolean if provided"
      );
    }

    if (data.currentArtifact !== undefined) {
      if (typeof data.currentArtifact !== "object") {
        throw new ValidationError(
          "Invalid currentArtifact",
          "currentArtifact must be an object if provided"
        );
      }

      const artifact = data.currentArtifact;
      if (!artifact.title || typeof artifact.title !== "string") {
        throw new ValidationError(
          "Invalid artifact title",
          "currentArtifact must have a string 'title' field"
        );
      }

      if (!artifact.type || typeof artifact.type !== "string") {
        throw new ValidationError(
          "Invalid artifact type",
          "currentArtifact must have a string 'type' field"
        );
      }

      if (!artifact.content || typeof artifact.content !== "string") {
        throw new ValidationError(
          "Invalid artifact content",
          "currentArtifact must have a string 'content' field"
        );
      }
    }
  }
}

/**
 * Main request validator factory
 *
 * Usage:
 * ```ts
 * const validator = RequestValidator.forChat();
 * try {
 *   validator.validate(requestBody);
 *   // requestBody is now typed as ChatRequest
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     return errors.validation(error.message, error.details);
 *   }
 * }
 * ```
 */
export class RequestValidator {
  /**
   * Create validator for chat requests
   */
  static forChat(): ChatRequestValidator {
    return new ChatRequestValidator();
  }

  /**
   * Create validator for image generation requests
   */
  static forImage(): ImageRequestValidator {
    return new ImageRequestValidator();
  }

  /**
   * Create validator for message arrays
   */
  static forMessages(): MessagesValidator {
    return new MessagesValidator();
  }

  /**
   * Validate and return typed data (convenience method)
   */
  static validateChat(data: any): ChatRequest {
    const validator: ChatRequestValidator = RequestValidator.forChat();
    validator.validate(data);
    return data;
  }

  /**
   * Validate and return typed image request (convenience method)
   */
  static validateImage(data: any): ImageRequest {
    const validator: ImageRequestValidator = RequestValidator.forImage();
    validator.validate(data);
    return data;
  }
}
