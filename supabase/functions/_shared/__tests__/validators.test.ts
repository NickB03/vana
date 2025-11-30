// deno-lint-ignore-file no-explicit-any
/**
 * Unit tests for validators.ts
 *
 * Tests all validator classes for:
 * - Correct validation logic
 * - Descriptive error messages
 * - TypeScript type assertions
 * - Edge case handling
 * - Boundary value testing
 */

import { assertEquals, assertThrows, assert, assertExists } from "@std/assert";
import {
  MessageArrayValidator,
  MessageValidator,
  MessagesValidator,
  ImageRequestValidator,
  ChatRequestValidator,
  RequestValidator,
  ValidationError,
  type Message,
  type ImageRequest,
  type ChatRequest
} from "../validators.ts";
import { VALIDATION_LIMITS, MESSAGE_ROLES } from "../config.ts";
import {
  createValidMessage,
  createValidChatRequest,
  createValidImageRequest,
  generateString,
  createValidDataUrl,
  assertThrowsWithMessage
} from "./test-utils.ts";

// ==================== MessageArrayValidator Tests ====================

Deno.test("MessageArrayValidator should reject null messages", () => {
  const validator: MessageArrayValidator = new MessageArrayValidator();

  assertThrows(
    () => validator.validate(null),
    ValidationError,
    "Invalid messages format"
  );
});

Deno.test("MessageArrayValidator should reject undefined messages", () => {
  const validator: MessageArrayValidator = new MessageArrayValidator();

  assertThrows(
    () => validator.validate(undefined),
    ValidationError,
    "Invalid messages format"
  );
});

Deno.test("MessageArrayValidator should reject non-array messages", () => {
  const validator: MessageArrayValidator = new MessageArrayValidator();

  assertThrows(
    () => validator.validate({ not: "an array" }),
    ValidationError,
    "Messages must be an array"
  );
});

Deno.test("MessageArrayValidator should reject empty array", () => {
  const validator: MessageArrayValidator = new MessageArrayValidator();

  assertThrows(
    () => validator.validate([]),
    ValidationError,
    "Empty messages array"
  );
});

Deno.test("MessageArrayValidator should reject arrays exceeding MAX_MESSAGES", () => {
  const validator: MessageArrayValidator = new MessageArrayValidator();
  const tooManyMessages = Array(VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION + 1).fill({
    role: "user",
    content: "test"
  });

  assertThrows(
    () => validator.validate(tooManyMessages),
    ValidationError,
    "Too many messages"
  );
});

Deno.test("MessageArrayValidator should accept valid message array", () => {
  const validator: MessageArrayValidator = new MessageArrayValidator();
  const validMessages = [{ role: "user", content: "Hello" }];

  // Should not throw
  validator.validate(validMessages);
});

Deno.test("MessageArrayValidator should accept array at max boundary", () => {
  const validator: MessageArrayValidator = new MessageArrayValidator();
  const maxMessages = Array(VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION).fill({
    role: "user",
    content: "test"
  });

  // Should not throw
  validator.validate(maxMessages);
});

// ==================== MessageValidator Tests ====================

Deno.test("MessageValidator should reject non-object message", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate("not an object"),
    ValidationError,
    "Invalid message"
  );
});

Deno.test("MessageValidator should reject null message", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate(null),
    ValidationError,
    "Invalid message"
  );
});

Deno.test("MessageValidator should reject message without role", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ content: "Hello" }),
    ValidationError,
    "Invalid message role"
  );
});

Deno.test("MessageValidator should reject message with non-string role", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: 123, content: "Hello" }),
    ValidationError,
    "role' field of type string"
  );
});

Deno.test("MessageValidator should reject unknown role", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: "unknown", content: "Hello" }),
    ValidationError,
    "Invalid message role"
  );
});

Deno.test("MessageValidator should include index in error message", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: "unknown", content: "Hello" }, 5),
    ValidationError,
    "at index 5"
  );
});

Deno.test("MessageValidator should reject message without content", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: "user" }),
    ValidationError,
    "Invalid message content"
  );
});

Deno.test("MessageValidator should reject message with non-string content", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: "user", content: 123 }),
    ValidationError,
    "content' field of type string"
  );
});

Deno.test("MessageValidator should reject empty content", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: "user", content: "" }),
    ValidationError,
    "Empty message content"
  );
});

Deno.test("MessageValidator should reject whitespace-only content", () => {
  const validator: MessageValidator = new MessageValidator();

  assertThrows(
    () => validator.validate({ role: "user", content: "   \n\t  " }),
    ValidationError,
    "whitespace-only"
  );
});

