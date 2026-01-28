/**
 * Test Suite for Citation Parser Utility
 *
 * Tests extraction and grouping of citation markers like [1][2][3]
 * Part of Phase 2 for Issue #334 - Inline Citations feature.
 */

import { describe, it, expect } from 'vitest';
import {
  extractCitations,
  groupConsecutiveCitations,
  parseCitationMarkersInText,
  isValidCitation,
  getUniqueCitationNumbers
} from '../citationParser';

// Mock citation sources for testing
interface CitationSource {
  citationNumber: number;
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  relevanceScore?: number;
}

describe('extractCitations', () => {
  describe('basic functionality', () => {
    it('should extract single citation', () => {
      const result = extractCitations('AI has evolved [1] over time');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1]);
      expect(result[0].position).toBe(15);
      expect(result[0].rawText).toBe('[1]');
    });

    it('should extract multiple consecutive citations', () => {
      const result = extractCitations('AI has progressed [1][2][3] significantly');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1, 2, 3]);
      expect(result[0].position).toBe(18);
      expect(result[0].startIndex).toBe(18);
      expect(result[0].endIndex).toBe(27); // After [3]
      expect(result[0].rawText).toBe('[1][2][3]');
    });

    it('should extract multiple groups of citations', () => {
      const result = extractCitations('First [1][2] and second [3][4] groups');
      expect(result).toHaveLength(2);

      expect(result[0].citationNumbers).toEqual([1, 2]);
      expect(result[0].position).toBe(6);

      expect(result[1].citationNumbers).toEqual([3, 4]);
      expect(result[1].position).toBe(24);
    });
  });

  describe('edge cases - position in text', () => {
    it('should handle citation at start of text', () => {
      const result = extractCitations('[1] This starts with a citation');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1]);
      expect(result[0].position).toBe(0);
    });

    it('should handle citation at end of text', () => {
      const result = extractCitations('This ends with a citation [1]');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1]);
      expect(result[0].position).toBe(26);
    });

    it('should handle citation as entire text', () => {
      const result = extractCitations('[1][2][3]');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1, 2, 3]);
      expect(result[0].position).toBe(0);
      expect(result[0].endIndex).toBe(9);
    });
  });

  describe('edge cases - whitespace handling', () => {
    it('should group citations with spaces between them', () => {
      const result = extractCitations('Text [1] [2] [3] more');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1, 2, 3]);
    });

    it('should group citations with tabs and newlines', () => {
      const result = extractCitations('Text [1]\t[2]\n[3] more');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1, 2, 3]);
    });

    it('should not group citations with text between them', () => {
      const result = extractCitations('Text [1] word [2] more');
      expect(result).toHaveLength(2);
      expect(result[0].citationNumbers).toEqual([1]);
      expect(result[1].citationNumbers).toEqual([2]);
    });
  });

  describe('edge cases - invalid input', () => {
    it('should return empty array for no citations', () => {
      const result = extractCitations('No citations here');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = extractCitations('');
      expect(result).toEqual([]);
    });

    it('should ignore non-numeric brackets', () => {
      const result = extractCitations('Invalid [abc] [xyz] citations');
      expect(result).toEqual([]);
    });

    it('should ignore negative numbers', () => {
      const result = extractCitations('Invalid [-1] citation');
      expect(result).toEqual([]);
    });

    it('should ignore empty brackets', () => {
      const result = extractCitations('Invalid [] citation');
      expect(result).toEqual([]);
    });

    it('should ignore decimal numbers', () => {
      const result = extractCitations('Invalid [1.2] citation');
      expect(result).toEqual([]);
    });

    it('should handle mixed valid and invalid citations', () => {
      const result = extractCitations('Valid [1] invalid [abc] valid [2]');
      expect(result).toHaveLength(2);
      expect(result[0].citationNumbers).toEqual([1]);
      expect(result[1].citationNumbers).toEqual([2]);
    });
  });

  describe('edge cases - large numbers', () => {
    it('should handle large citation numbers', () => {
      const result = extractCitations('Large [999] citation');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([999]);
    });

    it('should handle very large citation numbers', () => {
      const result = extractCitations('Very large [123456] citation');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([123456]);
    });
  });

  describe('edge cases - special characters', () => {
    it('should not be confused by square brackets in URLs', () => {
      const result = extractCitations('Link [text](url) and citation [1]');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1]);
    });

    it('should handle brackets in different contexts', () => {
      const result = extractCitations('Array[0] and citation [1] and code[x]');
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1]);
    });
  });
});

