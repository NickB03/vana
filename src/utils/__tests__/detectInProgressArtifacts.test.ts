import { describe, it, expect } from 'vitest';
import { detectInProgressArtifacts } from '../artifactParser';

describe('detectInProgressArtifacts', () => {
  describe('Basic cases', () => {
    it('should return 0 for empty string', () => {
      expect(detectInProgressArtifacts('')).toBe(0);
    });

    it('should return 0 when no artifact tags present', () => {
      const content = 'This is just regular text without any artifact tags.';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should return 0 for one complete artifact', () => {
      const content = '<artifact type="react">export default function App() {}</artifact>';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should return 0 for multiple complete artifacts', () => {
      const content = `
        <artifact type="react">Component 1</artifact>
        <artifact type="html">Component 2</artifact>
        <artifact type="react" title="Test">Component 3</artifact>
      `;
      expect(detectInProgressArtifacts(content)).toBe(0);
    });
  });

  describe('In-progress detection', () => {
    it('should detect one unclosed <artifact>', () => {
      const content = '<artifact>';
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should detect one unclosed <artifact> with type attribute', () => {
      const content = '<artifact type="react">';
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should detect one unclosed <artifact> with multiple attributes', () => {
      const content = '<artifact type="react" title="Test Component">';
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should detect two unclosed artifacts', () => {
      const content = '<artifact type="react"><artifact type="html">';
      expect(detectInProgressArtifacts(content)).toBe(2);
    });

    it('should detect one in-progress artifact when one is complete', () => {
      const content = `
        <artifact type="react">Complete Component</artifact>
        <artifact type="html">In progress...
      `;
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should detect multiple in-progress artifacts with complete ones', () => {
      const content = `
        <artifact type="react">Complete 1</artifact>
        <artifact type="html">In progress 1...
        <artifact type="react">Complete 2</artifact>
        <artifact type="svg">In progress 2...
      `;
      expect(detectInProgressArtifacts(content)).toBe(2);
    });
  });

  describe('Edge cases', () => {
    it('should NOT count <artifactxxx> as a valid tag', () => {
      const content = '<artifactxxx>This is not a valid artifact tag</artifactxxx>';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should NOT count <artifact at end of string without closing >', () => {
      const content = 'Some text <artifact';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should NOT count <artifact with invalid next character', () => {
      const content = '<artifactComponent>Not a valid tag</artifactComponent>';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should return 0 when closing tags exceed opening tags (never negative)', () => {
      const content = '</artifact></artifact></artifact>';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle artifact-like strings in code content', () => {
      const content = `
        <artifact type="react">
          export default function App() {
            const html = '<artifact>This is just a string</artifact>';
            return <div>{html}</div>;
          }
        </artifact>
      `;
      // Opening: 2 (outer + inner string), Closing: 2 → 0
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle nested artifact mentions in markdown', () => {
      const content = `
        Here's how to use artifacts:
        \`\`\`
        <artifact type="react">Component</artifact>
        \`\`\`
        <artifact type="html">
          <p>Real artifact content</p>
        </artifact>
      `;
      // Opening: 2, Closing: 2 → 0
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle closing tag without opening', () => {
      const content = 'Some text </artifact> more text';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle multiple closing tags without opening', () => {
      const content = '</artifact></artifact></artifact>';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle whitespace in opening tag', () => {
      const content = '<artifact  type="react"  title="Test"  >';
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should count <artifact with newline after tag name (multi-line tags are valid)', () => {
      // Multi-line artifact tags are valid XML/HTML syntax
      // The AI may format long attribute lists across multiple lines
      const content = `<artifact
        type="react"
        title="Multi-line">`;
      expect(detectInProgressArtifacts(content)).toBe(1);
    });
  });

  describe('Streaming simulation', () => {
    it('should detect in-progress artifact with partial opening tag', () => {
      const content = '<artifact type="react" title="Test">';
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should detect in-progress artifact with partial content', () => {
      const content = '<artifact type="react" title="Test">export default';
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should detect in-progress artifact with more content', () => {
      const content = '<artifact type="react" title="Test">export default function App() {';
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should return 0 when artifact is fully streamed and complete', () => {
      const content = '<artifact type="react" title="Test">export default function App() {}</artifact>';
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle streaming with text before artifact', () => {
      const progressiveContent = [
        'Here is your component:\n',
        'Here is your component:\n<artifact',
        'Here is your component:\n<artifact ',  // Space makes it valid
        'Here is your component:\n<artifact type="react">',
        'Here is your component:\n<artifact type="react">export',
        'Here is your component:\n<artifact type="react">export default function',
        'Here is your component:\n<artifact type="react">export default function App() {}',
        'Here is your component:\n<artifact type="react">export default function App() {}</artifact>',
      ];

      expect(detectInProgressArtifacts(progressiveContent[0])).toBe(0); // No artifact
      expect(detectInProgressArtifacts(progressiveContent[1])).toBe(0); // Partial tag without > or space
      expect(detectInProgressArtifacts(progressiveContent[2])).toBe(1); // Space after <artifact makes it valid
      expect(detectInProgressArtifacts(progressiveContent[3])).toBe(1); // Complete opening
      expect(detectInProgressArtifacts(progressiveContent[4])).toBe(1); // With content
      expect(detectInProgressArtifacts(progressiveContent[5])).toBe(1); // More content
      expect(detectInProgressArtifacts(progressiveContent[6])).toBe(1); // Full code
      expect(detectInProgressArtifacts(progressiveContent[7])).toBe(0); // Complete
    });

    it('should handle streaming multiple artifacts', () => {
      const content1 = '<artifact type="react">Component 1</artifact>';
      const content2 = content1 + '\n<artifact type="html">';
      const content3 = content2 + '<div>Component 2</div>';
      const content4 = content3 + '</artifact>';

      expect(detectInProgressArtifacts(content1)).toBe(0);
      expect(detectInProgressArtifacts(content2)).toBe(1);
      expect(detectInProgressArtifacts(content3)).toBe(1);
      expect(detectInProgressArtifacts(content4)).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle complete React component artifact', () => {
      const content = `
        <artifact type="application/vnd.ant.react" title="Counter Component">
          import { useState } from 'react';

          export default function Counter() {
            const [count, setCount] = useState(0);
            return (
              <div>
                <button onClick={() => setCount(count + 1)}>
                  Count: {count}
                </button>
              </div>
            );
          }
        </artifact>
      `;
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle in-progress React component artifact', () => {
      const content = `
        <artifact type="application/vnd.ant.react" title="Counter Component">
          import { useState } from 'react';

          export default function Counter() {
            const [count, setCount] = useState(0);
      `;
      expect(detectInProgressArtifacts(content)).toBe(1);
    });

    it('should handle complete HTML artifact', () => {
      const content = `
        <artifact type="text/html" title="Landing Page">
          <!DOCTYPE html>
          <html>
            <head><title>Test</title></head>
            <body><h1>Hello World</h1></body>
          </html>
        </artifact>
      `;
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle SVG artifact with nested tags', () => {
      const content = `
        <artifact type="image/svg+xml" title="Circle">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="blue" />
          </svg>
        </artifact>
      `;
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle chat message with explanation and artifact', () => {
      const content = `
        Here's a counter component for you:

        <artifact type="application/vnd.ant.react" title="Counter">
          export default function App() {
            return <div>Counter</div>;
          }
        </artifact>

        This component uses React hooks for state management.
      `;
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle multiple complete artifacts in conversation', () => {
      const content = `
        I'll create two components for you:

        <artifact type="application/vnd.ant.react" title="Button">
          export default function Button() {
            return <button>Click me</button>;
          }
        </artifact>

        And here's a card component:

        <artifact type="application/vnd.ant.react" title="Card">
          export default function Card() {
            return <div className="card">Content</div>;
          }
        </artifact>
      `;
      expect(detectInProgressArtifacts(content)).toBe(0);
    });

    it('should handle error recovery scenario with unclosed artifact', () => {
      const content = `
        <artifact type="application/vnd.ant.react" title="Broken">
          export default function App() {
            return <div>This artifact was interrupted
      `;
      expect(detectInProgressArtifacts(content)).toBe(1);
    });
  });

  describe('Performance and boundary cases', () => {
    it('should handle very long content efficiently', () => {
      const longContent = 'x'.repeat(10000);
      expect(detectInProgressArtifacts(longContent)).toBe(0);
    });

    it('should handle many complete artifacts', () => {
      const manyArtifacts = Array(100)
        .fill('<artifact type="react">Test</artifact>')
        .join('\n');
      expect(detectInProgressArtifacts(manyArtifacts)).toBe(0);
    });

    it('should handle many unclosed artifacts', () => {
      const manyUnclosed = Array(50)
        .fill('<artifact type="react">Test')
        .join('\n');
      expect(detectInProgressArtifacts(manyUnclosed)).toBe(50);
    });

    it('should handle alternating complete and incomplete', () => {
      const content = Array(10)
        .fill(null)
        .map((_, i) =>
          i % 2 === 0
            ? '<artifact>Complete</artifact>'
            : '<artifact>Incomplete'
        )
        .join('\n');
      expect(detectInProgressArtifacts(content)).toBe(5);
    });
  });
});