Deno.test("MessageValidator should reject content exceeding MAX_LENGTH", () => {
  const validator: MessageValidator = new MessageValidator();
  const tooLongContent = generateString(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH + 1);

  assertThrows(
    () => validator.validate({ role: "user", content: tooLongContent }),
    ValidationError,
    "Message content too long"
  );
});

Deno.test("MessageValidator should accept valid user message", () => {
  const validator: MessageValidator = new MessageValidator();
  const message = createValidMessage({ role: "user" });

  // Should not throw
  validator.validate(message);
});

Deno.test("MessageValidator should accept valid assistant message", () => {
  const validator: MessageValidator = new MessageValidator();
  const message = createValidMessage({ role: "assistant" });

  // Should not throw
  validator.validate(message);
});

Deno.test("MessageValidator should accept valid system message", () => {
  const validator: MessageValidator = new MessageValidator();
  const message = createValidMessage({ role: "system" });

  // Should not throw
  validator.validate(message);
});

Deno.test("MessageValidator should accept content at max boundary", () => {
  const validator: MessageValidator = new MessageValidator();
  const maxContent = generateString(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH);

  // Should not throw
  validator.validate({ role: "user", content: maxContent });
});

Deno.test("MessageValidator should accept content with unicode characters", () => {
  const validator: MessageValidator = new MessageValidator();
  const unicodeContent = "Hello 世界 🌍 مرحبا";

  // Should not throw
  validator.validate({ role: "user", content: unicodeContent });
});

// ==================== MessagesValidator Tests ====================

Deno.test("MessagesValidator should validate array structure first", () => {
  const validator: MessagesValidator = new MessagesValidator();

  assertThrows(
    () => validator.validate([]),
    ValidationError,
    "Empty messages array"
  );
});

Deno.test("MessagesValidator should validate each message", () => {
  const validator: MessagesValidator = new MessagesValidator();
  const messages = [
    { role: "user", content: "Hello" },
    { role: "invalid", content: "World" }
  ];

  assertThrows(
    () => validator.validate(messages),
    ValidationError,
    "Invalid message role at index 1"
  );
});

Deno.test("MessagesValidator should report first failing message", () => {
  const validator: MessagesValidator = new MessagesValidator();
  const messages = [
    { role: "user", content: "Hello" },
    { role: "user", content: "" },
    { role: "user", content: "World" }
  ];

  assertThrows(
    () => validator.validate(messages),
    ValidationError,
    "at index 1"
  );
});

Deno.test("MessagesValidator should accept valid message array", () => {
  const validator: MessagesValidator = new MessagesValidator();
  const messages = [
    createValidMessage({ role: "user" }),
    createValidMessage({ role: "assistant" }),
    createValidMessage({ role: "system" })
  ];

  // Should not throw
  validator.validate(messages);
});

Deno.test("MessagesValidator should perform type assertion", () => {
  const validator: MessagesValidator = new MessagesValidator();
  const messages: any = [createValidMessage()];

  validator.validate(messages);

  // TypeScript should now treat messages as Message[]
  const typedMessages: Message[] = messages;
  assertEquals(typedMessages[0].role, "user");
});

// ==================== ImageRequestValidator Tests ====================

Deno.test("ImageRequestValidator should reject non-object request", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate("not an object"),
    ValidationError,
    "Invalid request format"
  );
});

Deno.test("ImageRequestValidator should reject missing prompt", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ mode: "generate" }),
    ValidationError,
    "Invalid prompt"
  );
});

Deno.test("ImageRequestValidator should reject non-string prompt", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: 123, mode: "generate" }),
    ValidationError,
    "Prompt is required and must be a string"
  );
});

Deno.test("ImageRequestValidator should reject empty prompt", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "", mode: "generate" }),
    ValidationError,
    "Empty prompt"
  );
});

Deno.test("ImageRequestValidator should reject whitespace-only prompt", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "   ", mode: "generate" }),
    ValidationError,
    "whitespace-only"
  );
});

Deno.test("ImageRequestValidator should reject prompt exceeding MAX_PROMPT_LENGTH", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();
  const tooLongPrompt = generateString(VALIDATION_LIMITS.MAX_PROMPT_LENGTH + 1);

  assertThrows(
    () => validator.validate({ prompt: tooLongPrompt, mode: "generate" }),
    ValidationError,
    "Prompt too long"
  );
});

Deno.test("ImageRequestValidator should reject missing mode", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "A beautiful sunset" }),
    ValidationError,
    "Invalid mode"
  );
});

