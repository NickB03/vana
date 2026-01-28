/**
 * Citation Parser Utility
 *
 * Extracts and groups citation markers (e.g., [1][2][3]) from markdown text.
 * Part of Phase 2 for Issue #334 - Inline Citations feature.
 *
 * @module citationParser
 */

import type { CitationSource, CitationGroup } from '@/types/citation';

// Re-export types for consumers
export type { CitationSource, CitationGroup };

/**
 * Internal type for tracking citation marker positions during parsing
 */
export interface CitationMarker {
  position: number;
  citationNumbers: number[];
  startIndex: number;
  endIndex: number;
  rawText: string;
}

/**
 * Regular expression to match citation markers like [1], [2], [123]
 * Matches: [digits]
 * Does NOT match: [abc], [-1], [], [1.2]
 */
const CITATION_PATTERN = /\[(\d+)\]/g;

/**
 * Extracts all citation markers from text and groups consecutive citations.
 *
 * @param content - The markdown text to parse
 * @returns Array of citation marker groups with position information
 *
 * @example
 * extractCitations("AI has progressed [1][2][3] significantly")
 * // Returns: [{
 * //   position: 19,
 * //   citationNumbers: [1, 2, 3],
 * //   startIndex: 19,
 * //   endIndex: 28,
 * //   rawText: "[1][2][3]"
 * // }]
 */
