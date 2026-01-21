# Standalone React HTML Generator

This utility generates standalone, self-contained HTML documents from React artifacts. The generated HTML can be opened in any browser without a build process or server.

## Overview

The `generateStandaloneReactHTML` utility takes transpiled React code (typically from Sandpack) and produces a complete HTML document with:

- **Import Maps**: ESM module imports via esm.sh CDN for React, ReactDOM, and npm dependencies
- **Tailwind CSS**: Optional Tailwind CSS CDN integration
- **Theme Support**: Optional shadcn/ui theme variables for consistent styling
- **Error Handling**: Built-in error boundaries and console error handling
- **Zero Dependencies**: Generated HTML runs standalone without build tools

## Use Cases

1. **Download Artifacts**: Allow users to download React artifacts as standalone HTML files
2. **Share Components**: Generate shareable HTML that can be opened anywhere
3. **Pop-out Windows**: Open artifacts in separate browser windows
4. **Static Exports**: Export React components as static HTML documents
5. **Embedding**: Embed React artifacts in other contexts (emails, docs, etc.)

## Installation

The utility is located at `src/utils/generateStandaloneReactHTML.ts` and is already available in the project.

```typescript
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';
```

## Basic Usage

```typescript
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';

const html = generateStandaloneReactHTML({
  title: 'My Component',
  modules: [
    {
      path: '/App.js',
      code: 'export default function App() { return <div>Hello World</div>; }',
    },
  ],
});

// Save to file or open in new window
console.log(html);
```

## API Reference

### `generateStandaloneReactHTML(options)`

Generates a complete standalone HTML document for a React artifact.

#### Parameters

```typescript
interface GenerateStandaloneReactHTMLOptions {
  /** Artifact title for document title */
  title: string;

  /** Array of transpiled modules from Sandpack */
  modules: TranspiledModule[];

  /** Optional npm dependencies with versions (will be extracted from code if not provided) */
  dependencies?: Record<string, string>;

  /** Include Tailwind CSS (default: true) */
  includeTailwind?: boolean;

  /** Include theme CSS variables (default: true) */
  includeTheme?: boolean;
}

interface TranspiledModule {
  path: string;
  code: string;
}
```

#### Returns

`string` - Complete HTML document ready to be saved or displayed

#### Example

```typescript
const html = generateStandaloneReactHTML({
  title: 'Counter App',
  modules: [
    {
      path: '/App.js',
      code: `
        import { useState } from 'react';

        export default function App() {
          const [count, setCount] = useState(0);
          return (
            <div>
              <h1>Count: {count}</h1>
              <button onClick={() => setCount(count + 1)}>Increment</button>
            </div>
          );
        }
      `,
    },
  ],
  dependencies: {
    'react': '18.3.0',
    'react-dom': '18.3.0',
  },
  includeTailwind: true,
  includeTheme: true,
});
```

## Features

### Import Maps

The utility automatically generates import maps for:

- **React Core**: `react`, `react-dom`, `react-dom/client`, `react/jsx-runtime`
- **NPM Dependencies**: Extracted from code or provided explicitly

All packages are loaded from esm.sh CDN with proper versioning.

```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.3.0",
    "react-dom": "https://esm.sh/react-dom@18.3.0",
    "react-dom/client": "https://esm.sh/react-dom@18.3.0/client",
    "lucide-react": "https://esm.sh/lucide-react@0.344.0"
  }
}
</script>
```

### Automatic Dependency Detection

If you don't provide dependencies, they will be automatically extracted from the code:

```typescript
const html = generateStandaloneReactHTML({
  title: 'Icon Component',
  modules: [
    {
      path: '/App.js',
      code: "import { Heart } from 'lucide-react'; ...",
    },
  ],
  // dependencies are auto-detected from imports
});
```

### Tailwind CSS Support

By default, Tailwind CSS is included via CDN. You can disable it:

```typescript
const html = generateStandaloneReactHTML({
  title: 'No Tailwind',
  modules: [...],
  includeTailwind: false, // Disable Tailwind
});
```

