/**
 * Utility for generating standalone HTML documents from React artifacts.
 *
 * This utility takes transpiled code modules from Sandpack and generates
 * a complete, runnable HTML document with all necessary dependencies loaded
 * via CDN (esm.sh for ESM modules, Tailwind CSS).
 *
 * Key features:
 * - Import maps for React and npm dependencies
 * - Tailwind CSS support
 * - Theme synchronization (shadcn/ui variables)
 * - Proper module resolution (maps Sandpack paths to imports)
 * - Error handling and console setup
 */

import { extractNpmDependencies } from '@/utils/npmDetection';
import { generateThemeCSS } from '@/utils/themeUtils';

/**
 * React and ReactDOM versions used in generated HTML
 */
const REACT_VERSION = '18.3.0';
const REACT_DOM_VERSION = '18.3.0';

/**
 * Module with transpiled code from Sandpack
 */
export interface TranspiledModule {
  path: string;
  code: string;
}

/**
 * Options for generating standalone React HTML
 */
export interface GenerateStandaloneReactHTMLOptions {
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

/**
 * Generates a complete standalone HTML document for a React artifact.
 *
 * The generated HTML includes:
 * - Import map for React, ReactDOM, and npm dependencies
 * - Tailwind CSS CDN (optional)
 * - Theme CSS variables for shadcn/ui (optional)
 * - Module scripts with transpiled code
 * - Root div and render logic
 *
 * @param options - Configuration options
 * @returns Complete HTML document as string
 *
 * @example
 * ```ts
 * const html = generateStandaloneReactHTML({
 *   title: 'My React Component',
 *   modules: [
 *     { path: '/App.js', code: 'export default function App() { ... }' }
 *   ],
 *   dependencies: { 'lucide-react': '^0.344.0' }
 * });
 * ```
 */
export function generateStandaloneReactHTML(
  options: GenerateStandaloneReactHTMLOptions
): string {
  const {
    title,
    modules,
    dependencies: providedDeps,
    includeTailwind = true,
    includeTheme = true,
  } = options;

  // Extract dependencies from code if not provided
  const allCode = modules.map(m => m.code).join('\n');
  const extractedDeps = providedDeps || extractNpmDependencies(allCode);

  // Generate import map
  const importMap = generateImportMap(extractedDeps);

  // Generate theme CSS if requested
  const themeCSS = includeTheme ? generateThemeCSS() : '';

  // Generate module scripts from transpiled code
  const moduleScripts = generateModuleScripts(modules);

  // Generate complete HTML document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>

  <!-- Import Map for ESM modules -->
  <script type="importmap">
${JSON.stringify(importMap, null, 2)}
  </script>
  ${includeTailwind ? '\n  <!-- Tailwind CSS -->\n  <script src="https://cdn.tailwindcss.com"></script>\n' : ''}${includeTheme ? `
  <!-- Theme CSS Variables -->
  <style>
${themeCSS}
    /* Base styles for body */
    body {
      margin: 0;
      padding: 16px;
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
                   Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>` : `
  <!-- Basic styles -->
  <style>
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
                   Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  </style>`}
</head>
<body>
  <!-- React root -->
  <div id="root"></div>

  <!-- Error handler -->
  <script>
    window.addEventListener('error', (event) => {
      console.error('Runtime error:', event.error);
      const root = document.getElementById('root');
      if (root && !root.hasChildNodes()) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 20px; color: red; border: 1px solid red; border-radius: 4px; margin: 20px;';
        const strong = document.createElement('strong');
        strong.textContent = 'Error: ';
        errorDiv.appendChild(strong);
        errorDiv.appendChild(document.createTextNode(event.message));
        root.innerHTML = ''; // Clear existing content
        root.appendChild(errorDiv);
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  </script>

  <!-- Transpiled modules -->
${moduleScripts}
</body>
</html>`;
}

/**
 * Generates import map for React and npm dependencies.
 * All packages are loaded from esm.sh CDN.
 *
 * @param dependencies - Record of package names to versions
 * @returns Import map object
 */
function generateImportMap(dependencies: Record<string, string>): {
  imports: Record<string, string>;
} {
  const imports: Record<string, string> = {
    // React core (fixed versions for stability)
    'react': `https://esm.sh/react@${REACT_VERSION}`,
    'react-dom': `https://esm.sh/react-dom@${REACT_DOM_VERSION}`,
    'react-dom/client': `https://esm.sh/react-dom@${REACT_DOM_VERSION}/client`,
    'react/jsx-runtime': `https://esm.sh/react@${REACT_VERSION}/jsx-runtime`,
  };

  // Add npm dependencies
  for (const [pkg, version] of Object.entries(dependencies)) {
    // Skip React core packages (already added)
    if (pkg === 'react' || pkg === 'react-dom') {
      continue;
    }

    // Clean version string (remove ^, ~, etc.)
    const cleanVersion = version.replace(/^[\^~]/, '');

    // Generate esm.sh URL with React as external dependency
    // This ensures packages like framer-motion, recharts, etc. use the same React instance from import map
    // The ?external parameter tells esm.sh not to bundle React, leaving it to be resolved by the import map
    imports[pkg] = `https://esm.sh/${pkg}@${cleanVersion}?external=react,react-dom`;
  }

  return { imports };
}

/**
 * Generates module scripts from transpiled code.
 * Maps Sandpack module paths to proper import statements.
 *
 * @param modules - Array of transpiled modules
 * @returns HTML script tags with module code
 */
function generateModuleScripts(modules: TranspiledModule[]): string {
  // Find the main App module (usually /App.js or /App.tsx)
  const appModule = modules.find(m =>
    m.path === '/App.js' ||
    m.path === '/App.tsx' ||
    m.path.endsWith('/App.js') ||
    m.path.endsWith('/App.tsx')
  );

  if (!appModule) {
    throw new Error('No App.js or App.tsx module found in modules array');
  }

  // Generate inline module script
  // We combine all modules into a single script block for simplicity
  const moduleCode = processModuleCode(appModule.code);

  return `  <script type="module">
    // Import React and ReactDOM
    import React from 'react';
    import ReactDOM from 'react-dom/client';

${indentCode(moduleCode, 4)}

    // Render App to root
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    try {
      const root = ReactDOM.createRoot(rootElement);
      root.render(React.createElement(App));
      console.log('App rendered successfully');
    } catch (error) {
      console.error('Failed to render app:', error);
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = 'padding: 20px; color: red; border: 1px solid red; border-radius: 4px; margin: 20px;';
      const strong = document.createElement('strong');
      strong.textContent = 'Render Error: ';
      errorDiv.appendChild(strong);
      errorDiv.appendChild(document.createTextNode(error.message || String(error)));
      rootElement.innerHTML = ''; // Clear existing content
      rootElement.appendChild(errorDiv);
    }
  </script>`;
}

/**
 * Processes transpiled module code to work in standalone HTML.
 * Handles import statements and export statements.
 *
 * @param code - Transpiled module code
 * @returns Processed code ready for inline script
 */
function processModuleCode(code: string): string {
  let processedCode = code;

  // Transform: export default function App() { ... }
  // Into: function App() { ... }
  processedCode = processedCode.replace(
    /export\s+default\s+function\s+(\w+)/g,
    'function $1'
  );

  // Handle: export default class App { ... }
  processedCode = processedCode.replace(
    /export\s+default\s+class\s+(\w+)/g,
    'class $1'
  );

  // Handle: export const App = () => { ... } (arrow functions)
  processedCode = processedCode.replace(
    /export\s+const\s+(\w+)\s*=/g,
    'const $1 ='
  );

  // Handle: export { App as default }
  processedCode = processedCode.replace(
    /export\s+\{\s*(\w+)\s+as\s+default\s*\}/g,
    '// Exported as default: $1'
  );

  // Transform: export default App
  // Into: // export default App (comment it out)
  processedCode = processedCode.replace(
    /export\s+default\s+(\w+);?$/gm,
    '// export default $1'
  );

  // Transform: const App = () => { ... }; export default App;
  // Keep the const, remove the export
  processedCode = processedCode.replace(
    /^export\s+default\s+(.+);?$/gm,
    '// export default $1'
  );

  // Add imports at the top of the code (extract and move them)
  const importStatements: string[] = [];
  processedCode = processedCode.replace(
    /import\s+(?:{[^}]+}|[\w*]+)(?:\s*,\s*{[^}]+})?\s+from\s+['"]([^'"]+)['"]/g,
    (match) => {
      importStatements.push(match);
      return ''; // Remove from code, will be added at top
    }
  );

  // Reconstruct with imports at top
  if (importStatements.length > 0) {
    processedCode = importStatements.join('\n') + '\n\n' + processedCode;
  }

  return processedCode.trim();
}

/**
 * Indents code by the specified number of spaces.
 *
 * @param code - Code to indent
 * @param spaces - Number of spaces to indent
 * @returns Indented code
 */
function indentCode(code: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return code.split('\n').map(line => indent + line).join('\n');
}

/**
 * Escapes HTML special characters to prevent XSS.
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}