describe('groupConsecutiveCitations', () => {
  it('should group consecutive citations', () => {
    const matches = [
      { number: 1, start: 0, end: 3, text: '[1]' },
      { number: 2, start: 3, end: 6, text: '[2]' },
      { number: 3, start: 6, end: 9, text: '[3]' }
    ];
    const result = groupConsecutiveCitations(matches, '[1][2][3]');
    expect(result).toHaveLength(1);
    expect(result[0].citationNumbers).toEqual([1, 2, 3]);
  });

  it('should separate non-consecutive citations', () => {
    const matches = [
      { number: 1, start: 0, end: 3, text: '[1]' },
      { number: 2, start: 9, end: 12, text: '[2]' }
    ];
    const result = groupConsecutiveCitations(matches, '[1] text [2]');
    expect(result).toHaveLength(2);
    expect(result[0].citationNumbers).toEqual([1]);
    expect(result[1].citationNumbers).toEqual([2]);
  });

  it('should handle empty matches array', () => {
    const result = groupConsecutiveCitations([], '');
    expect(result).toEqual([]);
  });

  it('should handle single match', () => {
    const matches = [{ number: 1, start: 0, end: 3, text: '[1]' }];
    const result = groupConsecutiveCitations(matches, '[1]');
    expect(result).toHaveLength(1);
    expect(result[0].citationNumbers).toEqual([1]);
  });
});

describe('parseCitationMarkersInText', () => {
  const mockSources = new Map<number, CitationSource[]>([
    [1, [{ citationNumber: 1, title: 'Source 1', url: 'https://example.com/1', snippet: 'Snippet 1' }]],
    [2, [{ citationNumber: 2, title: 'Source 2', url: 'https://example.com/2', snippet: 'Snippet 2' }]],
    [3, [{ citationNumber: 3, title: 'Source 3', url: 'https://test.org/3', snippet: 'Snippet 3' }]]
  ]);

  it('should parse text with citations into unified badge format', () => {
    // New architecture: strips citations and returns [cleanText, unifiedGroup]
    const result = parseCitationMarkersInText('Text [1][2] more text', mockSources);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Text more text '); // Clean text with citations stripped
    expect(typeof result[1]).toBe('object'); // Unified citation group
  });

  it('should create citation groups with sources', () => {
    const result = parseCitationMarkersInText('Text [1][2] more', mockSources);
    const citationGroup = result[1] as any; // CitationGroup type
    expect(citationGroup.citationNumbers).toEqual([1, 2]);
    expect(citationGroup.sources).toHaveLength(2);
    expect(citationGroup.sources[0].title).toBe('Source 1');
    expect(citationGroup.primaryDomain).toBe('example.com');
  });

  it('should extract primary domain from first source', () => {
    const result = parseCitationMarkersInText('Text [3]', mockSources);
    const citationGroup = result[1] as any;
    expect(citationGroup.primaryDomain).toBe('test.org');
  });

  it('should handle www prefix in domain', () => {
    const sourcesWithWww = new Map<number, CitationSource[]>([
      [1, [{ citationNumber: 1, title: 'Source', url: 'https://www.example.com/page', snippet: 'Text' }]]
    ]);
    const result = parseCitationMarkersInText('Text [1]', sourcesWithWww);
    const citationGroup = result[1] as any;
    expect(citationGroup.primaryDomain).toBe('example.com');
  });

  it('should handle missing sources gracefully', () => {
    // When citation has no sources, function returns just clean text (no badge)
    const result = parseCitationMarkersInText('Text [99]', mockSources);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Text'); // Clean text only, no badge
  });

  it('should handle invalid URLs gracefully', () => {
    const invalidUrlSources = new Map<number, CitationSource[]>([
      [1, [{ citationNumber: 1, title: 'Source', url: 'not-a-valid-url', snippet: 'Text' }]]
    ]);
    const result = parseCitationMarkersInText('Text [1]', invalidUrlSources);
    const citationGroup = result[1] as any;
    expect(citationGroup.primaryDomain).toBe('Sources'); // Fallback for invalid URLs
  });

  it('should return text only when no citations present', () => {
    const result = parseCitationMarkersInText('No citations here', mockSources);
    expect(result).toEqual(['No citations here']);
  });

  it('should handle citation at start', () => {
    // New architecture: clean text first, unified badge at end
    const result = parseCitationMarkersInText('[1] Text after', mockSources);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Text after '); // Clean text (leading space stripped)
    expect(typeof result[1]).toBe('object'); // Unified badge at end
  });

  it('should handle citation at end', () => {
    const result = parseCitationMarkersInText('Text before [1]', mockSources);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Text before ');
    expect(typeof result[1]).toBe('object');
  });

  it('should handle empty string', () => {
    const result = parseCitationMarkersInText('', mockSources);
    expect(result).toEqual([]);
  });

  it('should aggregate all citations into unified badge', () => {
    // New architecture: ALL citations aggregated into ONE badge at end
    const result = parseCitationMarkersInText('First [1] middle [2][3] end', mockSources);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('First middle end '); // All citations stripped
    const citationGroup = result[1] as any;
    expect(citationGroup.citationNumbers).toEqual([1, 2, 3]); // All sources combined
    expect(citationGroup.sources).toHaveLength(3);
  });
});

