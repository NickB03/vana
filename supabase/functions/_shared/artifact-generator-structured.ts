/**
 * Structured Artifact Generator
 *
 * Generates artifacts using OpenRouter's structured outputs API (JSON schema)
 * instead of XML parsing. This provides:
 * - Type-safe artifact data
 * - Reduced reliance on regex parsing (minimal string validation still exists
 *   for type-specific checks like verifying React exports or SVG tags)
 * - Cleaner validation flow
 *
 * @module artifact-generator-structured
 */

import { callGeminiWithRetry, type GeminiMessage, type ResponseFormat } from "./gemini-client.ts";
import {
  type ArtifactResponse,
  getArtifactJsonSchema,
  getValidationErrors,
  safeParseArtifactResponse,
} from "./schemas/artifact-schema.ts";
import type { GeneratableArtifactType, ToolContext, ToolExecutionResult } from "./tool-executor.ts";
import { MODELS } from "./config.ts";
import {
  ArtifactParseError,
  getUserFriendlyErrorMessage,
  isRetryableError,
  StructuredOutputValidationError,
} from "./errors.ts";
import { analyzeArtifactComplexity, type ComplexityResult } from "./artifact-complexity.ts";

/**
 * Progress event types for streaming artifact generation
 */
export type ArtifactProgressStage =
  | "analyzing"
  | "thinking"
  | "generating"
  | "validating"
  | "complete"
  | "error";

/**
 * Progress event emitted during streaming artifact generation
 */
export interface ArtifactProgressEvent {
  type: "artifact_progress";
  data: {
    stage: ArtifactProgressStage;
    percentage: number;
    message?: string;
    complexity?: ComplexityResult;
  };
}

/**
 * Completion event emitted when artifact generation is done
 */
export interface ArtifactCompleteEvent {
  type: "artifact_complete";
  data: ToolExecutionResult;
}

/**
 * Error event emitted when artifact generation fails
 */
export interface ArtifactErrorEvent {
  type: "artifact_error";
  data: {
    error: string;
    stage: ArtifactProgressStage;
    latencyMs: number;
    technicalError?: string;
    retryable?: boolean;
    userFriendlyMessage?: string;
  };
}

/**
 * Union type for all streaming events
 */
export type ArtifactStreamEvent =
  | ArtifactProgressEvent
  | ArtifactCompleteEvent
  | ArtifactErrorEvent;

/**
 * Parameters for structured artifact generation
 */
export interface StructuredArtifactGenerationParams {
  /** Artifact type (react, html, svg, code, mermaid, markdown) */
  type: GeneratableArtifactType;
  /** User's artifact request prompt */
  prompt: string;
  /** Execution context (requestId, userId, etc.) */
  context: ToolContext;
  /** Optional: Existing artifact code for edits */
  existingCode?: string;
}

/**
 * Get the system prompt for structured artifact generation.
 * This is simpler than the XML version since format is handled by JSON schema.
 */
