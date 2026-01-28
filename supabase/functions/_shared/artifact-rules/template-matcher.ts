/**
 * Template Matcher Stub
 *
 * This file is a minimal stub for the deleted artifact-rules template matching system.
 * The template matching was used to optimize prompts based on detected artifact types,
 * but this complexity was removed in the vanilla Sandpack refactor.
 *
 * Gemini 3 Flash handles artifact generation well without template-specific hints.
 */

export interface TemplateMatchResult {
  matched: boolean;
  templateId?: string;
  confidence?: number;
  reason?: string;
}

/**
 * Attempts to match a user message to an artifact template.
 * Stub: Always returns no match since template system was removed.
 */
export function getMatchingTemplate(_userMessage: string): TemplateMatchResult {
  return {
    matched: false,
    reason: 'template_system_removed',
    confidence: 0,
  };
}
