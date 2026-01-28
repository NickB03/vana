/**
 * Generates standalone HTML that re-renders a React artifact using Sandpack
 * in a pop-out window. This approach guarantees identical behavior to the
 * main app by using the same bundler/transpiler.
 *
 * Why this approach?
 * - Sandpack handles all JSX transpilation and module resolution
 * - No need to manually recreate import maps or resolve packages
 * - Any package Sandpack supports automatically works
 * - Same React version (18.3.0) as the main app
 */

export interface PopoutOptions {
  title: string;
  code: string;
  dependencies: Record<string, string>;
}

/**
 * Escapes HTML entities to safely embed strings in HTML
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates a complete HTML document that renders a React artifact using Sandpack.
 * The HTML loads Sandpack from esm.sh and renders the SandpackPreview component.
 */
export function generateSandpackPopoutHTML(options: PopoutOptions): string {
  const { title, code, dependencies } = options;

  // Escape code and dependencies for safe embedding in script
  const escapedCode = JSON.stringify(code);
  const escapedDeps = JSON.stringify(dependencies);
  const escapedTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { height: 100%; width: 100%; }
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: #0a0a0a;
      color: #a3a3a3;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #262626;
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      background: #0a0a0a;
      color: #ef4444;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 24px;
      text-align: center;
    }
    .error-message {
      max-width: 500px;
      background: #1c1917;
      border: 1px solid #7f1d1d;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }
    /* Hide Sandpack chrome - only show preview */
    .sp-wrapper { height: 100% !important; }
    .sp-layout { height: 100% !important; border: none !important; }
    .sp-stack { height: 100% !important; }
    .sp-preview-container { height: 100% !important; }
    .sp-preview-iframe { height: 100% !important; }
    .sp-preview-actions { display: none !important; }
  </style>
</head>
<body>
  <div id="root">
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading preview...</p>
    </div>
  </div>

  <script type="module">
    // Import React and Sandpack from esm.sh CDN
    // IMPORTANT: Do NOT add ?dev flag to React imports - it creates a separate module
    // instance that conflicts with Sandpack's internal React, causing useState errors
    import React from 'https://esm.sh/react@18.3.0';
    import { createRoot } from 'https://esm.sh/react-dom@18.3.0/client';
    import { SandpackProvider, SandpackPreview } from 'https://esm.sh/@codesandbox/sandpack-react@2.20.0?deps=react@18.3.0,react-dom@18.3.0';

    // Artifact code and dependencies (JSON-encoded)
    const code = ${escapedCode};
    const dependencies = ${escapedDeps};

    // Log for debugging
    console.log('[PopOut] Loading artifact:', ${JSON.stringify(escapedTitle)});
    console.log('[PopOut] Code length:', code.length);
    console.log('[PopOut] Dependencies:', dependencies);

    // Create the Sandpack preview app
    function PopoutApp() {
      return React.createElement(SandpackProvider, {
        template: 'react',
        files: {
          '/App.js': {
            code: code,
            active: true
          }
        },
        customSetup: {
          dependencies: {
            react: '18.3.0',
            'react-dom': '18.3.0',
            ...dependencies
          }
        },
        options: {
          externalResources: ['https://cdn.tailwindcss.com'],
          autorun: true,
          recompileMode: 'delayed',
          recompileDelay: 300
        }
      }, React.createElement(SandpackPreview, {
        showOpenInCodeSandbox: false,
        showRefreshButton: true,
        showNavigator: false,
        style: { height: '100%' }
      }));
    }

    // Error boundary for catching React errors
    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        console.error('[PopOut] React error:', error, errorInfo);
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', { className: 'error-container' },
            React.createElement('h2', null, 'Something went wrong'),
            React.createElement('div', { className: 'error-message' },
              this.state.error?.message || 'An unexpected error occurred'
            )
          );
        }
        return this.props.children;
      }
    }

    // Render the app with error boundary
    try {
      const root = createRoot(document.getElementById('root'));
      root.render(
        React.createElement(ErrorBoundary, null,
          React.createElement(PopoutApp)
        )
      );
      console.log('[PopOut] Render initiated successfully');
    } catch (error) {
      console.error('[PopOut] Failed to render:', error);
      document.getElementById('root').innerHTML = \`
        <div class="error-container">
          <h2>Failed to load preview</h2>
          <div class="error-message">\${error.message}</div>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
}
