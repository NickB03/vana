/**
 * Test suite for SSE Event Handlers (P0 bug fix)
 *
 * Validates that artifact_complete and image_complete SSE events from the
 * tool-calling chat endpoint are properly handled, preventing blank responses.
 *
 * Bug: After generating an artifact or image via tool-calling, follow-up
 *      modification requests resulted in blank responses because the chat
 *      stream parser was not handling artifact_complete/image_complete events.
 * Fix: Added handlers for these event types in useChatMessages.tsx (lines 1391-1464)
 *      and extracted the logic to sseEventHandlers.ts for testability.
 */

import { describe, it, expect } from 'vitest';
import {
  mapArtifactTypeToMime,
  escapeArtifactTitle,
  buildArtifactXml,
  buildImageArtifactXml,
  processArtifactCompleteEvent,
  processImageCompleteEvent,
} from '../sseEventHandlers';

// ==========================================================================
// MIME TYPE MAPPING TESTS
// ==========================================================================
describe('mapArtifactTypeToMime', () => {
  it('should map "react" to application/vnd.ant.react', () => {
    expect(mapArtifactTypeToMime('react')).toBe('application/vnd.ant.react');
  });

  it('should map "code" to application/vnd.ant.code', () => {
    expect(mapArtifactTypeToMime('code')).toBe('application/vnd.ant.code');
  });

  it('should map "html" to application/vnd.ant.html', () => {
    expect(mapArtifactTypeToMime('html')).toBe('application/vnd.ant.html');
  });

  it('should map "svg" to application/vnd.ant.svg', () => {
    expect(mapArtifactTypeToMime('svg')).toBe('application/vnd.ant.svg');
  });

  it('should map "mermaid" to application/vnd.ant.mermaid', () => {
    expect(mapArtifactTypeToMime('mermaid')).toBe('application/vnd.ant.mermaid');
  });

  it('should map "markdown" to application/vnd.ant.markdown', () => {
    expect(mapArtifactTypeToMime('markdown')).toBe('application/vnd.ant.markdown');
  });

  it('should handle unknown types gracefully', () => {
    expect(mapArtifactTypeToMime('custom')).toBe('application/vnd.ant.custom');
  });

  it('should handle empty string type', () => {
    expect(mapArtifactTypeToMime('')).toBe('application/vnd.ant.');
  });
});

