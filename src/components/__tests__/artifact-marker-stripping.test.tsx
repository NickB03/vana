/**
 * Unit tests for artifact marker stripping
 *
 * Tests the stripArtifactTags function in MessageWithArtifacts.tsx
 * to ensure [Artifact: ...] and [Image: ...] markers are properly removed.
 *
 * Bug fix for: https://github.com/NickB03/llm-chat-site/issues/XXX
 */

import { describe, it, expect } from 'vitest';

/**
 * Strip artifact XML tags and text markers from content to get clean display text
 * This is a copy of the function from MessageWithArtifacts.tsx for testing
 */
function stripArtifactTags(content: string): string {
  // Remove complete artifact blocks: <artifact ...>...</artifact>
  let cleaned = content.replace(/<artifact[^>]*>[\s\S]*?<\/artifact>/g, '');

  // Remove text markers: [Artifact: Title] and [Image: Title]
  // These are added during streaming but should not be displayed to users
  cleaned = cleaned.replace(/^\[(?:Artifact|Image):[^\]]+\]\s*/gm, '');

  return cleaned.trim();
}

describe('artifact marker stripping', () => {
  describe('stripArtifactTags', () => {
    it('should remove [Artifact: ...] markers from content', () => {
      const input = '[Artifact: Leap & Dodge: Frogger Remake]I\'ve created a fully functional...';
      const expected = 'I\'ve created a fully functional...';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should remove [Image: ...] markers from content', () => {
      const input = '[Image: Generated Image]\n\nThe image shows a beautiful sunset...';
      const expected = 'The image shows a beautiful sunset...';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should not modify content without markers', () => {
      const input = 'No markers here, just plain text';
      expect(stripArtifactTags(input)).toBe(input);
    });

    it('should handle markers with newlines', () => {
      const input = '[Artifact: Counter App]\n\nI\'ve created a React counter that uses hooks.';
      const expected = 'I\'ve created a React counter that uses hooks.';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should handle multiple markers', () => {
      const input = '[Artifact: First]\nSome text\n[Artifact: Second]\nMore text';
      const expected = 'Some text\nMore text';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should handle markers with special characters in titles', () => {
      const input = '[Artifact: My & Your: Special-Title (v2)]Content here';
      const expected = 'Content here';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should remove XML artifact tags', () => {
      const input = '<artifact type="react" title="Test">code here</artifact>\n\nExplanation text';
      const expected = 'Explanation text';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should remove both XML tags and text markers', () => {
      const input = '[Artifact: Counter]\n\n<artifact type="react">code</artifact>\n\nI created a counter.';
      const expected = 'I created a counter.';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should handle empty content', () => {
      expect(stripArtifactTags('')).toBe('');
    });

    it('should handle content with only markers', () => {
      const input = '[Artifact: Test]';
      expect(stripArtifactTags(input)).toBe('');
    });

    it('should preserve markdown formatting', () => {
      const input = '[Artifact: Test]\n\n# Heading\n\n**Bold text** and *italic text*';
      const expected = '# Heading\n\n**Bold text** and *italic text*';
      expect(stripArtifactTags(input)).toBe(expected);
    });

    it('should handle markers at the start of lines only (not mid-text)', () => {
      // Markers should only be removed at the start of lines (^ anchor)
      const input = 'Some text [Artifact: Test] in the middle\n[Artifact: Start] at the beginning';
      const expected = 'Some text [Artifact: Test] in the middle\nat the beginning';
      expect(stripArtifactTags(input)).toBe(expected);
    });
  });
});
