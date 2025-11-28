/**
 * GLM Reasoning Parser - Convert GLM's raw reasoning text to structured format
 *
 * GLM-4.6 returns `reasoning_content` as free-form text representing the model's
 * thinking process. This parser intelligently converts that raw text into the
 * app's StructuredReasoning format with organized steps and phases.
 *
 * Features:
 * - Detects numbered steps, section headers, and bullet points
 * - Maps content to appropriate phases (research, analysis, solution)
 * - Generates meaningful titles for each section
 * - Graceful fallback to single "Thinking" section if parsing fails
 * - Validates output against StructuredReasoning schema
 *
 * @module glm-reasoning-parser
 * @since 2025-11-27
 */

import {
  type StructuredReasoning,
  type ReasoningPhase,
  type ReasoningIcon,
  validateReasoningSteps,
} from './reasoning-generator.ts';

/**
 * Section detected in raw reasoning text
 */
interface ReasoningSection {
  title: string;
  items: string[];
  rawText: string;
  lineStart: number;
  lineEnd: number;
}

/**
 * Parse GLM's raw reasoning text into structured format
 *
 * Intelligently analyzes the free-form reasoning text to identify:
 * - Numbered steps (1., 2., Step 1:, etc.)
 * - Section headers (lines ending with :)
 * - Bullet points (-, *, •)
 * - Paragraph breaks as section dividers
 *
 * Maps sections to appropriate phases and generates meaningful titles.
 * Falls back gracefully to a single "Thinking" section if parsing fails.
 *
 * @param rawReasoning - Free-form reasoning text from GLM API
 * @returns Structured reasoning with steps and phases, or null if input is invalid
 *
 * @example
 * ```typescript
 * const reasoning = parseGLMReasoningToStructured(reasoningContent);
 * if (reasoning) {
 *   // Use structured reasoning in UI
 *   console.log(`Generated ${reasoning.steps.length} reasoning steps`);
 * }
 * ```
 */
export function parseGLMReasoningToStructured(
  rawReasoning: string
): StructuredReasoning | null {
  // Validate input
  if (!rawReasoning || typeof rawReasoning !== 'string') {
    console.warn('[GLM Parser] Invalid input: reasoning must be a non-empty string');
    return null;
  }

  const trimmed = rawReasoning.trim();
  if (trimmed.length === 0) {
    console.warn('[GLM Parser] Empty reasoning text');
    return null;
  }

  console.log(`[GLM Parser] Parsing ${trimmed.length} characters of reasoning text`);

  try {
    // Try to parse into sections
    const sections = extractSections(trimmed);

    if (sections.length === 0) {
      console.log('[GLM Parser] No sections detected, using fallback');
      return createFallbackReasoning(trimmed);
    }

    // Convert sections to reasoning steps
    const steps = sections.map((section, index) => {
      const phase = inferPhase(section, index, sections.length);
      const icon = getIconForPhase(phase);
      const title = generateTitle(section, phase);

      return {
        phase,
        title,
        icon,
        items: section.items.length > 0 ? section.items : [section.rawText.trim()],
      };
    });

    const reasoning: StructuredReasoning = {
      steps,
      summary: generateSummary(sections),
    };

    // Validate the structured output
    validateReasoningSteps(reasoning);

    console.log(`[GLM Parser] Successfully parsed ${steps.length} reasoning steps`);

    return reasoning;
  } catch (error) {
    console.error('[GLM Parser] Parsing failed, using fallback:', error);
    return createFallbackReasoning(trimmed);
  }
}

/**
 * Extract sections from raw reasoning text
 *
 * Identifies sections using multiple heuristics:
 * - Numbered steps (1., 2., Step 1:)
 * - Headers (lines ending with :)
 * - Double line breaks (paragraph boundaries)
 * - Bullet points (-, *, •)
 */