// ==========================================================================
// TITLE ESCAPING TESTS (XSS Prevention)
// ==========================================================================
describe('escapeArtifactTitle', () => {
  it('should escape ampersands', () => {
    expect(escapeArtifactTitle('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less-than signs', () => {
    expect(escapeArtifactTitle('1 < 2')).toBe('1 &lt; 2');
  });

  it('should escape greater-than signs', () => {
    expect(escapeArtifactTitle('2 > 1')).toBe('2 &gt; 1');
  });

  it('should escape double quotes', () => {
    expect(escapeArtifactTitle('Say "Hello"')).toBe('Say &quot;Hello&quot;');
  });

  it('should escape multiple special characters', () => {
    const input = '<script>alert("XSS")</script> & more';
    const expected = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; more';
    expect(escapeArtifactTitle(input)).toBe(expected);
  });

  it('should use default title for null input', () => {
    expect(escapeArtifactTitle(null)).toBe('Generated Artifact');
  });

  it('should use default title for undefined input', () => {
    expect(escapeArtifactTitle(undefined)).toBe('Generated Artifact');
  });

  it('should use default title for empty string', () => {
    expect(escapeArtifactTitle('')).toBe('Generated Artifact');
  });

  it('should preserve safe characters', () => {
    expect(escapeArtifactTitle('My Counter App v2.0')).toBe('My Counter App v2.0');
  });

  it('should handle very long titles', () => {
    const longTitle = 'A'.repeat(1000);
    expect(escapeArtifactTitle(longTitle)).toBe(longTitle);
  });

  it('should handle Unicode characters', () => {
    expect(escapeArtifactTitle('日本語タイトル')).toBe('日本語タイトル');
  });

  it('should handle emoji in titles', () => {
    expect(escapeArtifactTitle('Counter 🔢')).toBe('Counter 🔢');
  });
});

// ==========================================================================
// ARTIFACT XML BUILDING TESTS
// ==========================================================================
describe('buildArtifactXml', () => {
  it('should build correct XML structure for React artifact', () => {
    const result = buildArtifactXml(
      'application/vnd.ant.react',
      'My Counter',
      'export default function Counter() { return <div>0</div>; }'
    );

    expect(result).toBe(
      '<artifact type="application/vnd.ant.react" title="My Counter">\n' +
      'export default function Counter() { return <div>0</div>; }\n' +
      '</artifact>'
    );
  });

  it('should build correct XML structure for code artifact', () => {
    const result = buildArtifactXml(
      'application/vnd.ant.code',
      'Utility Function',
      'function add(a, b) { return a + b; }'
    );

    expect(result).toContain('type="application/vnd.ant.code"');
    expect(result).toContain('title="Utility Function"');
    expect(result).toContain('function add(a, b) { return a + b; }');
  });

  it('should preserve multiline code in artifact', () => {
    const code = `export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>+</button>
    </div>
  );
}`;

    const result = buildArtifactXml('application/vnd.ant.react', 'App', code);
    expect(result).toContain(code);
  });

  it('should handle empty code gracefully', () => {
    const result = buildArtifactXml('application/vnd.ant.react', 'Empty', '');
    expect(result).toBe(
      '<artifact type="application/vnd.ant.react" title="Empty">\n\n</artifact>'
    );
  });
});

// ==========================================================================
// IMAGE ARTIFACT XML BUILDING TESTS
// ==========================================================================
describe('buildImageArtifactXml', () => {
  it('should build correct XML for storage URL', () => {
    const url = 'https://storage.example.com/images/sunset.png';
    const result = buildImageArtifactXml(url);

    expect(result).toBe(
      '<artifact type="image" title="Generated Image">\n' +
      'https://storage.example.com/images/sunset.png\n' +
      '</artifact>'
    );
  });

  it('should build correct XML for base64 data URL', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo...';
    const result = buildImageArtifactXml(dataUrl);

    expect(result).toContain('type="image"');
    expect(result).toContain('title="Generated Image"');
    expect(result).toContain(dataUrl);
  });
});

// ==========================================================================
// ARTIFACT_COMPLETE EVENT PROCESSING TESTS
// ==========================================================================
describe('processArtifactCompleteEvent', () => {
  it('should process artifact_complete event correctly', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'export default function App() { return <div>Hello</div>; }',
      artifactType: 'react',
      artifactTitle: 'Hello App',
    };

    const result = processArtifactCompleteEvent(event);

    expect(result.artifactDetected).toBe(true);
    expect(result.artifactClosed).toBe(true);
    expect(result.fullResponse).toContain('type="application/vnd.ant.react"');
    expect(result.fullResponse).toContain('title="Hello App"');
    expect(result.fullResponse).toContain('export default function App()');
  });

  it('should prepend artifact to existing response', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'const x = 1;',
      artifactType: 'code',
      artifactTitle: 'Code',
    };

    const result = processArtifactCompleteEvent(event, 'Here is your code:');

    expect(result.fullResponse).toMatch(/^<artifact.*<\/artifact>\n\nHere is your code:$/s);
  });

  it('should handle missing artifact title', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'const x = 1;',
      artifactType: 'code',
    };

    const result = processArtifactCompleteEvent(event);

    expect(result.fullResponse).toContain('title="Generated Artifact"');
  });

  it('should escape XSS in artifact title', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'const x = 1;',
      artifactType: 'code',
      artifactTitle: '<script>alert("XSS")</script>',
    };

    const result = processArtifactCompleteEvent(event);

    expect(result.fullResponse).toContain('&lt;script&gt;');
    expect(result.fullResponse).not.toContain('<script>');
  });

  it('should return unchanged response for empty artifact code', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: '',
      artifactType: 'code',
      artifactTitle: 'Empty',
    };

    const result = processArtifactCompleteEvent(event, 'Original');

    expect(result.fullResponse).toBe('Original');
    expect(result.artifactDetected).toBe(false);
    expect(result.artifactClosed).toBe(false);
  });

  it('should set artifactDetected and artifactClosed flags', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'x',
      artifactType: 'code',
    };

    const result = processArtifactCompleteEvent(event);

    expect(result.artifactDetected).toBe(true);
    expect(result.artifactClosed).toBe(true);
  });

  it('should capture reasoning from event', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'const x = 1;',
      artifactType: 'code',
      reasoning: 'I analyzed the request and created this code.',
    };

    const result = processArtifactCompleteEvent(event);

    expect(result.reasoningText).toBe('I analyzed the request and created this code.');
  });

  it('should preserve existing reasoning over event reasoning', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'const x = 1;',
      artifactType: 'code',
      reasoning: 'New reasoning',
    };

    const result = processArtifactCompleteEvent(event, '', 'Existing reasoning');

    expect(result.reasoningText).toBe('Existing reasoning');
  });
});

