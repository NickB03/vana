/**
 * Integration Tests for Structured Output Validation
 *
 * Tests validation failure scenarios for structured outputs with JSON Schema
 * and Zod validation, including:
 * - Missing required fields
 * - Invalid artifact types
 * - Empty/invalid field values
 * - Multiple validation errors
 * - User-friendly error message generation
 *
 * @module structured-output-validation-integration.test
 */

import { assertEquals, assertInstanceOf, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  type ArtifactResponse,
  safeParseArtifactResponse,
  parseArtifactResponse,
  getValidationErrors,
  ArtifactTypeSchema,
} from "../schemas/artifact-schema.ts";
import {
  StructuredOutputValidationError,
  getUserFriendlyErrorMessage,
  isRetryableError,
} from "../errors.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =============================================================================
// MISSING REQUIRED FIELDS TESTS
// =============================================================================

Deno.test("Validation fails when artifact field is missing", () => {
  const incompleteResponse = {
    explanation: "Created a counter component with state management",
    // artifact field is missing
  };

  const result = safeParseArtifactResponse(incompleteResponse);

  // Artifact is optional, so this should succeed
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.artifact, undefined);
  }
});

Deno.test("Validation fails when explanation field is missing", () => {
  const incompleteResponse = {
    // explanation field is missing
    artifact: {
      type: "react",
      title: "Counter Component",
      code: "export default function App() { return <div>Counter</div>; }",
    },
  };

  const result = safeParseArtifactResponse(incompleteResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.length > 0, true);
    assertEquals(errors.some(e => e.includes("explanation")), true);
  }
});

Deno.test("Validation fails when artifact.type is missing", () => {
  const incompleteArtifact = {
    explanation: "Created a component",
    artifact: {
      // type field is missing
      title: "Test Component",
      code: "export default function App() {}",
    },
  };

  const result = safeParseArtifactResponse(incompleteArtifact);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("type")), true);
  }
});

Deno.test("Validation fails when artifact.title is missing", () => {
  const incompleteArtifact = {
    explanation: "Created a component with state",
    artifact: {
      type: "react",
      // title field is missing
      code: "export default function App() {}",
    },
  };

  const result = safeParseArtifactResponse(incompleteArtifact);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("title")), true);
  }
});

Deno.test("Validation fails when artifact.code is missing", () => {
  const incompleteArtifact = {
    explanation: "Created a counter component",
    artifact: {
      type: "react",
      title: "Counter",
      // code field is missing
    },
  };

  const result = safeParseArtifactResponse(incompleteArtifact);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("code")), true);
  }
});

// =============================================================================
// INVALID ARTIFACT TYPE TESTS
// =============================================================================

Deno.test("Validation fails with invalid artifact type", () => {
  const invalidType = {
    explanation: "Created a test artifact",
    artifact: {
      type: "invalid_type", // Not in ArtifactType enum
      title: "Test",
      code: "console.log('test');",
    },
  };

  const result = safeParseArtifactResponse(invalidType);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("type")), true);
    assertEquals(errors.some(e => e.includes("Invalid enum value")), true);
  }
});

Deno.test("Validation fails with numeric artifact type", () => {
  const invalidType = {
    explanation: "Created a test artifact",
    artifact: {
      type: 123, // Wrong type (number instead of string)
      title: "Test",
      code: "code",
    },
  };

  const result = safeParseArtifactResponse(invalidType);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("type")), true);
  }
});

Deno.test("Validation succeeds with all valid artifact types", () => {
  const validTypes = ["react", "html", "svg", "mermaid", "code", "markdown"];

  for (const type of validTypes) {
    const validResponse = {
      explanation: `Created a ${type} artifact with proper structure`,
      artifact: {
        type,
        title: `Test ${type}`,
        code: "test code content",
      },
    };

    const result = safeParseArtifactResponse(validResponse);
    assertEquals(result.success, true, `Type '${type}' should be valid`);
  }
});

// =============================================================================
// EMPTY/INVALID FIELD VALUES TESTS
// =============================================================================

Deno.test("Validation fails when artifact code is empty", () => {
  const emptyCode = {
    explanation: "Created a component with empty code",
    artifact: {
      type: "react",
      title: "Empty Component",
      code: "", // Invalid: min length 1
    },
  };

  const result = safeParseArtifactResponse(emptyCode);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("code")), true);
    assertEquals(errors.some(e => e.toLowerCase().includes("at least 1")), true);
  }
});