describe('isValidCitation', () => {
  const mockSources = new Map<number, CitationSource[]>([
    [1, [{ citationNumber: 1, title: 'Source 1', url: 'https://example.com', snippet: 'Text' }]],
    [2, []]
  ]);

  it('should return true for valid citation with sources', () => {
    expect(isValidCitation(1, mockSources)).toBe(true);
  });

  it('should return false for citation with empty sources array', () => {
    expect(isValidCitation(2, mockSources)).toBe(false);
  });

  it('should return false for citation not in map', () => {
    expect(isValidCitation(99, mockSources)).toBe(false);
  });

  it('should return false for undefined sources', () => {
    expect(isValidCitation(3, new Map())).toBe(false);
  });
});

describe('getUniqueCitationNumbers', () => {
  it('should extract unique citation numbers', () => {
    const result = getUniqueCitationNumbers('Text [1][2][1][3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should sort citation numbers', () => {
    const result = getUniqueCitationNumbers('Text [3][1][2]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle no citations', () => {
    const result = getUniqueCitationNumbers('No citations');
    expect(result).toEqual([]);
  });

  it('should handle duplicates in different groups', () => {
    const result = getUniqueCitationNumbers('[1][2] text [2][3] more [1]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should handle large numbers', () => {
    const result = getUniqueCitationNumbers('[100][1][50]');
    expect(result).toEqual([1, 50, 100]);
  });
});

describe('integration tests', () => {
  it('should correctly parse complex markdown with multiple citation patterns', () => {
    const text = `
# Research Paper

AI has evolved significantly [1][2] over the past decade.
Recent breakthroughs [3] have shown promise.

Multiple studies [4][5][6] confirm this trend [7].
    `.trim();

    const citations = extractCitations(text);

    // Should have 3 groups: [1][2], [3], [4][5][6] and [7]
    expect(citations).toHaveLength(4);
    expect(citations[0].citationNumbers).toEqual([1, 2]);
    expect(citations[1].citationNumbers).toEqual([3]);
    expect(citations[2].citationNumbers).toEqual([4, 5, 6]);
    expect(citations[3].citationNumbers).toEqual([7]);
  });

  it('should handle real-world markdown with code blocks', () => {
    const text = `
Research shows [1] that code like:

\`\`\`javascript
const arr = [1, 2, 3];
\`\`\`

produces different results [2][3].
    `.trim();

    const citations = extractCitations(text);

    // Should only extract [1] and [2][3], not [1, 2, 3] from code
    expect(citations).toHaveLength(2);
    expect(citations[0].citationNumbers).toEqual([1]);
    expect(citations[1].citationNumbers).toEqual([2, 3]);
  });

  it('should maintain position accuracy across complex text', () => {
    const text = 'Start [1][2] middle [3] end';
    const citations = extractCitations(text);

    expect(citations[0].position).toBe(6);
    expect(citations[0].endIndex).toBe(12);
    expect(citations[1].position).toBe(20);

    // Verify we can extract exact text using positions
    expect(text.slice(citations[0].startIndex, citations[0].endIndex)).toBe('[1][2]');
    expect(text.slice(citations[1].startIndex, citations[1].endIndex)).toBe('[3]');
  });

  it('should handle citations with varying whitespace patterns', () => {
    const variations = [
      '[1][2][3]',      // No whitespace
      '[1] [2] [3]',    // Single spaces
      '[1]  [2]  [3]',  // Multiple spaces
      '[1]\t[2]\t[3]',  // Tabs
      '[1]\n[2]\n[3]'   // Newlines
    ];

    variations.forEach(text => {
      const result = extractCitations(text);
      expect(result).toHaveLength(1);
      expect(result[0].citationNumbers).toEqual([1, 2, 3]);
    });
  });
});