function getStructuredArtifactSystemPrompt(
  type: GeneratableArtifactType,
  existingCode?: string,
): string {
  const isEdit = !!existingCode;
  const action = isEdit ? "Edit the existing" : "Create a new";

  // Type-specific instructions
  const typeInstructions: Record<GeneratableArtifactType, string> = {
    react: `
**React Component Requirements:**
- Write plain JavaScript (NOT TypeScript - no type annotations)
- Use functional components with hooks
- Export as default: \`export default function App() { ... }\`
- Destructure React hooks: \`const { useState, useEffect } = React;\`
- Use Tailwind CSS for styling (no CSS modules or styled-components)
- Include realistic sample data on first render
- Make components interactive and engaging

**Available Libraries:**
- React (global, use React.useState, React.useEffect, etc.)
- Recharts (for charts): \`import { LineChart, BarChart, PieChart, ... } from 'recharts'\`
- Framer Motion (for animations): \`import { motion, AnimatePresence } from 'framer-motion'\`
- Lucide React (for icons): \`import { Icon } from 'lucide-react'\`

**CRITICAL:**
- Do NOT import from '@/' paths (these don't work in sandbox)
- Do NOT use shadcn/ui components
- Do NOT use TypeScript syntax`,

    html: `
**HTML Requirements:**
- Complete HTML document with <!DOCTYPE html>
- Self-contained with embedded CSS and JavaScript
- Use semantic HTML elements
- Make it responsive with CSS`,

    svg: `
**SVG Requirements:**
- Valid SVG element with width, height, and xmlns
- Use vector graphics properly
- Consider viewBox for scalability`,

    mermaid: `
**Mermaid Diagram Requirements:**
- Start with valid diagram type (flowchart, sequenceDiagram, classDiagram, etc.)
- Use proper Mermaid syntax
- Keep diagrams readable`,

    code: `
**Code Requirements:**
- Well-formatted, clean code
- Add comments for clarity
- Use appropriate language conventions`,

    markdown: `
**Markdown Requirements:**
- Well-structured markdown
- Use appropriate headings, lists, and formatting
- Include code blocks with language specifiers if needed`,
  };

  const editContext = existingCode
    ? `\n\n**Existing code to modify:**\n\`\`\`\n${existingCode}\n\`\`\``
    : "";

  return `You are an expert at creating ${type} artifacts.

${action} ${type} artifact based on the user's request.

${typeInstructions[type]}
${editContext}

**Response Format:**
You MUST respond with a JSON object containing:
1. "explanation": A 3-5 sentence explanation of what you created
2. "artifact": An object with:
   - "type": "${type}"
   - "title": A descriptive title (1-100 chars)
   - "code": The complete artifact code
   - "language": (optional) Language specifier for code artifacts

Focus on creating high-quality, functional code that matches the user's request.`;
}

/**
 * Generate an artifact using structured outputs (JSON schema).
 *
 * This function:
 * 1. Builds a simplified system prompt (no XML format instructions)
 * 2. Calls Gemini with response_format set to our JSON schema
 * 3. Parses the JSON response
 * 4. Validates with Zod
 * 5. Returns the artifact data
 *
 * @param params - Generation parameters
 * @returns Tool execution result with artifact code and metadata
 */