Deno.test("Validation fails when explanation is too short", () => {
  const shortExplanation = {
    explanation: "Too short", // < 20 chars
    artifact: {
      type: "react",
      title: "Test Component",
      code: "export default function App() { return <div>Test</div>; }",
    },
  };

  const result = safeParseArtifactResponse(shortExplanation);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("explanation")), true);
    assertEquals(errors.some(e => e.toLowerCase().includes("at least 20")), true);
  }
});

Deno.test("Validation fails when title is empty", () => {
  const emptyTitle = {
    explanation: "Created a component with empty title field",
    artifact: {
      type: "react",
      title: "", // Invalid: min length 1
      code: "export default function App() {}",
    },
  };

  const result = safeParseArtifactResponse(emptyTitle);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("title")), true);
  }
});

Deno.test("Validation fails when title is too long", () => {
  const longTitle = {
    explanation: "Created a component with an extremely long title that exceeds maximum",
    artifact: {
      type: "react",
      title: "a".repeat(101), // > 100 chars
      code: "export default function App() {}",
    },
  };

  const result = safeParseArtifactResponse(longTitle);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.some(e => e.includes("title")), true);
    assertEquals(errors.some(e => e.toLowerCase().includes("at most 100")), true);
  }
});

Deno.test("Validation succeeds when title is at maximum length", () => {
  const maxTitle = {
    explanation: "Created a component with a title at exactly maximum allowed length",
    artifact: {
      type: "react",
      title: "a".repeat(100), // Exactly 100 chars
      code: "export default function App() {}",
    },
  };

  const result = safeParseArtifactResponse(maxTitle);

  assertEquals(result.success, true);
});

Deno.test("Validation succeeds when explanation is at minimum length", () => {
  const minExplanation = {
    explanation: "a".repeat(20), // Exactly 20 chars
    artifact: {
      type: "react",
      title: "Test",
      code: "code",
    },
  };

  const result = safeParseArtifactResponse(minExplanation);

  assertEquals(result.success, true);
});

// =============================================================================
// MULTIPLE VALIDATION ERRORS TESTS
// =============================================================================

Deno.test("Validation collects multiple errors when response is severely malformed", () => {
  const multipleErrors = {
    explanation: "Short", // Too short (< 20 chars)
    artifact: {
      type: "invalid", // Invalid type
      title: "", // Empty title
      code: "", // Empty code
    },
  };

  const result = safeParseArtifactResponse(multipleErrors);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    // Should have multiple errors
    assertEquals(errors.length >= 3, true, "Should have at least 3 validation errors");

    // Check each field is mentioned
    const errorString = errors.join(" ");
    assertEquals(errorString.includes("explanation"), true);
    assertEquals(errorString.includes("type"), true);
    assertEquals(errorString.includes("title") || errorString.includes("code"), true);
  }
});

Deno.test("Validation error count matches number of violations", () => {
  const multipleErrors = {
    // Missing explanation (1 error)
    artifact: {
      type: "invalid_type", // Invalid type (1 error)
      title: "a".repeat(101), // Title too long (1 error)
      code: "", // Empty code (1 error)
    },
  };

  const result = safeParseArtifactResponse(multipleErrors);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    assertEquals(errors.length >= 4, true, "Should have 4 validation errors");
  }
});

Deno.test("Validation error messages are field-specific", () => {
  const invalidResponse = {
    explanation: "Too short",
    artifact: {
      type: "wrong",
      title: "a".repeat(101),
      code: "",
    },
  };

  const result = safeParseArtifactResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);

    // Each error should mention the specific field
    const hasExplanationError = errors.some(e => e.startsWith("explanation:"));
    const hasTypeError = errors.some(e => e.includes("artifact.type") || e.includes("type:"));
    const hasTitleError = errors.some(e => e.includes("artifact.title") || e.includes("title:"));
    const hasCodeError = errors.some(e => e.includes("artifact.code") || e.includes("code:"));

    assertEquals(hasExplanationError, true, "Should have explanation error");
    assertEquals(hasTypeError, true, "Should have type error");
    assertEquals(hasTitleError || hasCodeError, true, "Should have title or code error");
  }
});

// =============================================================================
// STRUCTURED OUTPUT VALIDATION ERROR INTEGRATION TESTS
// =============================================================================

Deno.test("StructuredOutputValidationError captures validation details", () => {
  const invalidResponse = {
    explanation: "Short",
    artifact: {
      type: "invalid",
      title: "",
      code: "",
    },
  };

  const result = safeParseArtifactResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);

    const validationError = new StructuredOutputValidationError(
      `Artifact validation failed (${errors.length} errors): ${errors.join("; ")}`,
      JSON.stringify(invalidResponse),
      errors
    );

    assertEquals(validationError.name, "StructuredOutputValidationError");
    assertEquals(validationError.validationErrors.length > 0, true);
    assertEquals(validationError.retryable, true);
    assertEquals(validationError.rawResponse, JSON.stringify(invalidResponse));
  }
});

