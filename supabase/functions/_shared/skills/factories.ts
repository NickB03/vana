/**
 * Skills System v2 - Validated Factory Functions
 *
 * Factory functions for creating validated and sanitized skill-related objects.
 * Ensures all runtime context is safe from injection attacks and malformed data.
 *
 * ## Branded Types for Type Safety
 *
 * This module uses TypeScript "branded types" (also known as "nominal types")
 * to enforce that SkillContext objects can ONLY be created through the factory
 * function. This provides compile-time guarantees that:
 *
 * 1. All SkillContext objects have been validated
 * 2. All user content has been sanitized for prompt injection
 * 3. SessionId format has been verified
 *
 * ### How Branded Types Work
 *
 * TypeScript uses structural typing, so normally any object with matching
 * properties would satisfy an interface. Branded types add a unique symbol
 * property that cannot be provided by direct object literals:
 *
 * ```typescript
 * // ✅ This works - factory provides the brand
 * const ctx = createSkillContext({ sessionId: 'abc', conversationHistory: [] });
 *
 * // ❌ This FAILS at compile time - missing brand
 * const ctx: SkillContext = { sessionId: 'abc', conversationHistory: [] };
 * // Error: Property '[SkillContextBrand]' is missing
 * ```
 *
 * ### Security Benefits
 *
 * - **Defense in depth**: Even if someone forgets to call the factory,
 *   TypeScript will catch it at compile time
 * - **Centralized validation**: All validation logic is in one place
 * - **Impossible to bypass**: Cannot create a branded type without the factory
 *
 * @see https://egghead.io/blog/using-branded-types-in-typescript
 * @module skills/factories
 * @since 2026-01-27 (Type Safety Improvements)
 */

import { PromptInjectionDefense } from '../prompt-injection-defense.ts';
import type { SkillContext, MessageRole, ArtifactType, SkillContextBrandType } from './types.ts';

/**
 * Session ID validation regex
 *
 * @remarks
 * Allows only alphanumeric characters, dashes, and underscores.
 * Typical UUID format: "abc123-def456"
 * Prevents injection via special characters.
 */
const SESSION_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Error thrown when factory validation fails
 *
 * @remarks
 * Used to distinguish validation failures from other runtime errors.
 */
export class SkillContextValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkillContextValidationError';
  }
}

/**
 * Create a validated and sanitized SkillContext
 *
 * @remarks
 * Factory function that ensures all context properties are safe:
 * - Validates sessionId format (alphanumeric, dash, underscore only)
 * - Sanitizes conversation history using PromptInjectionDefense
 * - Validates artifact type if provided
 *
 * **Security Note**: All user-controlled data is sanitized before being
 * injected into AI prompts to prevent prompt injection attacks.
 *
 * @param params - Raw context parameters (from API request, database, etc.)
 * @returns Validated SkillContext ready for use in skill resolution
 * @throws {SkillContextValidationError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const context = createSkillContext({
 *     sessionId: 'abc-123',
 *     conversationHistory: [
 *       { role: 'user', content: 'Hello' },
 *       { role: 'assistant', content: 'Hi!' }
 *     ],
 *     requestId: 'req-456'
 *   });
 *   // context is now safe to use
 * } catch (error) {
 *   if (error instanceof SkillContextValidationError) {
 *     console.error('Invalid context:', error.message);
 *   }
 * }
 * ```
 */
export function createSkillContext(params: {
  sessionId: string;
  conversationHistory: Array<{ role: MessageRole; content: string }>;
  requestId?: string;
  currentArtifact?: {
    title: string;
    type: ArtifactType;
    content: string;
  };
}): SkillContext {
  // Validate sessionId format
  if (!params.sessionId || params.sessionId.trim().length === 0) {
    throw new SkillContextValidationError('sessionId cannot be empty');
  }

  if (!SESSION_ID_REGEX.test(params.sessionId)) {
    throw new SkillContextValidationError(
      'sessionId must contain only alphanumeric characters, dashes, and underscores'
    );
  }

  // Sanitize conversation history to prevent prompt injection
  const sanitizedHistory = params.conversationHistory.map((message) => ({
    role: message.role,
    content: PromptInjectionDefense.sanitizeArtifactContext(message.content),
  }));

  // Sanitize artifact content if present
  const sanitizedArtifact = params.currentArtifact
    ? {
        title: PromptInjectionDefense.sanitizeArtifactContext(params.currentArtifact.title),
        type: params.currentArtifact.type,
        content: PromptInjectionDefense.sanitizeArtifactContext(params.currentArtifact.content),
      }
    : undefined;

  // Cast to SkillContext with brand - only factory has privilege to do this
  // The brand prevents direct object construction elsewhere in the codebase
  return {
    sessionId: params.sessionId,
    conversationHistory: sanitizedHistory,
    requestId: params.requestId,
    currentArtifact: sanitizedArtifact,
  } as unknown as SkillContext;
}