Deno.test("ImageRequestValidator should reject non-string mode", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "Test", mode: 123 }),
    ValidationError,
    "Mode is required and must be a string"
  );
});

Deno.test("ImageRequestValidator should reject invalid mode value", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "Test", mode: "invalid" }),
    ValidationError,
    "Mode must be 'generate' or 'edit'"
  );
});

Deno.test("ImageRequestValidator should reject edit mode without baseImage", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "Test", mode: "edit" }),
    ValidationError,
    "Missing base image"
  );
});

Deno.test("ImageRequestValidator should reject non-string baseImage", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "Test", mode: "edit", baseImage: 123 }),
    ValidationError,
    "Edit mode requires a base image"
  );
});

Deno.test("ImageRequestValidator should reject invalid baseImage format", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();

  assertThrows(
    () => validator.validate({ prompt: "Test", mode: "edit", baseImage: "not-a-data-url" }),
    ValidationError,
    "Invalid base image format"
  );
});

Deno.test("ImageRequestValidator should accept valid generate request", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();
  const request = createValidImageRequest({ mode: "generate" });

  // Should not throw
  validator.validate(request);
});

Deno.test("ImageRequestValidator should accept valid edit request", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();
  const request = createValidImageRequest({
    mode: "edit",
    baseImage: createValidDataUrl()
  });

  // Should not throw
  validator.validate(request);
});

Deno.test("ImageRequestValidator should accept prompt at max boundary", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();
  const maxPrompt = generateString(VALIDATION_LIMITS.MAX_PROMPT_LENGTH);

  // Should not throw
  validator.validate({ prompt: maxPrompt, mode: "generate" });
});

Deno.test("ImageRequestValidator should accept various data URL formats", () => {
  const validator: ImageRequestValidator = new ImageRequestValidator();
  const formats = ["image/png", "image/jpeg", "image/gif", "image/webp"];

  formats.forEach(format => {
    const request = createValidImageRequest({
      mode: "edit",
      baseImage: createValidDataUrl(format)
    });

    // Should not throw
    validator.validate(request);
  });
});

// ==================== ChatRequestValidator Tests ====================

Deno.test("ChatRequestValidator should reject non-object request", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate("not an object"),
    ValidationError,
    "Invalid request format"
  );
});

Deno.test("ChatRequestValidator should reject missing messages", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({}),
    ValidationError,
    "Missing messages"
  );
});

Deno.test("ChatRequestValidator should validate messages array", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({ messages: [] }),
    ValidationError,
    "Empty messages array"
  );
});

Deno.test("ChatRequestValidator should reject invalid sessionId type", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({
      messages: [createValidMessage()],
      sessionId: 123
    }),
    ValidationError,
    "Invalid sessionId"
  );
});

Deno.test("ChatRequestValidator should reject invalid isGuest type", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({
      messages: [createValidMessage()],
      isGuest: "yes"
    }),
    ValidationError,
    "Invalid isGuest"
  );
});

Deno.test("ChatRequestValidator should reject non-object currentArtifact", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({
      messages: [createValidMessage()],
      currentArtifact: "not an object"
    }),
    ValidationError,
    "Invalid currentArtifact"
  );
});

Deno.test("ChatRequestValidator should reject artifact without title", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({
      messages: [createValidMessage()],
      currentArtifact: { type: "html", content: "<div></div>" }
    }),
    ValidationError,
    "Invalid artifact title"
  );
});

Deno.test("ChatRequestValidator should reject artifact with non-string title", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({
      messages: [createValidMessage()],
      currentArtifact: { title: 123, type: "html", content: "<div></div>" }
    }),
    ValidationError,
    "string 'title' field"
  );
});

Deno.test("ChatRequestValidator should reject artifact without type", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({
      messages: [createValidMessage()],
      currentArtifact: { title: "Test", content: "<div></div>" }
    }),
    ValidationError,
    "Invalid artifact type"
  );
});

Deno.test("ChatRequestValidator should reject artifact without content", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();

  assertThrows(
    () => validator.validate({
      messages: [createValidMessage()],
      currentArtifact: { title: "Test", type: "html" }
    }),
    ValidationError,
    "Invalid artifact content"
  );
});

Deno.test("ChatRequestValidator should accept valid chat request with all fields", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();
  const request = createValidChatRequest({
    sessionId: "test-session",
    isGuest: false,
    currentArtifact: {
      title: "Test Artifact",
      type: "html",
      content: "<div>Hello</div>"
    }
  });

  // Should not throw
  validator.validate(request);
});

