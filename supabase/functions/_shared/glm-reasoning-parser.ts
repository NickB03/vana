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
  type ReasoningStep,
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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is a section header
    const isNumberedStep = /^(\d+\.|Step\s+\d+:?|\d+\))\s+/i.test(line);
    // Enhanced header detection:
    // 1. Ends with colon (original)
    // 2. Wrapped in bold (**Title**)
    // 3. Markdown header (### Title)
    const isColonHeader = line.endsWith(':') && line.length < 100;
    const isBoldHeader = /^\*\*.*\*\*$/.test(line) && line.length < 100;
    const isMarkdownHeader = /^#{1,6}\s+/.test(line) && line.length < 100;

    const isHeader = isColonHeader || isBoldHeader || isMarkdownHeader;
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
        // Clean up header formatting
        title = line
          .replace(/:+$/, '')           // Remove trailing colons
          .replace(/^\*\*|\*\*$/g, '')  // Remove bold markers
          .replace(/^#{1,6}\s+/, '')    // Remove markdown header markers
          .trim();
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
    /^[-*•]\s*(no|do not|don't|must not|avoid)/i,  // Bullet points with negative instructions
    /<!DOCTYPE|<html|<head|<body|<script/i,  // HTML document structure references
    /<[a-z]+>/i,  // HTML tag patterns
    /^(no|do not|don't|must not|avoid|never)\s+/i,  // Negative instruction starters
    /^(include|exclude|use|return|wrap|add)\s+/i,  // Code instruction patterns
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

  // Relaxed limit: Allow up to 120 chars (was 60) to capture full context
  if (title.length > 120) {
    title = title.substring(0, 117) + '...';
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title;
}

/**
 * Generate a concise summary from all sections
 * Returns undefined if no sections are provided (optional field)
 */
function generateSummary(sections: ReasoningSection[]): string | undefined {
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

// ============================================================================
// INCREMENTAL PARSING - Claude-like streaming support
// ============================================================================
// These functions enable progressive step detection as GLM streams reasoning.
// Instead of waiting for complete reasoning text, we detect new steps as they
// appear and emit them one-by-one, similar to Claude's extended thinking UX.
// ============================================================================

/**
 * State for incremental reasoning parsing
 * Tracks what we've already emitted to detect new steps
 */
export interface IncrementalParseState {
  /** Number of complete steps already detected and emitted */
  emittedStepCount: number;
  /** Last known text length to detect substantial changes */
  lastTextLength: number;
  /** Minimum chars between re-parse attempts (debounce) */
  minCharsForReparse: number;
}

/**
 * Result from incremental parsing
 */
export interface IncrementalParseResult {
  /** Newly detected step (if any) */
  newStep: ReasoningStep | null;
  /** Updated state for next parse */
  state: IncrementalParseState;
  /** Current thinking summary for display (last line or current section title) */
  currentThinking: string;
}

/**
 * Create initial state for incremental parsing
 */
export function createIncrementalParseState(): IncrementalParseState {
  return {
    emittedStepCount: 0,
    lastTextLength: 0,
    minCharsForReparse: 100, // Don't re-parse too frequently
  };
}

/**
 * Parse reasoning incrementally to detect new steps as they stream in
 *
 * This is the key function for Claude-like streaming. Instead of showing
 * raw reasoning text, we detect structured steps as they become complete
 * and emit them one-by-one.
 *
 * Strategy:
 * 1. Skip parsing if text hasn't grown enough (debounce)
 * 2. Extract all sections from current text
 * 3. If we have more complete sections than before, emit the new one
 * 4. Return current thinking summary for the streaming pill display
 *
 * @param currentText - Full accumulated reasoning text so far
 * @param state - Previous parse state
 * @returns New step if detected, updated state, and current thinking text
 *
 * @example
 * ```typescript
 * let state = createIncrementalParseState();
 *
 * onReasoningChunk((chunk) => {
 *   fullReasoning += chunk;
 *   const result = parseReasoningIncrementally(fullReasoning, state);
 *   state = result.state;
 *
 *   if (result.newStep) {
 *     sendEvent("reasoning_step", result.newStep);
 *   }
 *   // Update UI with result.currentThinking
 * });
 * ```
 */
export function parseReasoningIncrementally(
  currentText: string,
  state: IncrementalParseState
): IncrementalParseResult {
  const textLength = currentText.length;

  // Debounce: skip if text hasn't grown enough since last parse
  const textGrowth = textLength - state.lastTextLength;
  if (textGrowth < state.minCharsForReparse && state.emittedStepCount > 0) {
    return {
      newStep: null,
      state,
      currentThinking: extractCurrentThinking(currentText),
    };
  }

  // Parse current text into sections
  const trimmed = currentText.trim();
  if (trimmed.length === 0) {
    return {
      newStep: null,
      state,
      currentThinking: 'Thinking...',
    };
  }

  try {
    const sections = extractSectionsPublic(trimmed);

    // Check if we have a new complete section
    // A section is "complete" if:
    // 1. There's another section after it, OR
    // 2. It has at least one item/substantial content
    const completeCount = countCompleteSections(sections);

    if (completeCount > state.emittedStepCount) {
      // New complete section detected!
      const newSectionIndex = state.emittedStepCount;
      const section = sections[newSectionIndex];

      // Convert to ReasoningStep
      const phase = inferPhasePublic(section, newSectionIndex, Math.max(completeCount, 3));
      const icon = getIconForPhasePublic(phase);
      const title = generateTitlePublic(section, phase);

      // CRITICAL: Ensure items array is NEVER empty - Zod schema requires min(1)
      // If both items and rawText are empty, use the title as a fallback item
      // This prevents validation failure that causes the "flashing" fallback path
      let stepItems: string[];
      if (section.items.length > 0) {
        stepItems = section.items;
      } else if (section.rawText.trim().length > 0) {
        stepItems = [section.rawText.trim()];
      } else {
        // Ultimate fallback: use the title so we always have at least one item
        stepItems = [title || 'Processing...'];
      }

      const newStep: ReasoningStep = {
        phase,
        title,
        icon,
        items: stepItems,
        timestamp: Date.now(),
      };

      console.log(`[GLM Incremental] New step ${newSectionIndex + 1}: "${title}"`);

      return {
        newStep,
        state: {
          ...state,
          emittedStepCount: state.emittedStepCount + 1,
          lastTextLength: textLength,
        },
        currentThinking: title,
      };
    }

    // No new complete section, but update current thinking
    const currentThinking = sections.length > 0
      ? sections[sections.length - 1].title || extractCurrentThinking(currentText)
      : extractCurrentThinking(currentText);

    return {
      newStep: null,
      state: {
        ...state,
        lastTextLength: textLength,
      },
      currentThinking,
    };

  } catch (error) {
    console.warn('[GLM Incremental] Parse error:', error);
    return {
      newStep: null,
      state,
      currentThinking: extractCurrentThinking(currentText),
    };
  }
}

/**
 * Count sections that appear "complete" (have content or are followed by another section)
 */
function countCompleteSections(sections: ReasoningSection[]): number {
  if (sections.length === 0) return 0;

  let completeCount = 0;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const hasFollowingSection = i < sections.length - 1;
    const hasSubstantialContent =
      section.items.length > 0 ||
      (section.rawText && section.rawText.length > 50);

    // A section is complete if there's another section after it,
    // OR it has substantial content
    if (hasFollowingSection || hasSubstantialContent) {
      completeCount++;
    }
  }

  return completeCount;
}

/**
 * Extract a brief current thinking summary from the end of the text
 * Used when no structured section is being worked on
 *
 * IMPORTANT: This should return short, human-readable summaries like:
 * - "Analyzing request"
 * - "Planning component structure"
 * - "Processing..."
 *
 * NOT raw content like:
 * - "{ id: 10, name: 'Tuna'..."
 * - "<artifact type=..."
 * - "const foods = [..."
 */
function extractCurrentThinking(text: string): string {
  const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return 'Thinking...';

  // Get last non-empty line
  let lastLine = lines[lines.length - 1].trim();

  // Clean up common prefixes
  lastLine = lastLine.replace(/^(\d+\.|Step\s+\d+:?|\d+\))\s*/i, '');
  lastLine = lastLine.replace(/^[-*•]\s*/, '');

  // STRICT FILTERING: Return generic text if line looks like code/data/instructions
  // Check for JSON objects/arrays, HTML/XML tags, code patterns, and instruction text
  const looksLikeCode =
    /^[{<[]/.test(lastLine) ||            // JSON/HTML/array start
    /^["'`]/.test(lastLine) ||            // String literals
    /^(const|let|var|function|import|export|return)\s/.test(lastLine) || // JS keywords
    /^\w+\s*[:=]\s*/.test(lastLine) ||    // Variable assignments
    /^(id|name|type|value|data):/i.test(lastLine) || // Property definitions
    /{.*}/.test(lastLine) ||              // Inline JSON
    /\[.*\]/.test(lastLine) ||            // Inline arrays
    /^\d+[,}]/.test(lastLine);            // Numeric data

  // Filter out instruction-like text (validation messages, requirements)
  const looksLikeInstruction =
    /<!DOCTYPE|<html|<head|<body|<script/i.test(lastLine) ||  // HTML doc structure refs
    /<[a-z]+>/i.test(lastLine) ||                              // HTML tag patterns
    /^(no|do not|don't|must not|avoid|never)\s+/i.test(lastLine) || // Negative instructions
    /^(include|exclude|use|return|wrap|add)\s+/i.test(lastLine) ||  // Code instructions
    /^(critical|important|note|warning):/i.test(lastLine);         // Alert prefixes

  if (looksLikeCode || looksLikeInstruction) {
    return 'Processing...';
  }

  // If too short, provide generic thinking
  if (lastLine.length < 5) {
    return 'Processing...';
  }

  // Relaxed limit: Allow up to 120 chars (was 50)
  // If longer, try to extract the first sentence
  if (lastLine.length > 120) {
    // Try to split by sentence boundary
    const sentenceMatch = lastLine.match(/^(.+?)[.!?]\s/);
    if (sentenceMatch && sentenceMatch[1].length < 120) {
      return sentenceMatch[1];
    }
    // Fallback to truncation
    lastLine = lastLine.substring(0, 117) + '...';
  }

  return lastLine || 'Thinking...';
}

// ============================================================================
// Public wrappers for private functions (needed for incremental parsing)
// ============================================================================

/**
 * Public wrapper for extractSections
 */
export function extractSectionsPublic(text: string): ReasoningSection[] {
  return extractSections(text);
}

/**
 * Public wrapper for inferPhase
 */
export function inferPhasePublic(
  section: ReasoningSection,
  index: number,
  totalSections: number
): ReasoningPhase {
  return inferPhase(section, index, totalSections);
}

/**
 * Public wrapper for getIconForPhase
 */
export function getIconForPhasePublic(phase: ReasoningPhase): ReasoningIcon {
  return getIconForPhase(phase);
}

/**
 * Public wrapper for generateTitle
 */
export function generateTitlePublic(section: ReasoningSection, phase: ReasoningPhase): string {
  return generateTitle(section, phase);
}

// Export ReasoningSection type for external use
export type { ReasoningSection };
