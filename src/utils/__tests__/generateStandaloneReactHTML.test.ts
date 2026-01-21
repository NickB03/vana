/**
 * Tests for generateStandaloneReactHTML utility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateStandaloneReactHTML,
  type GenerateStandaloneReactHTMLOptions,
} from '../generateStandaloneReactHTML';

// Mock dependencies
vi.mock('../npmDetection', () => ({
  extractNpmDependencies: vi.fn((code: string) => {
    // Simple mock that detects lucide-react imports
    if (code.includes('lucide-react')) {
      return { 'lucide-react': '^0.344.0' };
    }
    return {};
  }),
}));

vi.mock('../themeUtils', () => ({
  generateThemeCSS: vi.fn(() => `    /* shadcn/ui theme variables from parent app */
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
    }`),
}));

describe('generateStandaloneReactHTML', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate complete HTML document with basic React component', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test Component',
      modules: [
        {
          path: '/App.js',
          code: 'export default function App() { return <div>Hello World</div>; }',
        },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    // Check DOCTYPE and basic HTML structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>Test Component</title>');
    expect(html).toContain('<div id="root"></div>');
  });

  it('should include import map with React and ReactDOM', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('<script type="importmap">');
    expect(html).toContain('"react": "https://esm.sh/react@18.3.0"');
    expect(html).toContain('"react-dom": "https://esm.sh/react-dom@18.3.0"');
    expect(html).toContain('"react-dom/client": "https://esm.sh/react-dom@18.3.0/client"');
    expect(html).toContain('"react/jsx-runtime": "https://esm.sh/react@18.3.0/jsx-runtime"');
  });

  it('should include Tailwind CSS by default', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('https://cdn.tailwindcss.com');
  });

  it('should exclude Tailwind CSS when includeTailwind is false', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
      includeTailwind: false,
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).not.toContain('https://cdn.tailwindcss.com');
  });

  it('should include theme CSS variables by default', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('<!-- Theme CSS Variables -->');
    expect(html).toContain('--background: 0 0% 100%');
    expect(html).toContain('--foreground: 222.2 84% 4.9%');
  });

  it('should exclude theme CSS when includeTheme is false', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
      includeTheme: false,
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).not.toContain('<!-- Theme CSS Variables -->');
    expect(html).toContain('<!-- Basic styles -->');
  });

  it('should include npm dependencies in import map', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        {
          path: '/App.js',
          code: "import { Heart } from 'lucide-react'; export default function App() { return <Heart />; }",
        },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('"lucide-react": "https://esm.sh/lucide-react@0.344.0"');
  });

  it('should use provided dependencies over extracted ones', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
      dependencies: {
        'framer-motion': '^11.0.0',
        'recharts': '^2.10.0',
      },
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('"framer-motion": "https://esm.sh/framer-motion@11.0.0"');
    expect(html).toContain('"recharts": "https://esm.sh/recharts@2.10.0"');
  });

  it('should clean version strings (remove ^, ~)', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
      dependencies: {
        'test-pkg-caret': '^1.2.3',
        'test-pkg-tilde': '~4.5.6',
        'test-pkg-exact': '7.8.9',
      },
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('"test-pkg-caret": "https://esm.sh/test-pkg-caret@1.2.3"');
    expect(html).toContain('"test-pkg-tilde": "https://esm.sh/test-pkg-tilde@4.5.6"');
    expect(html).toContain('"test-pkg-exact": "https://esm.sh/test-pkg-exact@7.8.9"');
  });

  it('should include error handlers', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain("window.addEventListener('error'");
    expect(html).toContain("window.addEventListener('unhandledrejection'");
  });

  it('should transform export default function to function', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        {
          path: '/App.js',
          code: 'export default function App() { return <div>Test</div>; }',
        },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    // Should contain function App() without export default
    expect(html).toContain('function App()');
    // Should NOT contain export default function
    expect(html).not.toContain('export default function App()');
  });

  it('should handle arrow function components', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        {
          path: '/App.js',
          code: 'const App = () => { return <div>Test</div>; }; export default App;',
        },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    // Should contain const App = () =>
    expect(html).toContain('const App = ()');
    // Should comment out export default
    expect(html).toContain('// export default App');
  });

  it('should include render logic', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('ReactDOM.createRoot(rootElement)');
    expect(html).toContain('root.render(React.createElement(App))');
  });

  it('should escape HTML in title', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: '<script>alert("xss")</script>',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("xss")</script>');
  });

  it('should throw error if no App module found', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/NotApp.js', code: 'export default function NotApp() { return null; }' },
      ],
    };

    expect(() => generateStandaloneReactHTML(options)).toThrow(
      'No App.js or App.tsx module found in modules array'
    );
  });

  it('should handle App.tsx modules', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        {
          path: '/App.tsx',
          code: 'export default function App() { return <div>TypeScript</div>; }',
        },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('function App()');
  });

  it('should handle module imports and preserve them', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        {
          path: '/App.js',
          code: `import { useState } from 'react';
import { Heart } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);
  return <div><Heart /> {count}</div>;
}`,
        },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    // Imports should be preserved
    expect(html).toContain("import { useState } from 'react'");
    expect(html).toContain("import { Heart } from 'lucide-react'");
  });

  it('should include module type script tag', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('<script type="module">');
  });

  it('should import React and ReactDOM in module script', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain("import React from 'react'");
    expect(html).toContain("import ReactDOM from 'react-dom/client'");
  });

  it('should handle multiple modules and find App.js', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/utils.js', code: 'export const helper = () => {};' },
        { path: '/App.js', code: 'export default function App() { return null; }' },
        { path: '/styles.css', code: 'body { margin: 0; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    // Should successfully find App.js and generate HTML
    expect(html).toContain('function App()');
  });

  it('should generate valid HTML structure', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    // Check for proper nesting
    expect(html).toMatch(/<!DOCTYPE html>\s*<html/);
    expect(html).toMatch(/<head>[\s\S]*<\/head>/);
    expect(html).toMatch(/<body>[\s\S]*<\/body>/);
    expect(html).toMatch(/<\/body>\s*<\/html>$/);
  });

  it('should handle complex component with props and state', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Complex Component',
      modules: [
        {
          path: '/App.js',
          code: `import { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('Component mounted');
  }, []);

  return (
    <div className="p-4">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}`,
        },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain("import { useState, useEffect } from 'react'");
    expect(html).toContain('function App()');
    expect(html).not.toContain('export default function App()');
  });

  it('should include viewport meta tag', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
  });

  it('should include charset meta tag', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [
        { path: '/App.js', code: 'export default function App() { return null; }' },
      ],
    };

    const html = generateStandaloneReactHTML(options);

    expect(html).toContain('<meta charset="UTF-8">');
  });

  it('should handle empty modules array gracefully', () => {
    const options: GenerateStandaloneReactHTMLOptions = {
      title: 'Test',
      modules: [],
    };

    expect(() => generateStandaloneReactHTML(options)).toThrow(
      'No App.js or App.tsx module found in modules array'
    );
  });
});