export async function generateArtifactStructured(
  params: StructuredArtifactGenerationParams,
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { type, prompt, context, existingCode } = params;
  const { requestId } = context;

  console.log(`[${requestId}] 🎨 Structured artifact generation: type=${type}`);

  try {
    // Build system instruction (simpler without XML format instructions)
    const systemPrompt = getStructuredArtifactSystemPrompt(type, existingCode);

    // Build user message
    const userMessage = existingCode
      ? `Edit the existing ${type} artifact based on this request: ${prompt}`
      : `Create a ${type} artifact: ${prompt}`;

    // Prepare messages for Gemini
    const messages: GeminiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    // Build response format for structured outputs
    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: getArtifactJsonSchema(),
    };

    console.log(`[${requestId}] 📤 Calling Gemini with structured output...`);

    // Call Gemini with structured output format
    const response = await callGeminiWithRetry(messages, {
      model: MODELS.GEMINI_3_FLASH,
      temperature: 0.7,
      max_tokens: 8000,
      requestId,
      userId: context.userId,
      isGuest: context.isGuest,
      functionName: "artifact-generation-structured",
      stream: false, // Structured outputs require non-streaming
      enableThinking: true,
      thinkingLevel: "medium",
      responseFormat, // Use structured output
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    // Parse JSON response
    const responseData = await response.json();
    const assistantMessage = responseData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new ArtifactParseError(
        "No content in Gemini response",
        JSON.stringify(responseData),
        true,
      );
    }

    console.log(`[${requestId}] 📥 Received Gemini response (${assistantMessage.length} chars)`);

    // Parse the JSON content
    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(assistantMessage);
    } catch (parseError) {
      const maxLogLength = 2000;
      const responseLength = assistantMessage.length;
      const isTruncated = responseLength > maxLogLength;
      const responsePreview = assistantMessage.substring(0, maxLogLength);
      const parseErrorMessage = parseError instanceof Error
        ? parseError.message
        : String(parseError);

      // Log full context for debugging
      console.error(`[${requestId}] ❌ Failed to parse JSON response:`);
      console.error(`[${requestId}] Parse error: ${parseErrorMessage}`);
      console.error(
        `[${requestId}] Response length: ${responseLength} chars${
          isTruncated ? " (truncated in log)" : ""
        }`,
      );
      console.error(`[${requestId}] Response preview:`, responsePreview);

      // Emit structured JSON event for monitoring
      console.log(JSON.stringify({
        event: "json_parse_error",
        parseError: parseErrorMessage,
        responseLength,
        responsePreview: responsePreview.substring(0, 500), // Shorter preview for JSON event
        isTruncated: responseLength > 500,
        requestId,
        timestamp: new Date().toISOString(),
      }));

      throw new ArtifactParseError(
        `Response is not valid JSON: ${parseErrorMessage}`,
        assistantMessage,
        true,
      );
    }

    // Validate with Zod schema
    const validationResult = safeParseArtifactResponse(parsedContent);

    if (!validationResult.success) {
      const errors = getValidationErrors(validationResult.error);

      // Log each error individually with clear formatting
      console.error(`[${requestId}] ❌ Validation failed with ${errors.length} error(s):`);
      errors.forEach((error, index) => {
        console.error(`[${requestId}]   ${index + 1}. ${error}`);
      });

      // Log structured event with full error details
      console.log(JSON.stringify({
        event: "structured_output_validation_failed",
        success: false,
        validationPassed: false,
        errorCount: errors.length,
        errors: errors,
        requestId,
        timestamp: new Date().toISOString(),
      }));

      throw new StructuredOutputValidationError(
        `Artifact validation failed (${errors.length} errors): ${errors.join("; ")}`,
        assistantMessage,
        errors,
      );
    }

    const artifactResponse: ArtifactResponse = validationResult.data;

    // Check if artifact was generated
    if (!artifactResponse.artifact) {
      throw new ArtifactParseError(
        "No artifact in response",
        assistantMessage,
        true,
      );
    }

    const { artifact, explanation } = artifactResponse;
    const latencyMs = Date.now() - startTime;

    // Log success metrics
    console.log(JSON.stringify({
      event: "structured_output_generation",
      success: true,
      validationPassed: true,
      artifactType: artifact.type,
      artifactTitleLength: artifact.title.length,
      artifactCodeLength: artifact.code.length,
      explanationLength: explanation.length,
      latencyMs,
      requestId,
      timestamp: new Date().toISOString(),
    }));

    console.log(
      `[${requestId}] ✅ Structured artifact generated successfully in ${latencyMs}ms ` +
        `(${artifact.code.length} chars, title: "${artifact.title}")`,
    );

    // Return successful result
    return {
      success: true,
      toolName: "generate_artifact",
      data: {
        artifactCode: artifact.code,
        artifactType: artifact.type,
        artifactTitle: artifact.title,
        artifactReasoning: explanation,
      },
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const rawErrorMessage = error instanceof Error ? error.message : String(error);
    const userFriendlyMessage = getUserFriendlyErrorMessage(error);

    // Log failure metrics with raw error for debugging
    console.log(JSON.stringify({
      event: "structured_output_generation",
      success: false,
      validationPassed: false,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: rawErrorMessage.substring(0, 200),
      latencyMs,
      requestId,
      timestamp: new Date().toISOString(),
    }));

    console.error(
      `[${requestId}] ❌ Structured artifact generation failed after ${latencyMs}ms:`,
      rawErrorMessage,
    );

    return {
      success: false,
      toolName: "generate_artifact",
      error: userFriendlyMessage,
      latencyMs,
    };
  }
}

/**
 * Basic validation for generated artifact code.
 * Validates type-specific requirements.
 *
 * @param type - Artifact type
 * @param code - Generated code
 * @returns Array of validation error messages (empty if valid)
 */
export function validateArtifactCode(type: GeneratableArtifactType, code: string): string[] {
  const errors: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push("Artifact code is empty");
    return errors;
  }

  switch (type) {
    case "react":
      if (!code.includes("export default") && !code.includes("export {")) {
        errors.push("React artifacts must have a default export");
      }
      break;

    case "html":
      if (!code.includes("<") || !code.includes(">")) {
        errors.push("HTML artifacts must contain HTML tags");
      }
      break;

    case "svg":
      if (!code.includes("<svg")) {
        errors.push("SVG artifacts must contain <svg> tag");
      }
      break;

    case "mermaid":
      const mermaidTypes = [
        "graph",
        "sequenceDiagram",
        "classDiagram",
        "stateDiagram",
        "erDiagram",
        "journey",
        "gantt",
        "pie",
        "flowchart",
      ];
      const hasMermaidType = mermaidTypes.some((t) => code.includes(t));
      if (!hasMermaidType) {
        errors.push("Mermaid diagrams must start with a valid diagram type");
      }
      break;

    case "code":
    case "markdown":
      // No specific validation for code and markdown
      break;

    default:
      errors.push(`Unknown artifact type: ${type}`);
  }

  return errors;
}