### Theme Support

The utility includes shadcn/ui theme variables by default for consistent styling:

```typescript
const html = generateStandaloneReactHTML({
  title: 'Themed Component',
  modules: [...],
  includeTheme: true, // Default: includes theme CSS variables
});
```

Theme variables include:
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--muted`, `--muted-foreground`
- And more...

### Error Handling

Generated HTML includes built-in error handlers:

```javascript
// Runtime errors
window.addEventListener('error', (event) => {
  console.error('Runtime error:', event.error);
  // Shows error in UI if root is empty
});

// Unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
```

### Code Transformation

The utility automatically transforms export statements:

```typescript
// Input
export default function App() { return <div>Test</div>; }

// Output
function App() { return <div>Test</div>; }
```

This ensures compatibility with inline module scripts.

## Advanced Usage

### Multiple Modules

If you have multiple modules, ensure one is named `App.js` or `App.tsx`:

```typescript
const html = generateStandaloneReactHTML({
  title: 'Multi-Module App',
  modules: [
    { path: '/utils.js', code: 'export const helper = () => {};' },
    { path: '/App.js', code: 'export default function App() { ... }' }, // Main app
    { path: '/styles.css', code: 'body { margin: 0; }' },
  ],
});
```

### Explicit Dependencies

Provide dependencies explicitly for version control:

```typescript
const html = generateStandaloneReactHTML({
  title: 'Chart Component',
  modules: [...],
  dependencies: {
    'recharts': '^2.10.0',
    'framer-motion': '^11.0.0',
    'lucide-react': '^0.344.0',
  },
});
```

### Version Cleaning

Version strings are automatically cleaned:

```typescript
// Input
dependencies: {
  'package-a': '^1.2.3',
  'package-b': '~4.5.6',
  'package-c': '7.8.9',
}

// Output URLs
'package-a': 'https://esm.sh/package-a@1.2.3'
'package-b': 'https://esm.sh/package-b@4.5.6'
'package-c': 'https://esm.sh/package-c@7.8.9'
```

### Custom Styling

Disable Tailwind and theme for full control:

```typescript
const html = generateStandaloneReactHTML({
  title: 'Custom Styled',
  modules: [
    {
      path: '/App.js',
      code: `
        export default function App() {
          return (
            <div style={{ padding: '20px', color: 'blue' }}>
              Custom inline styles
            </div>
          );
        }
      `,
    },
  ],
  includeTailwind: false,
  includeTheme: false,
});
```

## Integration with Sandpack

### Getting Transpiled Code

To use this utility with Sandpack, you need to get the transpiled code:

```typescript
import { useSandpack } from '@codesandbox/sandpack-react';

function MyComponent() {
  const { sandpack } = useSandpack();

  const exportHTML = async () => {
    // Get transpiled modules from Sandpack
    const bundlerClient = sandpack.clients[sandpack.activeFile];
    const transpiledModules = await bundlerClient?.getTranspiledModules();

    // Generate HTML
    const html = generateStandaloneReactHTML({
      title: 'My Artifact',
      modules: transpiledModules.map(m => ({
        path: m.path,
        code: m.code,
      })),
    });

    // Download or display HTML
    downloadHTML(html, 'artifact.html');
  };

  return <button onClick={exportHTML}>Export HTML</button>;
}
```

### Direct Code Export

Alternatively, use the source code directly (without transpilation):

```typescript
const html = generateStandaloneReactHTML({
  title: 'My Component',
  modules: [
    {
      path: '/App.js',
      code: artifactContent, // Raw React code from artifact
    },
  ],
});
```

## Output Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Counter App</title>

  <!-- Import Map for ESM modules -->
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.3.0",
      "react-dom": "https://esm.sh/react-dom@18.3.0",
      "react-dom/client": "https://esm.sh/react-dom@18.3.0/client"
    }
  }
  </script>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- Theme CSS Variables -->
  <style>
    /* shadcn/ui theme variables */
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      /* ... more variables ... */
    }
  </style>
</head>
<body>
  <!-- React root -->
  <div id="root"></div>

  <!-- Error handler -->
  <script>
    window.addEventListener('error', (event) => { /* ... */ });
  </script>

  <!-- Transpiled modules -->
  <script type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { useState } from 'react';

    function App() {
      const [count, setCount] = useState(0);
      return React.createElement('div', null,
        React.createElement('h1', null, 'Count: ', count),
        React.createElement('button', {
          onClick: () => setCount(count + 1)
        }, 'Increment')
      );
    }

    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    root.render(React.createElement(App));
  </script>
</body>
</html>
```