function extractSections(text: string): ReasoningSection[] {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const sections: ReasoningSection[] = [];

  let currentSection: Partial<ReasoningSection> | null = null;
  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is a section header
    const isNumberedStep = /^(\d+\.|Step\s+\d+:?|\d+\))\s+/i.test(line);
    const isHeader = line.endsWith(':') && line.length < 100;
    const isBulletPoint = /^[-*•]\s+/.test(line);

    if (isNumberedStep || isHeader) {
      // Start new section
      if (currentSection && currentSection.items && currentSection.items.length > 0) {
        sections.push({
          title: currentSection.title || '',
          items: currentSection.items,
          rawText: currentSection.rawText || '',
          lineStart: currentSection.lineStart || 0,
          lineEnd: i - 1,
        });
      }

      // Extract title
      let title = line;
      if (isNumberedStep) {
        title = line.replace(/^(\d+\.|Step\s+\d+:?|\d+\))\s+/i, '').trim();
      } else if (isHeader) {
        title = line.replace(/:+$/, '').trim();
      }

      currentSection = {
        title,
        items: [],
        rawText: '',
        lineStart: i,
      };

      // If numbered step has content on same line, don't add it as item yet
      if (!isHeader && title.length > 0) {
        currentSection.rawText = title;
      }
    } else if (currentSection) {
      // Add to current section
      if (isBulletPoint) {
        // Extract bullet point content
        const item = line.replace(/^[-*•]\s+/, '').trim();
        if (item.length > 0) {
          currentSection.items!.push(item);
        }
      } else {
        // Regular line - add as item or append to raw text
        if (line.length > 0) {
          if (currentSection.items!.length === 0 && currentSection.rawText) {
            currentSection.rawText += ' ' + line;
          } else {
            currentSection.items!.push(line);
          }
        }
      }
    } else {
      // No current section - start one with this line
      currentSection = {
        title: line.length < 100 ? line : 'Analyzing request',
        items: line.length >= 100 ? [line] : [],
        rawText: line.length < 100 ? line : '',
        lineStart: i,
      };
    }

    lineIndex++;
  }

  // Add final section
  if (currentSection && (currentSection.items!.length > 0 || currentSection.rawText)) {
    sections.push({
      title: currentSection.title || '',
      items: currentSection.items || [],
      rawText: currentSection.rawText || '',
      lineStart: currentSection.lineStart || 0,
      lineEnd: lines.length - 1,
    });
  }

  // If no sections were detected, try to split by double newlines
  if (sections.length === 0) {
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    return paragraphs.map((paragraph, index) => {
      const lines = paragraph.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      return {
        title: lines[0].length < 100 ? lines[0] : `Section ${index + 1}`,
        items: lines.slice(1).filter(l => l.length > 0),
        rawText: paragraph.trim(),
        lineStart: index,
        lineEnd: index,
      };
    });
  }

  console.log(`[GLM Parser] Extracted ${sections.length} sections from reasoning text`);

  return sections;
}

/**
 * Infer the appropriate phase for a section based on its position and content
 */
function inferPhase(
  section: ReasoningSection,
  index: number,
  totalSections: number
): ReasoningPhase {
  const text = (section.title + ' ' + section.rawText).toLowerCase();

  // Check for explicit phase keywords
  if (
    text.includes('research') ||
    text.includes('analyzing') ||
    text.includes('understanding') ||
    text.includes('examining') ||
    text.includes('investigating') ||
    text.includes('exploring')
  ) {
    return 'research';
  }

  if (
    text.includes('analysis') ||
    text.includes('evaluating') ||
    text.includes('considering') ||
    text.includes('comparing') ||
    text.includes('assessing') ||
    text.includes('planning')
  ) {
    return 'analysis';
  }

  if (
    text.includes('solution') ||
    text.includes('implementing') ||
    text.includes('creating') ||
    text.includes('building') ||
    text.includes('generating') ||
    text.includes('proposing')
  ) {
    return 'solution';
  }

  // Fallback to position-based inference
  const position = index / Math.max(1, totalSections - 1);

  if (position < 0.33) {
    return 'research';
  } else if (position < 0.67) {
    return 'analysis';
  } else {
    return 'solution';
  }
}

/**
 * Get appropriate icon for a phase
 */