// ==========================================================================
// IMAGE_COMPLETE EVENT PROCESSING TESTS
// ==========================================================================
describe('processImageCompleteEvent', () => {
  it('should process image_complete event with storage URL', () => {
    const event = {
      type: 'image_complete' as const,
      imageUrl: 'https://storage.example.com/sunset.png',
      storageSucceeded: true,
    };

    const result = processImageCompleteEvent(event);

    expect(result.artifactDetected).toBe(true);
    expect(result.artifactClosed).toBe(true);
    expect(result.fullResponse).toContain('type="image"');
    expect(result.fullResponse).toContain('https://storage.example.com/sunset.png');
  });

  it('should fallback to imageData when imageUrl is missing', () => {
    const event = {
      type: 'image_complete' as const,
      imageData: 'data:image/png;base64,ABC123',
      storageSucceeded: false,
    };

    const result = processImageCompleteEvent(event);

    expect(result.artifactDetected).toBe(true);
    expect(result.fullResponse).toContain('data:image/png;base64,ABC123');
  });

  it('should prefer imageUrl over imageData when both present', () => {
    const event = {
      type: 'image_complete' as const,
      imageUrl: 'https://storage.example.com/image.png',
      imageData: 'data:image/png;base64,ABC123',
      storageSucceeded: true,
    };

    const result = processImageCompleteEvent(event);

    expect(result.fullResponse).toContain('https://storage.example.com/image.png');
    expect(result.fullResponse).not.toContain('base64');
  });

  it('should prepend image to existing response', () => {
    const event = {
      type: 'image_complete' as const,
      imageUrl: 'https://example.com/img.png',
      storageSucceeded: true,
    };

    const result = processImageCompleteEvent(event, 'Here is your image:');

    expect(result.fullResponse).toMatch(/^<artifact.*<\/artifact>\n\nHere is your image:$/s);
  });

  it('should return unchanged response when no URL or data', () => {
    const event = {
      type: 'image_complete' as const,
      storageSucceeded: false,
    };

    const result = processImageCompleteEvent(event, 'Original');

    expect(result.fullResponse).toBe('Original');
    expect(result.artifactDetected).toBe(false);
  });

  it('should set artifactDetected and artifactClosed flags', () => {
    const event = {
      type: 'image_complete' as const,
      imageUrl: 'https://example.com/img.png',
    };

    const result = processImageCompleteEvent(event);

    expect(result.artifactDetected).toBe(true);
    expect(result.artifactClosed).toBe(true);
  });
});