Deno.test("ChatRequestValidator should accept request without optional fields", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();
  const request = { messages: [createValidMessage()] };

  // Should not throw
  validator.validate(request);
});

Deno.test("ChatRequestValidator should accept request with only sessionId", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();
  const request = {
    messages: [createValidMessage()],
    sessionId: "test-session"
  };

  // Should not throw
  validator.validate(request);
});

Deno.test("ChatRequestValidator should perform type assertion", () => {
  const validator: ChatRequestValidator = new ChatRequestValidator();
  const request: any = createValidChatRequest();

  validator.validate(request);

  // TypeScript should now treat request as ChatRequest
  const typedRequest: ChatRequest = request;
  assert(typedRequest.messages.length > 0);
});

// ==================== RequestValidator Factory Tests ====================

Deno.test("RequestValidator.forChat should return ChatRequestValidator", () => {
  const validator = RequestValidator.forChat();

  assert(validator instanceof ChatRequestValidator);
});

Deno.test("RequestValidator.forImage should return ImageRequestValidator", () => {
  const validator = RequestValidator.forImage();

  assert(validator instanceof ImageRequestValidator);
});

Deno.test("RequestValidator.forMessages should return MessagesValidator", () => {
  const validator = RequestValidator.forMessages();

  assert(validator instanceof MessagesValidator);
});

Deno.test("RequestValidator.validateChat should validate and return typed data", () => {
  const request = createValidChatRequest();

  const validatedRequest = RequestValidator.validateChat(request);

  assertEquals(validatedRequest.messages.length, 1);
  assertEquals(validatedRequest.sessionId, "test-session-id");
});

Deno.test("RequestValidator.validateChat should throw on invalid data", () => {
  assertThrows(
    () => RequestValidator.validateChat({ messages: [] }),
    ValidationError
  );
});

Deno.test("RequestValidator.validateImage should validate and return typed data", () => {
  const request = createValidImageRequest();

  const validatedRequest = RequestValidator.validateImage(request);

  assertEquals(validatedRequest.prompt, "A beautiful sunset");
  assertEquals(validatedRequest.mode, "generate");
});

Deno.test("RequestValidator.validateImage should throw on invalid data", () => {
  assertThrows(
    () => RequestValidator.validateImage({ prompt: "", mode: "generate" }),
    ValidationError
  );
});

// ==================== Edge Cases and Boundary Tests ====================

Deno.test("Validators should handle exact boundary values (MAX - 1)", () => {
  const messageValidator: MessageValidator = new MessageValidator();
  const contentAtBoundary = generateString(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH - 1);

  // Should not throw
  messageValidator.validate({ role: "user", content: contentAtBoundary });
});

Deno.test("Validators should handle exact boundary values (MAX)", () => {
  const messageValidator: MessageValidator = new MessageValidator();
  const contentAtMax = generateString(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH);

  // Should not throw
  messageValidator.validate({ role: "user", content: contentAtMax });
});

Deno.test("Validators should reject values one over boundary (MAX + 1)", () => {
  const messageValidator: MessageValidator = new MessageValidator();
  const contentOverMax = generateString(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH + 1);

  assertThrows(
    () => messageValidator.validate({ role: "user", content: contentOverMax }),
    ValidationError,
    "too long"
  );
});

Deno.test("Validators should handle special characters in prompts", () => {
  const imageValidator: ImageRequestValidator = new ImageRequestValidator();
  const specialPrompt = "Test with 'quotes', \"double\", <html>, & ampersand, emoji 🎨";

  // Should not throw
  imageValidator.validate({ prompt: specialPrompt, mode: "generate" });
});

Deno.test("Validators should handle newlines in content", () => {
  const messageValidator: MessageValidator = new MessageValidator();
  const multilineContent = "Line 1\nLine 2\nLine 3";

  // Should not throw
  messageValidator.validate({ role: "user", content: multilineContent });
});

Deno.test("Validators should reject content with only newlines", () => {
  const messageValidator: MessageValidator = new MessageValidator();

  assertThrows(
    () => messageValidator.validate({ role: "user", content: "\n\n\n" }),
    ValidationError,
    "whitespace-only"
  );
});

Deno.test("ValidationError should include detailed error messages", () => {
  const validator: MessageValidator = new MessageValidator();

  try {
    validator.validate({ role: "user", content: "" }, 3);
  } catch (e) {
    const error = e as ValidationError;
    assert(error instanceof ValidationError);
    assert(error.message.includes("at index 3"));
    assertExists(error.details);
  }
});
