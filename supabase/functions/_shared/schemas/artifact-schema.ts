/**
 * Zod Schema for Artifact Structured Outputs
 *
 * Defines validation schemas for artifact generation using OpenRouter's
 * structured outputs API (response_format with json_schema).
 *
 * This enables type-safe artifact generation without XML parsing:
 * 1. Send JSON Schema to OpenRouter → LLM outputs structured JSON
 * 2. Validate response with Zod → Type-safe artifact data
 * 3. Use artifact directly → No regex/XML parsing needed
 *
 * @module artifact-schema
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Valid artifact types that can be generated.
 * Matches the types supported by the Sandpack renderer.
 */
export const ArtifactTypeSchema = z.enum([
  'react',
  'html',
  'svg',
  'mermaid',
  'code',
  'markdown'
]);

/**
 * TypeScript type for artifact types
 */
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

/**
 * Schema for an individual artifact.
 * Contains the code/content and metadata.
 */
export const ArtifactSchema = z.object({
  /** Type of artifact (determines how it's rendered) */
  type: ArtifactTypeSchema,
  /** Human-readable title for the artifact */
  title: z.string().min(1).max(100),
  /** The actual code/content of the artifact */
  code: z.string().min(1),
  /** Optional language specifier (for code artifacts) */
  language: z.string().optional()
});

/**
 * TypeScript type for an artifact
 */
export type Artifact = z.infer<typeof ArtifactSchema>;

/**
 * Schema for the complete LLM response when generating artifacts.
 * Includes both the explanation and the optional artifact.
 */
export const ArtifactResponseSchema = z.object({
  /**
   * Explanation of what was created (shown to user).
   * Should be 3-5 sentences describing the artifact.
   */
  explanation: z.string()
    .min(20)
    .describe('A 3-5 sentence explanation of what was created, including key features and how to use it'),

  /**
   * The generated artifact (optional - may be null for errors).
   * Contains the code and metadata for rendering.
   */
  artifact: ArtifactSchema.optional()
    .describe('The generated artifact with type, title, and code. Only omit if generation failed.')
});

/**
 * TypeScript type for the complete artifact response
 */
export type ArtifactResponse = z.infer<typeof ArtifactResponseSchema>;

/**
 * Convert Zod schema to JSON Schema for OpenRouter's response_format.
 *
 * OpenRouter's structured outputs API uses JSON Schema (not Zod) at request time.
 * This function returns the properly formatted schema object.
 *
 * @returns JSON Schema object compatible with OpenRouter's response_format
 *
 * @example
 * ```typescript
 * const response = await callGemini(messages, {
 *   responseFormat: {
 *     type: 'json_schema',
 *     json_schema: getArtifactJsonSchema()
 *   }
 * });
 * ```
 */
export function getArtifactJsonSchema(): {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
} {
  return {
    name: 'artifact_response',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        explanation: {
          type: 'string',
          minLength: 20,
          description: 'A 3-5 sentence explanation of what was created, including key features and how to use it'
        },
        artifact: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['react', 'html', 'svg', 'mermaid', 'code', 'markdown'],
              description: 'The type of artifact being generated'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
              description: 'Human-readable title for the artifact'
            },
            code: {
              type: 'string',
              minLength: 1,
              description: 'The actual code/content of the artifact'
            },
            language: {
              type: 'string',
              description: 'Optional language specifier for code artifacts (e.g., "python", "javascript")'
            }
          },
          required: ['type', 'title', 'code'],
          additionalProperties: false,
          description: 'The generated artifact. Only omit if generation failed.'
        }
      },
      required: ['explanation'],
      additionalProperties: false
    }
  };
}

/**
 * Validate and parse a raw LLM response into a typed ArtifactResponse.
 *
 * @param response - Raw JSON from the LLM
 * @returns Parsed and validated artifact response
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const artifact = parseArtifactResponse(llmResponse);
 *   console.log(artifact.explanation);
 *   if (artifact.artifact) {
 *     console.log(artifact.artifact.code);
 *   }
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.log('Validation failed:', error.errors);
 *   }
 * }
 * ```
 */
export function parseArtifactResponse(response: unknown): ArtifactResponse {
  return ArtifactResponseSchema.parse(response);
}

/**
 * Safely parse a raw LLM response without throwing.
 *
 * @param response - Raw JSON from the LLM
 * @returns SafeParseResult with success flag and data or error
 *
 * @example
 * ```typescript
 * const result = safeParseArtifactResponse(llmResponse);
 * if (result.success) {
 *   console.log(result.data.explanation);
 * } else {
 *   console.log('Validation errors:', result.error.errors);
 * }
 * ```
 */
export function safeParseArtifactResponse(response: unknown): z.SafeParseReturnType<unknown, ArtifactResponse> {
  return ArtifactResponseSchema.safeParse(response);
}

/**
 * Get validation error messages from a Zod error.
 *
 * @param error - ZodError from failed validation
 * @returns Array of human-readable error messages
 */
export function getValidationErrors(error: z.ZodError): string[] {
  return error.errors.map(e => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });
}
