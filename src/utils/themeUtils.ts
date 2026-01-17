/**
 * Theme utilities for artifact iframe synchronization
 * Extracts CSS variables from the active theme and generates theme-aware styles
 */

/**
 * Extracts all CSS custom properties from the document root
 * to synchronize theme with iframes
 */
export function extractThemeVariables(): Record<string, string> {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  const variables: Record<string, string> = {};

  // Extract all CSS variables defined in index.css theme classes
  const themeVars = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--popover',
    '--popover-foreground',
    '--primary',
    '--primary-foreground',
    '--secondary',
    '--secondary-foreground',
    '--muted',
    '--muted-foreground',
    '--accent',
    '--accent-foreground',
    '--destructive',
    '--destructive-foreground',
    '--border',
    '--input',
    '--ring',
    '--radius',
  ];

  themeVars.forEach((varName) => {
    const value = computedStyle.getPropertyValue(varName).trim();
    if (value) {
      variables[varName] = value;
    }
  });

  return variables;
}

/**
 * Generates CSS variable declarations for iframe injection
 * Uses the parent app's active theme values
 */
export function generateThemeCSS(): string {
  const variables = extractThemeVariables();

  const cssVarDeclarations = Object.entries(variables)
    .map(([key, value]) => `    ${key}: ${value};`)
    .join('\n');

  return `
    /* shadcn/ui theme variables from parent app */
    :root {
${cssVarDeclarations}
    }
  `;
}

/**
 * Generates theme-aware base styles for artifact iframes
 * Following shadcn/ui conventions with semantic color tokens
 */
export function generateIframeBaseStyles(): string {
  return `
    /* Base styles using shadcn/ui semantic tokens */
    * {
      border-color: hsl(var(--border));
    }

    body {
      margin: 0;
      padding: 1rem;
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
                   Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    /* Typography with proper contrast */
    h1, h2, h3, h4, h5, h6 {
      color: hsl(var(--foreground));
      font-weight: 600;
      line-height: 1.2;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }

    h1 { font-size: 2em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    h5 { font-size: 1em; }
    h6 { font-size: 0.9em; }

    p {
      margin: 0.75em 0;
    }

    /* Links with theme-aware colors */
    a {
      color: hsl(var(--primary));
      text-decoration: underline;
      text-decoration-color: hsl(var(--primary) / 0.3);
      transition: color 0.2s, text-decoration-color 0.2s;
    }

    a:hover {
      color: hsl(var(--primary) / 0.8);
      text-decoration-color: hsl(var(--primary) / 0.6);
    }

    /* Lists with proper contrast */
    ul, ol {
      margin: 0.75em 0;
      padding-left: 2em;
    }

    li {
      margin: 0.25em 0;
      color: hsl(var(--foreground));
    }

    /* Bullet points with better visibility */
    ul li::marker {
      color: hsl(var(--muted-foreground));
    }

    ol li::marker {
      color: hsl(var(--muted-foreground));
      font-weight: 600;
    }

    /* Code blocks */
    code {
      background-color: hsl(var(--muted));
      color: hsl(var(--foreground));
      padding: 0.125em 0.25em;
      border-radius: 0.25em;
      font-size: 0.9em;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    }

    pre {
      background-color: hsl(var(--muted));
      color: hsl(var(--foreground));
      padding: 1em;
      border-radius: 0.5em;
      overflow-x: auto;
      border: 1px solid hsl(var(--border));
    }

    pre code {
      background-color: transparent;
      padding: 0;
    }

    /* Tables */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }

    th, td {
      border: 1px solid hsl(var(--border));
      padding: 0.5em 0.75em;
      text-align: left;
    }

    th {
      background-color: hsl(var(--muted));
      color: hsl(var(--foreground));
      font-weight: 600;
    }

    tr:nth-child(even) {
      background-color: hsl(var(--muted) / 0.3);
    }

    /* Form elements */
    input, textarea, select {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
      border: 1px solid hsl(var(--input));
      border-radius: calc(var(--radius) - 2px);
      padding: 0.5em;
      font-family: inherit;
    }

    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: hsl(var(--ring));
      box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
    }

    button {
      background-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border: none;
      border-radius: calc(var(--radius) - 2px);
      padding: 0.5em 1em;
      font-family: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    button:hover {
      background-color: hsl(var(--primary) / 0.9);
    }

    button:active {
      background-color: hsl(var(--primary) / 0.8);
    }

    /* Blockquotes */
    blockquote {
      border-left: 4px solid hsl(var(--border));
      padding-left: 1em;
      margin: 1em 0;
      color: hsl(var(--muted-foreground));
      font-style: italic;
    }

    /* Horizontal rule */
    hr {
      border: none;
      border-top: 1px solid hsl(var(--border));
      margin: 2em 0;
    }

    /* Ensure images don't overflow */
    img {
      max-width: 100%;
      height: auto;
    }
  `;
}

/**
 * Generates complete iframe styles with theme synchronization
 * The data-theme-vars attribute allows dynamic theme updates via postMessage
 */
export function generateCompleteIframeStyles(): string {
  const themeCSS = generateThemeCSS();
  const baseStyles = generateIframeBaseStyles();

  return `<style data-theme-vars>
${themeCSS}
${baseStyles}
  </style>`;
}