// ==========================================================================
// EDGE CASES
// ==========================================================================
describe('Edge Cases', () => {
  it('should handle artifact with code containing XML-like content', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: '<div><span>Hello</span></div>',
      artifactType: 'html',
      artifactTitle: 'HTML Snippet',
    };

    const result = processArtifactCompleteEvent(event);

    // The code should be preserved as-is (not escaped)
    expect(result.fullResponse).toContain('<div><span>Hello</span></div>');
    expect(result.artifactDetected).toBe(true);
  });

  it('should handle artifact with code containing artifact tags', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'const xml = "<artifact>fake</artifact>";',
      artifactType: 'code',
    };

    const result = processArtifactCompleteEvent(event);

    // The nested artifact tag in the code is preserved
    expect(result.fullResponse).toContain('const xml = "<artifact>fake</artifact>"');
  });

  it('should handle very large artifact code', () => {
    const largeCode = 'x'.repeat(100000);
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: largeCode,
      artifactType: 'code',
    };

    const result = processArtifactCompleteEvent(event);

    expect(result.fullResponse.length).toBeGreaterThan(100000);
    expect(result.artifactDetected).toBe(true);
  });

  it('should handle multiple artifacts being processed sequentially', () => {
    const event1 = {
      type: 'artifact_complete' as const,
      artifactCode: 'function one() {}',
      artifactType: 'code',
      artifactTitle: 'First',
    };

    const event2 = {
      type: 'artifact_complete' as const,
      artifactCode: 'function two() {}',
      artifactType: 'code',
      artifactTitle: 'Second',
    };

    let response = '';
    const result1 = processArtifactCompleteEvent(event1, response);
    response = result1.fullResponse;

    // Second event prepends to the result of the first
    const result2 = processArtifactCompleteEvent(event2, response);

    expect(result2.fullResponse).toContain('title="Second"');
    expect(result2.fullResponse).toContain('title="First"');
  });

  it('should handle special characters in artifact code', () => {
    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'const msg = `Hello & Goodbye!`;\nconst lt = 1 < 2;',
      artifactType: 'code',
    };

    const result = processArtifactCompleteEvent(event);

    // Code is NOT escaped - only the title is escaped
    expect(result.fullResponse).toContain('Hello & Goodbye');
    expect(result.fullResponse).toContain('1 < 2');
  });
});

// ==========================================================================
// BUG FIX DOCUMENTATION
// ==========================================================================
describe('P0 Bug Fix Documentation', () => {
  it('FIXED: artifact_complete events are now handled in chat stream parser', () => {
    // This test documents the fix for the P0 bug where artifact_complete
    // events from tool-calling chat were being ignored

    const event = {
      type: 'artifact_complete' as const,
      artifactCode: 'export default function Counter() { return <div>0</div>; }',
      artifactType: 'react',
      artifactTitle: 'Counter',
    };

    const result = processArtifactCompleteEvent(event);

    // BEFORE: No handler existed, result would be empty/unchanged
    // AFTER: Handler processes the event and generates artifact XML
    expect(result.artifactDetected).toBe(true);
    expect(result.fullResponse).not.toBe('');
    expect(result.fullResponse).toContain('<artifact');
  });

  it('FIXED: image_complete events are now handled in chat stream parser', () => {
    // This test documents the fix for the P0 bug where image_complete
    // events from tool-calling chat were being ignored

    const event = {
      type: 'image_complete' as const,
      imageUrl: 'https://storage.example.com/sunset.png',
      storageSucceeded: true,
    };

    const result = processImageCompleteEvent(event);

    // BEFORE: No handler existed, result would be empty/unchanged
    // AFTER: Handler processes the event and generates image artifact XML
    expect(result.artifactDetected).toBe(true);
    expect(result.fullResponse).not.toBe('');
    expect(result.fullResponse).toContain('<artifact type="image"');
  });
});