/**
 * Generate an artifact with streaming progress events.
 *
 * This async generator yields progress events during artifact generation,
 * providing real-time feedback for complex artifacts.
 *
 * Stages:
 * 1. analyzing (5%) - Analyzing complexity
 * 2. thinking (10-30%) - LLM reasoning phase
 * 3. generating (30-80%) - Code generation
 * 4. validating (80-95%) - Schema validation
 * 5. complete (100%) - Done
 *
 * @param params - Generation parameters
 * @yields Progress and completion events
 *
 * @example
 * ```typescript
 * for await (const event of generateArtifactStreaming(params)) {
 *   if (event.type === 'artifact_progress') {
 *     console.log(`${event.data.stage}: ${event.data.percentage}%`);
 *   } else if (event.type === 'artifact_complete') {
 *     console.log('Done:', event.data);
 *   }
 * }
 * ```
 */
export async function* generateArtifactStreaming(
  params: StructuredArtifactGenerationParams,
): AsyncGenerator<ArtifactStreamEvent, void, unknown> {
  const startTime = Date.now();
  const { type, prompt, context, existingCode } = params;
  const { requestId } = context;
  let currentStage: ArtifactProgressStage = "analyzing";

  console.log(`[${requestId}] 🎨 Streaming artifact generation started: type=${type}`);

  try {
    // Stage 1: Analyzing complexity
    yield {
      type: "artifact_progress",
      data: {
        stage: "analyzing",
        percentage: 5,
        message: "Analyzing artifact complexity...",
      },
    };

    const complexity = analyzeArtifactComplexity(type, prompt);
    console.log(`[${requestId}] 📊 Complexity analysis: ${complexity.reason}`);

    yield {
      type: "artifact_progress",
      data: {
        stage: "analyzing",
        percentage: 10,
        message: complexity.reason,
        complexity,
      },
    };

    // Stage 2: Thinking
    currentStage = "thinking";
    yield {
      type: "artifact_progress",
      data: {
        stage: "thinking",
        percentage: 15,
        message: "Reasoning about implementation...",
      },
    };

    // Build system prompt
    const systemPrompt = getStructuredArtifactSystemPrompt(type, existingCode);
    const userMessage = existingCode
      ? `Edit the existing ${type} artifact based on this request: ${prompt}`
      : `Create a ${type} artifact: ${prompt}`;

    const messages: GeminiMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: getArtifactJsonSchema(),
    };

    yield {
      type: "artifact_progress",
      data: {
        stage: "thinking",
        percentage: 25,
        message: "Preparing generation request...",
      },
    };

    // Stage 3: Generating
    currentStage = "generating";
    yield {
      type: "artifact_progress",
      data: {
        stage: "generating",
        percentage: 30,
        message: "Generating artifact code...",
      },
    };

    console.log(`[${requestId}] 📤 Calling Gemini with structured output...`);

    // Call Gemini (non-streaming for structured outputs)
    const response = await callGeminiWithRetry(messages, {
      model: MODELS.GEMINI_3_FLASH,
      temperature: 0.7,
      max_tokens: 8000,
      requestId,
      userId: context.userId,
      isGuest: context.isGuest,
      functionName: "artifact-generation-streaming",
      stream: false,
      enableThinking: true,
      thinkingLevel: complexity.isComplex ? "high" : "medium",
      responseFormat,
    });

    yield {
      type: "artifact_progress",
      data: {
        stage: "generating",
        percentage: 70,
        message: "Processing response...",
      },
    };

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    const assistantMessage = responseData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new ArtifactParseError(
        "No content in Gemini response",
        JSON.stringify(responseData),
        true,
      );
    }

    yield {
      type: "artifact_progress",
      data: {
        stage: "generating",
        percentage: 80,
        message: "Received artifact code",
      },
    };

    // Stage 4: Validating
    currentStage = "validating";
    yield {
      type: "artifact_progress",
      data: {
        stage: "validating",
        percentage: 85,
        message: "Validating artifact structure...",
      },
    };

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(assistantMessage);
    } catch (parseError) {
      const maxLogLength = 2000;
      const responseLength = assistantMessage.length;
      const isTruncated = responseLength > maxLogLength;
      const responsePreview = assistantMessage.substring(0, maxLogLength);
      const parseErrorMessage = parseError instanceof Error
        ? parseError.message
        : String(parseError);

      // Log full context for debugging
      console.error(`[${requestId}] ❌ Failed to parse JSON response (streaming):`);
      console.error(`[${requestId}] Parse error: ${parseErrorMessage}`);
      console.error(
        `[${requestId}] Response length: ${responseLength} chars${
          isTruncated ? " (truncated in log)" : ""
        }`,
      );
      console.error(`[${requestId}] Response preview:`, responsePreview);

      // Emit structured JSON event for monitoring
      console.log(JSON.stringify({
        event: "json_parse_error_streaming",
        parseError: parseErrorMessage,
        responseLength,
        responsePreview: responsePreview.substring(0, 500), // Shorter preview for JSON event
        isTruncated: responseLength > 500,
        requestId,
        timestamp: new Date().toISOString(),
      }));

      throw new ArtifactParseError(
        `Response is not valid JSON: ${parseErrorMessage}`,
        assistantMessage,
        true,
      );
    }

    yield {
      type: "artifact_progress",
      data: {
        stage: "validating",
        percentage: 90,
        message: "Validating schema...",
      },
    };

    const validationResult = safeParseArtifactResponse(parsedContent);

    if (!validationResult.success) {
      const errors = getValidationErrors(validationResult.error);
      throw new StructuredOutputValidationError(
        `Artifact validation failed: ${errors.join(", ")}`,
        assistantMessage,
        errors,
      );
    }

    const artifactResponse: ArtifactResponse = validationResult.data;

    if (!artifactResponse.artifact) {
      throw new ArtifactParseError(
        "No artifact in response",
        assistantMessage,
        true,
      );
    }

    yield {
      type: "artifact_progress",
      data: {
        stage: "validating",
        percentage: 95,
        message: "Validation passed",
      },
    };

    // Stage 5: Complete
    currentStage = "complete";
    const { artifact, explanation } = artifactResponse;
    const latencyMs = Date.now() - startTime;

    // Log success metrics
    console.log(JSON.stringify({
      event: "streaming_artifact_generation",
      success: true,
      isComplex: complexity.isComplex,
      artifactType: artifact.type,
      artifactCodeLength: artifact.code.length,
      latencyMs,
      requestId,
      timestamp: new Date().toISOString(),
    }));

    console.log(
      `[${requestId}] ✅ Streaming artifact generated in ${latencyMs}ms ` +
        `(${artifact.code.length} chars, title: "${artifact.title}")`,
    );

    const result: ToolExecutionResult = {
      success: true,
      toolName: "generate_artifact",
      data: {
        artifactCode: artifact.code,
        artifactType: artifact.type,
        artifactTitle: artifact.title,
        artifactReasoning: explanation,
      },
      latencyMs,
    };

    // Final progress event
    yield {
      type: "artifact_progress",
      data: {
        stage: "complete",
        percentage: 100,
        message: `Generated ${artifact.title}`,
      },
    };

    // Completion event
    yield {
      type: "artifact_complete",
      data: result,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const rawErrorMessage = error instanceof Error ? error.message : String(error);
    const userFriendlyMessage = getUserFriendlyErrorMessage(error);
    const retryable = isRetryableError(error);

    console.log(JSON.stringify({
      event: "streaming_artifact_generation",
      success: false,
      errorType: error instanceof Error ? error.constructor.name : "Unknown",
      errorMessage: rawErrorMessage.substring(0, 200),
      stage: currentStage,
      latencyMs,
      retryable,
      requestId,
      timestamp: new Date().toISOString(),
    }));

    // Log full error details server-side for debugging
    console.error(
      `[${requestId}] ❌ Streaming artifact generation failed at ${currentStage}:`,
      {
        error: error instanceof Error
          ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
          : error,
        stage: currentStage,
        latencyMs,
        userFriendlyMessage,
        retryable,
      },
    );

    yield {
      type: "artifact_error",
      data: {
        error: userFriendlyMessage,
        userFriendlyMessage, // Explicit user-facing field
        technicalError: rawErrorMessage,
        retryable,
        stage: currentStage,
        latencyMs,
      },
    };
  }
}