## Utility Functions

### Download HTML to File

```typescript
function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Usage
const html = generateStandaloneReactHTML({ ... });
downloadHTML(html, 'my-artifact.html');
```

### Open HTML in New Window

```typescript
function openHTMLInNewWindow(html: string) {
  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}

// Usage
const html = generateStandaloneReactHTML({ ... });
openHTMLInNewWindow(html);
```

### Preview HTML in Iframe

```typescript
function previewHTML(html: string, iframeRef: HTMLIFrameElement) {
  iframeRef.srcdoc = html;
}

// Usage
const html = generateStandaloneReactHTML({ ... });
const iframe = document.querySelector('iframe');
previewHTML(html, iframe);
```

## Security Considerations

1. **XSS Protection**: The utility escapes HTML in the title to prevent XSS attacks
2. **CDN Trust**: Uses trusted CDN (esm.sh) for all package imports
3. **Module Isolation**: Generated code runs in browser context with standard security
4. **No Eval**: No use of `eval()` or dynamic code execution

## Limitations

1. **Module Resolution**: Only supports the main App.js/App.tsx module. Complex multi-file projects may need adaptation
2. **Build-Time Dependencies**: Cannot include dependencies that require build-time transformations
3. **Browser Support**: Requires modern browsers with ES modules and import maps support
4. **CDN Availability**: Depends on esm.sh CDN availability

## Browser Compatibility

- **Chrome/Edge**: 89+ (full support)
- **Firefox**: 108+ (full support)
- **Safari**: 16.4+ (full support)
- **Import Maps**: Required feature for ESM module imports

## Testing

Run tests with:

```bash
npm run test -- src/utils/__tests__/generateStandaloneReactHTML.test.ts
```

See `src/utils/__tests__/generateStandaloneReactHTML.example.ts` for comprehensive usage examples.

## Related Files

- **Implementation**: `src/utils/generateStandaloneReactHTML.ts`
- **Tests**: `src/utils/__tests__/generateStandaloneReactHTML.test.ts`
- **Examples**: `src/utils/__tests__/generateStandaloneReactHTML.example.ts`
- **Dependencies**:
  - `src/utils/npmDetection.ts` (dependency extraction)
  - `src/utils/themeUtils.ts` (theme CSS generation)

## Future Enhancements

Possible improvements:

1. Support for multiple module files with dependency resolution
2. CSS module support
3. Asset bundling (images, fonts)
4. Minification options
5. Custom CDN configuration
6. Service worker integration for offline support

## Troubleshooting

### "No App.js or App.tsx module found"

Ensure at least one module has a path ending with `/App.js` or `/App.tsx`:

```typescript
modules: [
  { path: '/App.js', code: '...' }, // ✅ Valid
]
```

### Dependencies not loading

Check that package names and versions are valid:

```typescript
dependencies: {
  'lucide-react': '^0.344.0', // ✅ Valid
  'invalid-pkg-@#$': 'latest', // ❌ Invalid
}
```

### Component not rendering

Ensure the component is exported as default:

```typescript
// ✅ Correct
export default function App() { return <div>Test</div>; }

// ❌ Incorrect (named export)
export function App() { return <div>Test</div>; }
```

### Import map errors

Modern browsers support import maps, but check compatibility:
- Update browser to latest version
- Use polyfill for older browsers if needed

## Support

For issues or questions:
1. Check the test files for usage examples
2. Review the example file for common patterns
3. Open an issue on the project repository