function getIconForPhase(phase: ReasoningPhase): ReasoningIcon {
  const iconMap: Record<ReasoningPhase, ReasoningIcon> = {
    research: 'search',
    analysis: 'lightbulb',
    solution: 'target',
    custom: 'sparkles',
  };

  return iconMap[phase];
}

/**
 * Generate a user-friendly title for a section
 *
 * Ensures titles are:
 * - Present tense with action verbs
 * - 15-50 characters
 * - Clear and scannable
 * - Not generic technical phrases
 */
function generateTitle(section: ReasoningSection, phase: ReasoningPhase): string {
  let title = section.title.trim();

  // Patterns that indicate a poor title (too generic or not an action)
  const poorTitlePatterns = [
    /^pure\s+(jsx|react|code|html|css)/i,
    /^(the|a|an)\s+/i,
    /^(jsx|react|code|html|css|component|artifact)/i,
    /^(output|result|answer|response)/i,
    /^(yes|no|okay|sure)/i,
    /^[<{[]/,  // Starts with code characters
  ];

  const isPoorTitle = !title ||
    title.length > 80 ||
    title.length < 5 ||
    poorTitlePatterns.some(pattern => pattern.test(title));

  // If title is poor, generate a meaningful one based on phase
  if (isPoorTitle) {
    const titleMap: Record<ReasoningPhase, string> = {
      research: 'Analyzing requirements',
      analysis: 'Planning implementation',
      solution: 'Building the solution',
      custom: 'Processing request',
    };
    title = titleMap[phase];
  }

  // Remove common prefixes
  title = title.replace(/^(Step\s+\d+:?\s*|Section\s+\d+:?\s*)/i, '');

  // Ensure it starts with an action verb for better UX
  const actionVerbs = ['analyzing', 'planning', 'building', 'creating', 'designing', 'implementing', 'generating', 'evaluating', 'considering', 'processing'];
  const startsWithAction = actionVerbs.some(verb => title.toLowerCase().startsWith(verb));

  // If doesn't start with action and is short, add context
  if (!startsWithAction && title.length < 25) {
    const prefix = phase === 'research' ? 'Analyzing' :
                   phase === 'analysis' ? 'Planning' :
                   phase === 'solution' ? 'Building' : 'Processing';
    // Only add prefix if it doesn't make title redundant
    if (!title.toLowerCase().includes(prefix.toLowerCase())) {
      title = `${prefix}: ${title}`;
    }
  }

  // Ensure minimum length by adding phase context
  if (title.length < 10) {
    const fallbackMap: Record<ReasoningPhase, string> = {
      research: 'Analyzing the request',
      analysis: 'Planning the approach',
      solution: 'Implementing the solution',
      custom: 'Processing the task',
    };
    title = fallbackMap[phase];
  }

  // Trim to reasonable length
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title;
}

/**
 * Generate a concise summary from all sections
 */
function generateSummary(sections: ReasoningSection[]): string {
  if (sections.length === 0) {
    return undefined;
  }

  // Use the last section's first item or raw text as summary
  const lastSection = sections[sections.length - 1];
  let summary = lastSection.items[0] || lastSection.rawText || lastSection.title;

  // Trim to reasonable length
  if (summary.length > 150) {
    summary = summary.substring(0, 147) + '...';
  }

  return summary || undefined;
}

/**
 * Create fallback reasoning when parsing fails or text is unstructured
 */
function createFallbackReasoning(rawText: string): StructuredReasoning {
  // Split into sentences or paragraphs for better readability
  const chunks = rawText.split(/[.!?]\s+|\n\s*\n/).filter(chunk => chunk.trim().length > 0);

  const items = chunks
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)
    .slice(0, 10); // Limit to 10 items max

  return {
    steps: [
      {
        phase: 'custom',
        title: 'Model reasoning',
        icon: 'sparkles',
        items: items.length > 0 ? items : [rawText.substring(0, 500)],
      },
    ],
    summary: rawText.length > 150 ? rawText.substring(0, 147) + '...' : rawText,
  };
}
