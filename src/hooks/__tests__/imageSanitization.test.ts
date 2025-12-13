/**
 * Tests for image artifact sanitization in useChatMessages
 * Ensures base64 image data doesn't exceed message size limits
 */

import { describe, it, expect } from 'vitest';

// Helper function duplicated from useChatMessages.tsx for testing
// SYNC: Keep in sync with useChatMessages.tsx sanitizeImageArtifacts (line ~371)
const sanitizeImageArtifacts = (content: string): string => {
  // Match <artifact ...type="image"...>BASE64_DATA</artifact>
  // Handles attributes in any order (type before or after title)
  // Replace base64 data URLs with a placeholder, keep regular URLs
  return content.replace(
    /<artifact\s+([^>]*?)type="image"([^>]*)>(data:image\/[^<]+)<\/artifact>/g,
    '<artifact $1type="image"$2>[Image generated - see above]</artifact>'
  );
};

describe('Image Artifact Sanitization', () => {
  it('should replace base64 image data with placeholder', () => {
    const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const content = `I've generated an image for you: Test Image\n\n<artifact type="image" title="Test Image">${base64Data}</artifact>`;

    const sanitized = sanitizeImageArtifacts(content);

    expect(sanitized).toContain('[Image generated - see above]');
    expect(sanitized).not.toContain('data:image/png');
    expect(sanitized).not.toContain(base64Data);
  });

  it('should preserve regular HTTP/HTTPS image URLs', () => {
    const imageUrl = 'https://storage.supabase.co/object/sign/images/test.png?token=abc123';
    const content = `I've generated an image for you: Test Image\n\n<artifact type="image" title="Test Image">${imageUrl}</artifact>`;

    const sanitized = sanitizeImageArtifacts(content);

    expect(sanitized).toBe(content); // Should remain unchanged
    expect(sanitized).toContain(imageUrl);
  });

  it('should handle multiple image artifacts in the same message', () => {
    const base64Data1 = 'data:image/png;base64,ABC123==';
    const base64Data2 = 'data:image/jpeg;base64,XYZ789==';
    const httpUrl = 'https://example.com/image.png';
    const content = `
      <artifact type="image" title="Image 1">${base64Data1}</artifact>
      <artifact type="image" title="Image 2">${httpUrl}</artifact>
      <artifact type="image" title="Image 3">${base64Data2}</artifact>
    `;

    const sanitized = sanitizeImageArtifacts(content);

    expect(sanitized).not.toContain('data:image/png');
    expect(sanitized).not.toContain('data:image/jpeg');
    expect(sanitized).toContain(httpUrl); // HTTP URL preserved
    expect(sanitized.match(/\[Image generated - see above\]/g)).toHaveLength(2); // Two placeholders
  });

  it('should handle different image MIME types', () => {
    const mimeTypes = ['png', 'jpeg', 'jpg', 'gif', 'webp'];

    mimeTypes.forEach(mimeType => {
      const base64Data = `data:image/${mimeType};base64,ABC123==`;
      const content = `<artifact type="image" title="Test">${base64Data}</artifact>`;

      const sanitized = sanitizeImageArtifacts(content);

      expect(sanitized).not.toContain(`data:image/${mimeType}`);
      expect(sanitized).toContain('[Image generated - see above]');
    });
  });

  it('should handle attributes in different orders', () => {
    const base64Data = 'data:image/png;base64,ABC123==';
    const content1 = `<artifact type="image" title="Test Image">${base64Data}</artifact>`;
    const content2 = `<artifact title="Test Image" type="image">${base64Data}</artifact>`;

    const sanitized1 = sanitizeImageArtifacts(content1);
    const sanitized2 = sanitizeImageArtifacts(content2);

    expect(sanitized1).not.toContain('data:image/');
    expect(sanitized2).not.toContain('data:image/');
  });

  it('should preserve non-image artifacts', () => {
    const reactCode = 'export default function App() { return <div>Hello</div>; }';
    const content = `<artifact type="react" title="React App">${reactCode}</artifact>`;

    const sanitized = sanitizeImageArtifacts(content);

    expect(sanitized).toBe(content); // Should remain unchanged
    expect(sanitized).toContain(reactCode);
  });

  it('should handle conversation context with mixed content', () => {
    const base64Data = 'data:image/png;base64,VERYLONGBASE64STRING'.repeat(1000); // Simulate large base64
    const content = `
      User: Can you create a calculator?
      Assistant: Here's a calculator:
      <artifact type="react" title="Calculator">export default function Calculator() {}</artifact>

      User: Now create an image
      Assistant: Here's your image:
      <artifact type="image" title="Beautiful Image">${base64Data}</artifact>

      User: Make it better
    `;

    const sanitized = sanitizeImageArtifacts(content);

    // Image artifact sanitized
    expect(sanitized).toContain('[Image generated - see above]');
    expect(sanitized).not.toContain('data:image/');

    // React artifact preserved
    expect(sanitized).toContain('Calculator');
    expect(sanitized).toContain('export default function Calculator()');

    // Text content preserved
    expect(sanitized).toContain('User: Can you create a calculator?');
    expect(sanitized).toContain('User: Make it better');
  });

  it('should reduce message size significantly', () => {
    // Simulate a realistic base64 image (200KB+)
    const largeBase64 = 'data:image/png;base64,' + 'A'.repeat(200000);
    const content = `I've generated an image for you: Test Image\n\n<artifact type="image" title="Test Image">${largeBase64}</artifact>`;

    const sanitized = sanitizeImageArtifacts(content);

    expect(content.length).toBeGreaterThan(200000);
    expect(sanitized.length).toBeLessThan(200); // Placeholder is much smaller
    expect(sanitized.length / content.length).toBeLessThan(0.001); // >99.9% reduction
  });

  it('should not break on malformed artifacts', () => {
    const malformedContent = `
      <artifact type="image" title="Unclosed
      <artifact type="image">No title or data</artifact>
      <artifact>${'not an image'}</artifact>
    `;

    // Should not throw an error
    expect(() => sanitizeImageArtifacts(malformedContent)).not.toThrow();

    const sanitized = sanitizeImageArtifacts(malformedContent);
    expect(sanitized).toBe(malformedContent); // No changes for malformed artifacts
  });
});