export function extractCitations(content: string): CitationMarker[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const matches: Array<{ number: number; start: number; end: number; text: string }> = [];
  let match: RegExpExecArray | null;

  // Reset regex lastIndex to ensure clean state
  CITATION_PATTERN.lastIndex = 0;

  // Find all citation markers
  while ((match = CITATION_PATTERN.exec(content)) !== null) {
    const citationNumber = parseInt(match[1], 10);

    // Validate citation number (must be positive)
    if (citationNumber > 0) {
      matches.push({
        number: citationNumber,
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
  }

  if (matches.length === 0) {
    return [];
  }

  // Group consecutive citations
  return groupConsecutiveCitations(matches, content);
}

/**
 * Groups citation markers that appear consecutively (with only whitespace between them).
 *
 * @param matches - Array of individual citation matches
 * @param content - Original text (used to check for whitespace between citations)
 * @returns Array of grouped citation markers
 *
 * @internal
 */
export function groupConsecutiveCitations(
  matches: Array<{ number: number; start: number; end: number; text: string }>,
  content: string
): CitationMarker[] {
  if (matches.length === 0) {
    return [];
  }

  const groups: CitationMarker[] = [];
  let currentGroup: typeof matches = [matches[0]];

  for (let i = 1; i < matches.length; i++) {
    const prev = matches[i - 1];
    const curr = matches[i];

    // Check if there's only whitespace between previous and current citation
    const textBetween = content.slice(prev.end, curr.start);
    const isConsecutive = /^\s*$/.test(textBetween);

    if (isConsecutive) {
      // Add to current group
      currentGroup.push(curr);
    } else {
      // Finalize current group and start new one
      groups.push(createMarkerFromGroup(currentGroup));
      currentGroup = [curr];
    }
  }

  // Add the last group
  groups.push(createMarkerFromGroup(currentGroup));

  return groups;
}

/**
 * Creates a CitationMarker from a group of consecutive citation matches.
 *
 * @param group - Array of consecutive citation matches
 * @returns A single CitationMarker representing the group
 *
 * @internal
 */
function createMarkerFromGroup(
  group: Array<{ number: number; start: number; end: number; text: string }>
): CitationMarker {
  const citationNumbers = group.map(m => m.number);
  const startIndex = group[0].start;
  const endIndex = group[group.length - 1].end;
  const rawText = group.map(m => m.text).join('');

  return {
    position: startIndex,
    citationNumbers,
    startIndex,
    endIndex,
    rawText
  };
}

/**
 * Parses text and returns clean text plus ONE unified citation badge at the end.
 * All citation markers [1][2][3] are stripped from text and their sources are
 * combined into a single CitationGroup for carousel display.
 *
 * @param text - The text to parse
 * @param citationSources - Map of citation numbers to their source metadata
 * @returns Array with clean text and optional single CitationGroup at the end
 *
 * @example
 * const sources = new Map([[1, [{ citationNumber: 1, url: "...", title: "..." }]]]);
 * parseCitationMarkersInText("Text [1][2] more text [3]", sources)
 * // Returns: ["Text  more text ", { position: 0, citationNumbers: [1, 2, 3], sources: [...] }]
 */
export function parseCitationMarkersInText(
  text: string,
  citationSources: Map<number, CitationSource[]>
): (string | CitationGroup)[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const citations = extractCitations(text);

  if (citations.length === 0) {
    return [text];
  }

  // Collect all unique citation numbers from all markers
  const allCitationNumbers = new Set<number>();
  for (const citation of citations) {
    for (const num of citation.citationNumbers) {
      allCitationNumbers.add(num);
    }
  }

  // Strip all citation markers from text
  let cleanText = text;
  // Sort citations by position descending to avoid index shift issues
  const sortedCitations = [...citations].sort((a, b) => b.startIndex - a.startIndex);
  for (const citation of sortedCitations) {
    cleanText = cleanText.slice(0, citation.startIndex) + cleanText.slice(citation.endIndex);
  }

  // Clean up any double spaces left by removed citations (preserve newlines)
  cleanText = cleanText.replace(/ {2,}/g, ' ').trim();

  // Collect all sources for the unified badge
  const allSources: CitationSource[] = [];
  const sortedNumbers = Array.from(allCitationNumbers).sort((a, b) => a - b);

  for (const citationNumber of sortedNumbers) {
    const sourceList = citationSources.get(citationNumber);
    if (sourceList && sourceList.length > 0) {
      allSources.push(...sourceList);
    }
  }

  // If no valid sources found, just return clean text
  if (allSources.length === 0) {
    return [cleanText];
  }

  // Determine primary domain from first source
  let primaryDomain = 'Sources';
  if (allSources.length > 0) {
    try {
      const url = new URL(allSources[0].url);
      primaryDomain = url.hostname.replace(/^www\./, '');
    } catch {
      primaryDomain = 'Sources';
    }
  }

  // Create ONE unified citation group with all sources
  const unifiedGroup: CitationGroup = {
    position: 0,
    citationNumbers: sortedNumbers,
    sources: allSources,
    primaryDomain,
  };

  // Return clean text followed by the unified badge
  return [cleanText + ' ', unifiedGroup];
}

/**
 * Creates a CitationGroup from a CitationMarker by enriching it with source metadata.
 *
 * @param marker - The citation marker to convert
 * @param citationSources - Map of citation numbers to their source metadata
 * @returns A CitationGroup with sources and primary domain
 *
 * @internal
 */
function createCitationGroup(
  marker: CitationMarker,
  citationSources: Map<number, CitationSource[]>
): CitationGroup {
  // Collect all sources for this citation group
  const sources: CitationSource[] = [];

  for (const citationNumber of marker.citationNumbers) {
    const citationSourceList = citationSources.get(citationNumber);
    if (citationSourceList && citationSourceList.length > 0) {
      sources.push(...citationSourceList);
    }
  }

  // Determine primary domain from first source
  let primaryDomain = 'Unknown';
  if (sources.length > 0) {
    try {
      const firstUrl = sources[0].url;
      const url = new URL(firstUrl);
      primaryDomain = url.hostname.replace(/^www\./, '');
    } catch {
      // Invalid URL, use fallback
      primaryDomain = 'Unknown';
    }
  }

  return {
    position: marker.position,
    citationNumbers: marker.citationNumbers,
    sources,
    primaryDomain
  };
}

/**
 * Validates if a citation number exists in the sources map.
 * Useful for highlighting missing/broken citations.
 *
 * @param citationNumber - The citation number to validate
 * @param citationSources - Map of citation numbers to their sources
 * @returns True if the citation has associated sources
 */
export function isValidCitation(
  citationNumber: number,
  citationSources: Map<number, CitationSource[]>
): boolean {
  const sources = citationSources.get(citationNumber);
  return sources !== undefined && sources.length > 0;
}

/**
 * Extracts unique citation numbers from text (useful for prefetching sources).
 *
 * @param content - The text to parse
 * @returns Sorted array of unique citation numbers
 *
 * @example
 * getUniqueCitationNumbers("Text [1][2][1][3]") // Returns: [1, 2, 3]
 */
export function getUniqueCitationNumbers(content: string): number[] {
  const citations = extractCitations(content);
  const numbers = new Set<number>();

  for (const citation of citations) {
    for (const num of citation.citationNumbers) {
      numbers.add(num);
    }
  }

  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Strips all citation markers [N] from text and returns clean text + collected sources.
 * Designed for MESSAGE-LEVEL processing (one badge per entire message).
 *
 * @param content - The markdown text containing citation markers
 * @param citationSources - Map of citation numbers to their source metadata
 * @returns Object with cleanContent (markers removed) and allSources (aggregated sources)
 *
 * @example
 * const sources = new Map([[1, [{ citationNumber: 1, url: "...", title: "..." }]]]);
 * stripCitationMarkers("Text [1][2] more text [3]", sources)
 * // Returns: { cleanContent: "Text  more text ", allSources: [...], citationNumbers: [1, 2, 3] }
 */
export function stripCitationMarkers(
  content: string,
  citationSources: Map<number, CitationSource[]>
): { cleanContent: string; allSources: CitationSource[]; citationNumbers: number[] } {
  if (!content || typeof content !== 'string') {
    return { cleanContent: content || '', allSources: [], citationNumbers: [] };
  }

  const citations = extractCitations(content);

  if (citations.length === 0) {
    return { cleanContent: content, allSources: [], citationNumbers: [] };
  }

  // Collect all unique citation numbers
  const allCitationNumbers = new Set<number>();
  for (const citation of citations) {
    for (const num of citation.citationNumbers) {
      allCitationNumbers.add(num);
    }
  }

  // Strip all citation markers from text (process in reverse order to avoid index shift)
  let cleanContent = content;
  const sortedCitations = [...citations].sort((a, b) => b.startIndex - a.startIndex);
  for (const citation of sortedCitations) {
    cleanContent = cleanContent.slice(0, citation.startIndex) + cleanContent.slice(citation.endIndex);
  }

  // Clean up double spaces (preserve newlines for paragraph breaks)
  cleanContent = cleanContent.replace(/ {2,}/g, ' ');

  // Collect all sources in citation number order
  const sortedNumbers = Array.from(allCitationNumbers).sort((a, b) => a - b);
  const allSources: CitationSource[] = [];

  for (const citationNumber of sortedNumbers) {
    const sourceList = citationSources.get(citationNumber);
    if (sourceList && sourceList.length > 0) {
      allSources.push(...sourceList);
    }
  }

  return { cleanContent, allSources, citationNumbers: sortedNumbers };
}