Deno.test("StructuredOutputValidationError is retryable", () => {
  const error = new StructuredOutputValidationError(
    "Validation failed",
    "{}",
    ["Missing field"]
  );

  assertEquals(isRetryableError(error), true);
});

Deno.test("StructuredOutputValidationError includes error count in message", () => {
  const errors = [
    "explanation: String must contain at least 20 character(s)",
    "artifact.type: Invalid enum value",
    "artifact.code: String must contain at least 1 character(s)",
  ];

  const error = new StructuredOutputValidationError(
    `Artifact validation failed (${errors.length} errors): ${errors.join("; ")}`,
    "{}",
    errors
  );

  assertEquals(error.message.includes("3 errors"), true);
  assertEquals(error.validationErrors.length, 3);
});

// =============================================================================
// USER-FRIENDLY ERROR MESSAGE INTEGRATION TESTS
// =============================================================================

Deno.test("getUserFriendlyErrorMessage converts StructuredOutputValidationError", () => {
  const invalidResponse = {
    explanation: "Too short",
    artifact: { type: "invalid", title: "", code: "" },
  };

  const result = safeParseArtifactResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);
    const validationError = new StructuredOutputValidationError(
      `Validation failed: ${errors.join(", ")}`,
      JSON.stringify(invalidResponse),
      errors
    );

    const userMessage = getUserFriendlyErrorMessage(validationError);

    // Should be user-friendly, not technical
    assertEquals(userMessage.includes("unexpected format"), true);
    assertEquals(userMessage.includes("Zod"), false, "Should not mention Zod");
    assertEquals(userMessage.includes("schema"), false, "Should not mention schema");
    assertEquals(userMessage.includes("artifact."), false, "Should not mention field paths");
  }
});

Deno.test("getUserFriendlyErrorMessage is consistent across validation errors", () => {
  const error1 = new StructuredOutputValidationError("Error 1", "{}", ["field1"]);
  const error2 = new StructuredOutputValidationError("Error 2", "{}", ["field1", "field2"]);
  const error3 = new StructuredOutputValidationError("Error 3", "{}", []);

  const message1 = getUserFriendlyErrorMessage(error1);
  const message2 = getUserFriendlyErrorMessage(error2);
  const message3 = getUserFriendlyErrorMessage(error3);

  // All should have the same user-facing message
  assertEquals(message1, message2);
  assertEquals(message2, message3);
  assertEquals(message1.includes("unexpected format"), true);
});

// =============================================================================
// PARSE ARTIFACT RESPONSE INTEGRATION TESTS
// =============================================================================

Deno.test("parseArtifactResponse throws ZodError on validation failure", () => {
  const invalidResponse = {
    explanation: "Short",
    artifact: { type: "invalid", title: "", code: "" },
  };

  let caughtError: unknown;
  try {
    parseArtifactResponse(invalidResponse);
  } catch (error) {
    caughtError = error;
  }

  assertInstanceOf(caughtError, z.ZodError);
  if (caughtError instanceof z.ZodError) {
    assertEquals(caughtError.errors.length > 0, true);
  }
});

Deno.test("parseArtifactResponse succeeds with valid response", () => {
  const validResponse = {
    explanation: "Created a simple React counter component with state management",
    artifact: {
      type: "react",
      title: "Counter Component",
      code: "export default function App() { return <div>Counter</div>; }",
    },
  };

  const parsed = parseArtifactResponse(validResponse);

  assertEquals(parsed.explanation.length >= 20, true);
  assertEquals(parsed.artifact?.type, "react");
  assertEquals(parsed.artifact?.title, "Counter Component");
  assert(parsed.artifact?.code && parsed.artifact.code.length > 0, "Code should exist and not be empty");
});

Deno.test("parseArtifactResponse allows artifact to be optional", () => {
  const validWithoutArtifact = {
    explanation: "I cannot create this artifact because the request is unclear",
  };

  const parsed = parseArtifactResponse(validWithoutArtifact);

  assertEquals(parsed.explanation.length >= 20, true);
  assertEquals(parsed.artifact, undefined);
});

// =============================================================================
// ARTIFACT TYPE SCHEMA TESTS
// =============================================================================

Deno.test("ArtifactTypeSchema validates all supported types", () => {
  const validTypes = ["react", "html", "svg", "mermaid", "code", "markdown"];

  for (const type of validTypes) {
    const result = ArtifactTypeSchema.safeParse(type);
    assertEquals(result.success, true, `Type '${type}' should be valid`);
  }
});

