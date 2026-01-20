/**
 * Artifact Generation Tool V2
 *
 * Simplified artifact generation using Gemini 3 Flash.
 * Replaces the complex 1,337-line artifact-executor.ts with a minimal approach:
 *
 * 1. Call Gemini with artifact generation instructions
 * 2. Parse artifact code from <artifact> XML tags
 * 3. Basic validation (has default export, valid React/HTML/etc.)
 * 4. Return raw code - let vanilla Sandpack handle rendering and errors
 *
 * Key simplifications from old system:
 * - No template matching (rely on AI to generate good code)
 * - No complex validation rules (trust Sandpack error handling)
 * - No bundling/transformation (Sandpack handles this)
 * - Simple XML tag parsing for artifact extraction
 */

import {
  callGeminiWithRetry,
  type GeminiMessage,
} from './gemini-client.ts';
import { getSystemInstruction } from './system-prompt-inline.ts';
import type { ToolContext, ToolExecutionResult, GeneratableArtifactType } from './tool-executor.ts';
import { MODELS } from './config.ts';

/**
 * Parameters for artifact generation V2
 */
export interface ArtifactGenerationParams {
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
 * Execute artifact generation using Gemini 3 Flash
 *
 * This is the simplified v2 implementation that:
 * 1. Calls Gemini with clear artifact format instructions
 * 2. Parses <artifact> XML tags from response
 * 3. Does basic validation only
 * 4. Returns raw code for vanilla Sandpack to render
 *
 * @param params - Artifact generation parameters
 * @returns Tool execution result with artifact code and metadata
 */
export async function executeArtifactGenerationV2(
  params: ArtifactGenerationParams
): Promise<ToolExecutionResult> {
  const startTime = Date.now();
  const { type, prompt, context, existingCode } = params;
  const { requestId } = context;

  console.log(`[${requestId}] 🎨 Artifact generation v2: type=${type}`);

  try {
    // Build system instruction with artifact format and constraints
    const systemInstruction = getSystemInstruction({
      useToolCalling: false, // Not using tools for artifact generation itself
      fullArtifactContext: existingCode
        ? `You are editing an existing ${type} artifact. Here is the current code:\n\n${existingCode}`
        : `You are creating a new ${type} artifact.`,
    });

    // Build user message
    const userMessage = existingCode
      ? `Edit the existing ${type} artifact based on this request: ${prompt}`
      : `Create a ${type} artifact: ${prompt}`;

    // Prepare messages for Gemini
    const messages: GeminiMessage[] = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userMessage },
    ];

    console.log(`[${requestId}] 📤 Calling Gemini for artifact generation...`);

    // Call Gemini (synchronous, non-streaming)
    const response = await callGeminiWithRetry(messages, {
      model: MODELS.GEMINI_3_FLASH,
      temperature: 0.7,
      max_tokens: 8000, // Generous limit for complex artifacts
      requestId,
      userId: context.userId,
      isGuest: context.isGuest,
      functionName: 'artifact-generation-v2',
      stream: false, // Synchronous execution
      enableThinking: true, // Enable reasoning for better code quality
      thinkingLevel: 'medium', // Medium thinking for good balance
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    // Parse JSON response
    const responseData = await response.json();
    const assistantMessage = responseData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('No content in Gemini response');
    }

    console.log(`[${requestId}] 📥 Received Gemini response (${assistantMessage.length} chars)`);

    // Extract artifact from <artifact> XML tags
    const artifactMatch = assistantMessage.match(
      /<artifact[^>]*>([\s\S]*?)<\/artifact>/i
    );

    if (!artifactMatch) {
      throw new Error(
        'No <artifact> tags found in response. AI must wrap code in <artifact> tags.'
      );
    }

    const artifactCode = artifactMatch[1].trim();

    // Extract title from artifact tag attributes
    const titleMatch = assistantMessage.match(/<artifact[^>]*title="([^"]+)"/i);
    const title = titleMatch ? titleMatch[1] : `${type.charAt(0).toUpperCase() + type.slice(1)} Artifact`;

    // Extract type from artifact tag attributes (for validation)
    const typeMatch = assistantMessage.match(/<artifact[^>]*type="([^"]+)"/i);
    const declaredType = typeMatch ? typeMatch[1] : null;

    // Basic validation
    const validationErrors = validateArtifact(type, artifactCode);
    if (validationErrors.length > 0) {
      throw new Error(`Artifact validation failed: ${validationErrors.join(', ')}`);
    }

    const latencyMs = Date.now() - startTime;

    console.log(
      `[${requestId}] ✅ Artifact generated successfully in ${latencyMs}ms ` +
      `(${artifactCode.length} chars, title: "${title}")`
    );

    // Return successful result
    return {
      success: true,
      toolName: 'generate_artifact',
      data: {
        artifactCode,
        artifactType: type,
        artifactTitle: title,
        artifactReasoning: `Generated ${type} artifact using Gemini 3 Flash`,
      },
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[${requestId}] ❌ Artifact generation failed after ${latencyMs}ms:`,
      errorMessage
    );

    return {
      success: false,
      toolName: 'generate_artifact',
      error: errorMessage,
      latencyMs,
    };
  }
}

/**
 * Validate generated artifact code
 *
 * Performs basic validation only - lets Sandpack handle runtime errors naturally.
 * This is intentionally minimal to avoid over-engineering.
 *
 * @param type - Artifact type
 * @param code - Generated code
 * @returns Array of validation error messages (empty if valid)
 */
function validateArtifact(type: GeneratableArtifactType, code: string): string[] {
  const errors: string[] = [];

  // Basic non-empty check
  if (!code || code.trim().length === 0) {
    errors.push('Artifact code is empty');
    return errors;
  }

  // Type-specific validation
  switch (type) {
    case 'react':
      // React artifacts must have a default export for Sandpack to render them.
      // Both syntaxes are valid JavaScript for default exports:
      // - `export default function App() {}` or `export default App`
      // - `export { App as default }` (named export syntax)
      // This check mirrors src/utils/artifactValidator.ts for consistency.
      if (!code.includes('export default') && !code.includes('export {')) {
        errors.push('React artifacts must have a default export (use "export default" or "export { X as default }")');
      }
      break;

    case 'html':
      // HTML artifacts should have basic HTML structure
      if (!code.includes('<') || !code.includes('>')) {
        errors.push('HTML artifacts must contain HTML tags');
      }
      break;

    case 'svg':
      // SVG artifacts should have <svg> tag
      if (!code.includes('<svg')) {
        errors.push('SVG artifacts must contain <svg> tag');
      }
      break;

    case 'mermaid':
      // Mermaid diagrams should start with a diagram type
      const mermaidTypes = ['graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'flowchart'];
      const hasMermaidType = mermaidTypes.some(t => code.includes(t));
      if (!hasMermaidType) {
        errors.push('Mermaid diagrams must start with a valid diagram type (graph, sequenceDiagram, etc.)');
      }
      break;

    case 'code':
    case 'markdown':
      // No specific validation for code and markdown
      break;

    default:
      errors.push(`Unknown artifact type: ${type}`);
  }

  return errors;
}
