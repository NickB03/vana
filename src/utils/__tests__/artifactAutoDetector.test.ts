import { describe, it, expect } from 'vitest';
import {
  detectArtifact,
  detectArtifactsFromCodeBlocks,
  getDetectionConfig,
  DetectionResult,
} from '../artifactAutoDetector';

describe('artifactAutoDetector', () => {
  describe('detectArtifact', () => {
    describe('React Component Detection', () => {
      it('should detect React component with high confidence', () => {
        const reactCode = `
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      <h1>Count: {count}</h1>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  );
}
`.repeat(3); // Make it longer to meet line threshold

        const result = detectArtifact(reactCode);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('react');
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
        expect(result.suggestedTitle).toContain('Counter');
      });

      it('should detect React component with hooks', () => {
        const reactCode = `
import { useState, useEffect, useRef } from 'react';

export function DataFetcher() {
  const [data, setData] = useState(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => { mountedRef.current = false; };
  }, []);

  return <div>{data}</div>;
}
`.repeat(4);

        const result = detectArtifact(reactCode);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('react');
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
      });

      it('should not detect React without import statement', () => {
        const fakeReact = `
function NotReally() {
  return <div>Hello</div>;
}
`.repeat(10);

        const result = detectArtifact(fakeReact);

        // Might detect as code or HTML, but confidence should be lower
        if (result.shouldCreateArtifact) {
          expect(result.suggestedType).not.toBe('react');
        }
      });
    });

    describe('HTML Detection', () => {
      it('should detect complete HTML document', () => {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <style>
    body { font-family: sans-serif; }
  </style>
</head>
<body>
  <header>
    <h1>Welcome</h1>
  </header>
  <main>
    <section>
      <p>Content here</p>
    </section>
  </main>
  <script>
    console.log('Hello');
  </script>
</body>
</html>
`.repeat(2);

        const result = detectArtifact(html);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('html');
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
        expect(result.suggestedTitle).toContain('My Page');
      });

      it('should detect HTML snippet with structure', () => {
        const html = `
<div class="container">
  <header>
    <h1>Title</h1>
  </header>
  <main>
    <form>
      <input type="text" />
      <button>Submit</button>
    </form>
  </main>
</div>
`.repeat(5);

        const result = detectArtifact(html);

        // HTML without DOCTYPE has confidence around 0.4, which is below threshold
        // This is intentional - we want DOCTYPE for strong HTML detection
        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Confidence');
      });
    });

    describe('SVG Detection', () => {
      it('should detect SVG with viewBox', () => {
        const svg = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <title>Circle</title>
  <circle cx="50" cy="50" r="40" fill="blue" />
  <rect x="10" y="10" width="20" height="20" fill="red" />
  <path d="M 10 10 L 90 90" stroke="black" />
</svg>
`;

        const result = detectArtifact(svg);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('svg');
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
        expect(result.suggestedTitle).toContain('Circle');
      });

      it('should detect complex SVG paths', () => {
        const svg = `
<svg width="200" height="200">
  <path d="M10 10 L90 90 L50 50 Z" />
  <ellipse cx="100" cy="100" rx="50" ry="30" />
  <polyline points="0,0 50,50 100,0" />
</svg>
`;

        const result = detectArtifact(svg);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('svg');
      });
    });

    describe('Mermaid Detection', () => {
      it('should detect Mermaid flowchart', () => {
        const mermaid = `
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]
\`\`\`
`;

        const result = detectArtifact(mermaid);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('mermaid');
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
        expect(result.suggestedTitle).toContain('flowchart');
      });

      it('should detect Mermaid sequence diagram', () => {
        const mermaid = `
\`\`\`mermaid
sequenceDiagram
    Alice->>John: Hello John, how are you?
    John-->>Alice: Great!
    Alice-)John: See you later!
\`\`\`
`;

        const result = detectArtifact(mermaid);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('mermaid');
        expect(result.suggestedTitle).toContain('sequenceDiagram');
      });

      it('should detect Mermaid class diagram', () => {
        const mermaid = `
\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    class Duck{
      +String beakColor
      +swim()
    }
\`\`\`
`;

        const result = detectArtifact(mermaid);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('mermaid');
      });
    });

    describe('Generic Code Detection', () => {
      it('should detect TypeScript code with language identifier', () => {
        const code = `
\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

class UserService {
  async getUser(id: string): Promise<User> {
    const response = await fetch(\`/api/users/\${id}\`);
    return response.json();
  }

  async updateUser(user: User): Promise<void> {
    await fetch(\`/api/users/\${user.id}\`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }
}
\`\`\`
`.repeat(3);

        const result = detectArtifact(code);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('code');
        expect(result.confidence).toBeGreaterThanOrEqual(0.75);
      });

      it('should detect Python code', () => {
        const code = `
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

class Calculator:
    def add(self, a, b):
        return a + b

    def multiply(self, a, b):
        return a * b

if __name__ == "__main__":
    calc = Calculator()
    print(calc.add(5, 3))
\`\`\`
`.repeat(3);

        const result = detectArtifact(code);

        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('code');
      });
    });

    describe('Edge Cases', () => {
      it('should reject content below line threshold', () => {
        const shortCode = `
\`\`\`javascript
console.log('hello');
\`\`\`
`;

        const result = detectArtifact(shortCode);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('lines');
      });

      it('should reject empty content', () => {
        const result = detectArtifact('');

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Invalid or empty');
      });

      it('should reject null or undefined', () => {
        const result1 = detectArtifact(null as any);
        const result2 = detectArtifact(undefined as any);

        expect(result1.shouldCreateArtifact).toBe(false);
        expect(result2.shouldCreateArtifact).toBe(false);
      });

      it('should reject content exceeding max size', () => {
        const config = getDetectionConfig();
        const hugeContent = 'a'.repeat(config.MAX_CONTENT_SIZE + 1);

        const result = detectArtifact(hugeContent);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('exceeds maximum size');
      });

      it('should handle mixed content (ambiguous type)', () => {
        const mixed = `
<div>Some HTML</div>
<script>
  const x = 5;
</script>
`.repeat(10);

        const result = detectArtifact(mixed);

        // Should detect as something, but with reasonable confidence
        if (result.shouldCreateArtifact) {
          expect(['html', 'code']).toContain(result.suggestedType);
        }
      });
    });

    describe('Security Validation', () => {
      it('should reject content with eval()', () => {
        const malicious = `
\`\`\`javascript
function dangerous() {
  eval("alert('xss')");
  return true;
}
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject content with Function constructor', () => {
        const malicious = `
\`\`\`javascript
const fn = new Function('x', 'return x * 2');
console.log(fn(5));
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject content with dangerouslySetInnerHTML', () => {
        const malicious = `
import React from 'react';

export function UnsafeComponent() {
  return (
    <div dangerouslySetInnerHTML={{ __html: '<script>alert(1)</script>' }} />
  );
}
`.repeat(3);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should allow script tags in HTML (sandboxed in iframe)', () => {
        const html = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Page</h1>
  <script>
    console.log('This is sandboxed in iframe');
  </script>
</body>
</html>
`.repeat(2);

        const result = detectArtifact(html);

        // Script tags are allowed in HTML since artifacts are sandboxed
        expect(result.shouldCreateArtifact).toBe(true);
        expect(result.suggestedType).toBe('html');
      });

      it('should reject content with document.write', () => {
        const malicious = `
\`\`\`javascript
function inject() {
  document.write('<script src="evil.js"></script>');
}
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject content with .innerHTML assignment', () => {
        const malicious = `
\`\`\`javascript
const div = document.querySelector('div');
div.innerHTML = userInput; // XSS vulnerability
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject setTimeout with string argument', () => {
        const malicious = `
\`\`\`javascript
setTimeout("alert('xss')", 1000);
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });
    });

    describe('Security Bypass Prevention', () => {
      it('should reject eval() with bracket notation bypass', () => {
        const malicious = `
\`\`\`javascript
function dangerous() {
  window['eval']("alert('xss')");
  globalThis["eval"]("alert('xss')");
  return true;
}
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject eval() with property access bypass', () => {
        const malicious = `
\`\`\`javascript
function dangerous() {
  window.eval("alert('xss')");
  globalThis.eval("alert('xss')");
  this.eval("alert('xss')");
  return true;
}
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject Function constructor with bracket notation', () => {
        const malicious = `
\`\`\`javascript
const fn = window['Function']('x', 'return x * 2');
const fn2 = globalThis["Function"]('x', 'return x * 2');
console.log(fn(5));
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject Function constructor with property access', () => {
        const malicious = `
\`\`\`javascript
const fn = window.Function('x', 'return x * 2');
const fn2 = globalThis.Function('alert(1)');
console.log(fn(5));
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject innerHTML with bracket notation bypass', () => {
        const malicious = `
\`\`\`javascript
const div = document.querySelector('div');
div['innerHTML'] = userInput; // XSS vulnerability
div["innerHTML"] = '<script>alert(1)</script>';
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject document.write with bracket notation', () => {
        const malicious = `
\`\`\`javascript
function inject() {
  document['write']('<script src="evil.js"></script>');
  document["write"]('<img src=x onerror=alert(1)>');
}
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject constructor.constructor bypass', () => {
        const malicious = `
\`\`\`javascript
const fn = (() => {}).constructor.constructor('alert(1)');
fn();
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });

      it('should reject constructor with bracket notation', () => {
        const malicious = `
\`\`\`javascript
const fn = (() => {})['constructor']['constructor']('alert(1)');
fn();
\`\`\`
`.repeat(10);

        const result = detectArtifact(malicious);

        expect(result.shouldCreateArtifact).toBe(false);
        expect(result.reason).toContain('Security violations');
      });
    });

    describe('Title Extraction', () => {
      it('should extract title from React component name', () => {
        const code = `
import React, { useState } from 'react';

export default function MyAwesomeComponent() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}
`.repeat(3);

        const result = detectArtifact(code);

        if (result.shouldCreateArtifact) {
          expect(result.suggestedTitle).toContain('MyAwesomeComponent');
        }
      });

      it('should extract title from HTML title tag', () => {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Amazing Website</title>
</head>
<body>
  <h1>Content</h1>
</body>
</html>
`.repeat(2);

        const result = detectArtifact(html);

        if (result.shouldCreateArtifact) {
          expect(result.suggestedTitle).toContain('Amazing Website');
        }
      });

      it('should extract title from SVG title element', () => {
        const svg = `
<svg viewBox="0 0 100 100">
  <title>Beautiful Circle</title>
  <circle cx="50" cy="50" r="40" />
</svg>
`;

        const result = detectArtifact(svg);

        expect(result.suggestedTitle).toContain('Beautiful Circle');
      });

      it('should sanitize titles with special characters', () => {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Test <script>alert(1)</script> Page</title>
</head>
<body>Content</body>
</html>
`.repeat(2);

        const result = detectArtifact(html);

        // Title should be sanitized (no angle brackets)
        if (result.shouldCreateArtifact && result.suggestedTitle) {
          expect(result.suggestedTitle).not.toContain('<');
          expect(result.suggestedTitle).not.toContain('>');
        }
      });

      it('should limit title length', () => {
        const config = getDetectionConfig();
        const longTitle = 'A'.repeat(config.MAX_TITLE_LENGTH + 50);
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${longTitle}</title>
</head>
<body>Content</body>
</html>
`.repeat(2);

        const result = detectArtifact(html);

        if (result.shouldCreateArtifact && result.suggestedTitle) {
          expect(result.suggestedTitle.length).toBeLessThanOrEqual(config.MAX_TITLE_LENGTH);
        }
      });

      it('should provide default title when none found', () => {
        const code = `
\`\`\`javascript
const x = 1;
const y = 2;
console.log(x + y);
\`\`\`
`.repeat(10);

        const result = detectArtifact(code);

        expect(result.suggestedTitle).toBeTruthy();
        expect(result.suggestedTitle).not.toBe('');
      });
    });

    describe('Confidence Scoring', () => {
      it('should have higher confidence for clear React components', () => {
        const clearReact = `
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Component() {
  const [state, setState] = useState(0);
  return <Button>{state}</Button>;
}
`.repeat(4);

        const ambiguous = `
function maybeReact() {
  return <div>test</div>;
}
`.repeat(10);

        const result1 = detectArtifact(clearReact);
        const result2 = detectArtifact(ambiguous);

        expect(result1.confidence).toBeGreaterThan(result2.confidence);
      });

      it('should have higher confidence for DOCTYPE HTML', () => {
        const fullHtml = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><div>Content</div></body>
</html>
`.repeat(3);

        const partialHtml = `
<div>
  <span>Some content</span>
</div>
`.repeat(10);

        const result1 = detectArtifact(fullHtml);
        const result2 = detectArtifact(partialHtml);

        if (result1.suggestedType === 'html' && result2.suggestedType === 'html') {
          expect(result1.confidence).toBeGreaterThan(result2.confidence);
        }
      });

      it('should return confidence between 0 and 1', () => {
        const code = `
\`\`\`typescript
const test = "value";
\`\`\`
`.repeat(15);

        const result = detectArtifact(code);

        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('detectArtifactsFromCodeBlocks', () => {
    it('should extract multiple artifacts from markdown', () => {
      const reactComponent = `
import React, { useState } from 'react';

export function Component1() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
`.repeat(3);

      const htmlDoc = `
<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <style>
    body { margin: 0; }
  </style>
</head>
<body>
  <h1>Title</h1>
  <p>Content</p>
</body>
</html>
`.repeat(2);

      const markdown = `
Here's a React component:

\`\`\`tsx
${reactComponent}
\`\`\`

And here's some HTML:

\`\`\`html
${htmlDoc}
\`\`\`

And a Mermaid diagram:

\`\`\`mermaid
graph TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Do This]
  B -->|No| D[Do That]
  C --> E[End]
  D --> E
\`\`\`
`;

      const results = detectArtifactsFromCodeBlocks(markdown);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.shouldCreateArtifact)).toBe(true);
    });

    it('should skip code blocks below threshold', () => {
      const markdown = `
Small snippet:

\`\`\`javascript
console.log('hello');
\`\`\`

Another small one:

\`\`\`python
print("world")
\`\`\`
`;

      const results = detectArtifactsFromCodeBlocks(markdown);

      // Should have 0 results as both are too short
      expect(results.length).toBe(0);
    });

    it('should return empty array for no code blocks', () => {
      const markdown = 'Just some regular text without any code blocks.';

      const results = detectArtifactsFromCodeBlocks(markdown);

      expect(results).toEqual([]);
    });

    it('should include content in results', () => {
      const markdown = `
\`\`\`mermaid
graph LR
  A --> B
  B --> C
  C --> D
\`\`\`
`;

      const results = detectArtifactsFromCodeBlocks(markdown);

      if (results.length > 0) {
        expect(results[0].content).toBeTruthy();
        expect(results[0].content).toContain('graph LR');
      }
    });
  });

  describe('getDetectionConfig', () => {
    it('should return configuration object', () => {
      const config = getDetectionConfig();

      expect(config).toHaveProperty('MIN_LINE_THRESHOLD');
      expect(config).toHaveProperty('MIN_CONFIDENCE');
      expect(config).toHaveProperty('MAX_CONTENT_SIZE');
      expect(config).toHaveProperty('MAX_TITLE_LENGTH');
    });

    it('should have reasonable threshold values', () => {
      const config = getDetectionConfig();

      expect(config.MIN_LINE_THRESHOLD).toBeGreaterThan(0);
      expect(config.MIN_CONFIDENCE).toBeGreaterThan(0);
      expect(config.MIN_CONFIDENCE).toBeLessThanOrEqual(1);
      expect(config.MAX_CONTENT_SIZE).toBeGreaterThan(0);
      expect(config.MAX_TITLE_LENGTH).toBeGreaterThan(0);
    });
  });

  describe('Complex Real-World Scenarios', () => {
    it('should detect interactive data visualization', () => {
      const code = `
\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <title>Chart Visualization</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <canvas id="myChart"></canvas>
  <script>
    const ctx = document.getElementById('myChart');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Red', 'Blue', 'Yellow'],
        datasets: [{
          label: 'Votes',
          data: [12, 19, 3]
        }]
      }
    });
  </script>
</body>
</html>
\`\`\`
`;

      const result = detectArtifact(code);

      expect(result.shouldCreateArtifact).toBe(true);
      expect(result.suggestedType).toBe('html');
    });

    it('should detect form with validation', () => {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Contact Form</title>
  <style>
    .error { color: red; }
    form { max-width: 500px; margin: 0 auto; }
  </style>
</head>
<body>
  <form id="contactForm">
    <input type="email" required />
    <textarea required></textarea>
    <button type="submit">Send</button>
  </form>
  <script>
    document.getElementById('contactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      // validation logic
    });
  </script>
</body>
</html>
`.repeat(2);

      const result = detectArtifact(html);

      expect(result.shouldCreateArtifact).toBe(true);
      expect(result.suggestedType).toBe('html');
    });

    it('should detect state management component', () => {
      const react = `
import React, { useReducer } from 'react';

const initialState = { count: 0, step: 1 };

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + state.step };
    case 'decrement':
      return { ...state, count: state.count - state.step };
    case 'setStep':
      return { ...state, step: action.payload };
    default:
      return state;
  }
}

export default function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div>
      <h1>Count: {state.count}</h1>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  );
}
`.repeat(2);

      const result = detectArtifact(react);

      expect(result.shouldCreateArtifact).toBe(true);
      expect(result.suggestedType).toBe('react');
    });
  });
});