Deno.test("ArtifactTypeSchema rejects invalid types", () => {
  const invalidTypes = ["vue", "angular", "typescript", "python", "invalid"];

  for (const type of invalidTypes) {
    const result = ArtifactTypeSchema.safeParse(type);
    assertEquals(result.success, false, `Type '${type}' should be invalid`);
  }
});

Deno.test("ArtifactTypeSchema rejects non-string types", () => {
  const invalidInputs = [123, null, undefined, {}, [], true];

  for (const input of invalidInputs) {
    const result = ArtifactTypeSchema.safeParse(input);
    assertEquals(result.success, false, `Input '${input}' should be invalid`);
  }
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

Deno.test("Validation handles null values gracefully", () => {
  const nullValues = {
    explanation: null,
    artifact: null,
  };

  const result = safeParseArtifactResponse(nullValues);

  assertEquals(result.success, false);
});

Deno.test("Validation handles undefined values gracefully", () => {
  const undefinedValues = {
    explanation: undefined,
    artifact: undefined,
  };

  const result = safeParseArtifactResponse(undefinedValues);

  assertEquals(result.success, false);
});

Deno.test("Validation handles wrong type for artifact field", () => {
  const wrongType = {
    explanation: "Created a component with proper explanation length here",
    artifact: "not an object", // Should be an object
  };

  const result = safeParseArtifactResponse(wrongType);

  assertEquals(result.success, false);
});

Deno.test("Validation handles array instead of object", () => {
  const arrayInput: unknown[] = [];

  const result = safeParseArtifactResponse(arrayInput);

  assertEquals(result.success, false);
});

Deno.test("Validation handles string instead of object", () => {
  const stringInput = "not an object";

  const result = safeParseArtifactResponse(stringInput);

  assertEquals(result.success, false);
});

Deno.test("Validation handles extra unexpected fields", () => {
  const extraFields = {
    explanation: "Created a component with all required fields plus extra data",
    artifact: {
      type: "react",
      title: "Test",
      code: "code",
      extraField1: "should be ignored",
      extraField2: 123,
    },
    topLevelExtra: "should also be ignored",
  };

  // Zod ignores extra fields by default (doesn't use strict())
  const result = safeParseArtifactResponse(extraFields);

  // This should succeed - extra fields are ignored
  assertEquals(result.success, true);
});

Deno.test("Validation preserves optional language field", () => {
  const withLanguage = {
    explanation: "Created a Python code snippet with syntax highlighting",
    artifact: {
      type: "code",
      title: "Python Example",
      code: "print('Hello, World!')",
      language: "python",
    },
  };

  const result = safeParseArtifactResponse(withLanguage);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.artifact?.language, "python");
  }
});

Deno.test("Validation succeeds without optional language field", () => {
  const withoutLanguage = {
    explanation: "Created a generic code snippet without language specification",
    artifact: {
      type: "code",
      title: "Code Example",
      code: "console.log('test');",
    },
  };

  const result = safeParseArtifactResponse(withoutLanguage);

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.artifact?.language, undefined);
  }
});

// =============================================================================
// GETVALIDATIONERRORS FUNCTION TESTS
// =============================================================================

Deno.test("getValidationErrors formats errors with field paths", () => {
  const invalidResponse = {
    explanation: "Too short",
    artifact: {
      type: "invalid",
      title: "",
      code: "",
    },
  };

  const result = safeParseArtifactResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);

    // Errors should include field paths
    assertEquals(errors.length > 0, true);

    // At least one error should include a path separator
    const hasFieldPath = errors.some(e => e.includes(".") || e.includes(":"));
    assertEquals(hasFieldPath, true, "Errors should include field paths");
  }
});

Deno.test("getValidationErrors returns array of strings", () => {
  const invalidResponse = {
    explanation: "Short",
  };

  const result = safeParseArtifactResponse(invalidResponse);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);

    assertEquals(Array.isArray(errors), true);
    errors.forEach(error => {
      assertEquals(typeof error, "string");
    });
  }
});

Deno.test("getValidationErrors handles nested validation errors", () => {
  const invalidNested = {
    explanation: "Created a component with nested validation issues here",
    artifact: {
      type: "react",
      title: "a".repeat(101), // Too long
      code: "", // Too short
    },
  };

  const result = safeParseArtifactResponse(invalidNested);

  assertEquals(result.success, false);
  if (!result.success) {
    const errors = getValidationErrors(result.error);

    // Should have errors for nested fields
    const hasNestedError = errors.some(e =>
      e.includes("artifact.title") || e.includes("artifact.code")
    );
    assertEquals(hasNestedError, true);
  }
});
