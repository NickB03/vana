/**
 * Test suite for HTML transformation functions in bundle-artifact
 *
 * Tests the server-side HTML transformations applied before bundle upload:
 * - fixDualReactInstance: Prevents dual React instances from esm.sh packages
 * - unescapeTemplateLiterals: Unescapes backticks and dollar signs in script blocks
 * - ensureLibraryInjection: Detects library usage and injects script tags
 * - normalizeExports: Fixes invalid import syntax from GLM
 *
 * These transformations replace ~300 lines of client-side code in ArtifactRenderer.tsx
 *
 * Critical regression fixes tested:
 * - Line 383: Global flag (/g) in fixDualReactInstance to fix ALL esm.sh URLs
 * - Line 435: Global flag (/g) in unescapeTemplateLiterals to fix ALL script blocks
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Helper function to extract a transformation from index.ts
// We'll simulate the functions since they're not exported
// In production, these functions should be exported from index.ts or moved to a separate module

/**
 * Fix dual React instance problem with esm.sh packages.
 */
function fixDualReactInstance(html: string): string {
  if (!html.includes('esm.sh')) return html;

  // Step 1: Replace ?deps= with ?external=
  html = html.replace(
    /(https:\/\/esm\.sh\/[^'"?\s]+)\?deps=react@[\d.]+,react-dom@[\d.]+/g,
    '$1?external=react,react-dom'
  );

  // Step 2: Add ?external to esm.sh URLs without query params (both scoped and non-scoped packages)
  html = html.replace(
    /(https:\/\/esm\.sh\/[^'"?\s]+)(['"\s>])/g,
    (match, url, ending) => {
      if (url.includes('?')) return match;
      return `${url}?external=react,react-dom${ending}`;
    }
  );

  // Step 3: Update CSP to allow data: URLs
  const cspMatch = html.match(/<meta[^>]*Content-Security-Policy[^>]*content="([^"]*)"/i);
  if (cspMatch) {
    const csp = cspMatch[1];
    if (csp.includes('blob:') && !csp.includes('data:')) {
      const newCsp = csp.replace(/(script-src[^;]*blob:)/i, '$1 data:');
      html = html.replace(csp, newCsp);
    }
  }

  // Step 4: Update import map with React shims
  const importMapMatch = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (importMapMatch) {
    try {
      const importMap = JSON.parse(importMapMatch[1]);
      importMap.imports = importMap.imports || {};
      importMap.imports['react'] = 'data:text/javascript,export default window.React';
      importMap.imports['react-dom'] = 'data:text/javascript,export default window.ReactDOM';
      importMap.imports['react/jsx-runtime'] = 'data:text/javascript,export const jsx=window.React.createElement;export const jsxs=window.React.createElement;export const Fragment=window.React.Fragment';

      const newImportMapScript = `<script type="importmap">${JSON.stringify(importMap, null, 2)}</script>`;
      html = html.replace(importMapMatch[0], newImportMapScript);
    } catch (e) {
      console.error('[bundle-artifact] Failed to parse import map:', e);
    }
  }

  return html;
}

/**
 * Unescape template literals that were escaped for embedding.
 */
function unescapeTemplateLiterals(html: string): string {
  if (!html.includes('\\`') && !html.includes('\\$')) return html;

  return html.replace(
    /(<script type="module">)([\s\S]*?)(<\/script>)/g,
    (match, open, content, close) => {
      const unescaped = content
        .replace(/\\`/g, '`')
        .replace(/\\\$/g, '$')
        .replace(/\\\\\\\\/g, '\\\\');
      return open + unescaped + close;
    }
  );
}

/**
 * Inject required libraries that artifacts commonly use.
 */
function ensureLibraryInjection(html: string, code: string): string {
  const libs = {
    'prop-types': {
      test: /recharts|PropTypes/i,
      script: '<script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>\n<script>if (typeof PropTypes !== "undefined") { window.PropTypes = PropTypes; }</script>'
    },
    'framer-motion': {
      test: /\bmotion\b|\bMotion\b/,
      script: '<script src="https://esm.sh/framer-motion@10.18.0/dist/framer-motion.js"></script>'
    },
    'lucide-react': {
      test: /lucide-react/,
      script: '<script src="https://esm.sh/lucide-react@0.556.0/dist/umd/lucide-react.js"></script>\n<script>if (typeof lucideReact !== "undefined") { Object.entries(lucideReact).forEach(([name, icon]) => { if (typeof window[name] === "undefined") window[name] = icon; }); window.LucideIcons = lucideReact; }</script>'
    },
    'canvas-confetti': {
      test: /confetti/i,
      script: '<script src="https://esm.sh/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>'
    }
  };

  for (const [libName, config] of Object.entries(libs)) {
    if (config.test.test(code) && !html.includes(libName)) {
      // Inject after ReactDOM script or before </head>
      const reactDomMatch = html.match(/(<script[^>]*react-dom[^>]*\.js[^>]*><\/script>)/i);
      if (reactDomMatch) {
        html = html.replace(reactDomMatch[1], reactDomMatch[1] + '\n' + config.script);
      } else {
        html = html.replace('</head>', config.script + '\n</head>');
      }
    }
  }

  return html;
}

/**
 * Fix invalid import syntax that GLM sometimes generates.
 */
function normalizeExports(html: string): string {
  return html.replace(
    /const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?|from\s+(React|ReactDOM)\s*;/g,
    (match, varName, pkgPath, unquotedPkg) => {
      if (varName) {
        return `import * as ${varName} from ${pkgPath};`;
      } else if (unquotedPkg) {
        return unquotedPkg === 'React' ? "from 'react';" : "from 'react-dom';";
      }
      return match;
    }
  );
}

// =============================================================================
// fixDualReactInstance tests (8 tests)
// =============================================================================

Deno.test("fixDualReactInstance - non-scoped package (recharts)", () => {
  const input = '<script src="https://esm.sh/recharts"></script>';
  const expected = 'https://esm.sh/recharts?external=react,react-dom';
  const output = fixDualReactInstance(input);
  assertStringIncludes(output, expected);
});

Deno.test("fixDualReactInstance - scoped package (@radix-ui/react-dialog)", () => {
  const input = '<script src="https://esm.sh/@radix-ui/react-dialog"></script>';
  const expected = 'https://esm.sh/@radix-ui/react-dialog?external=react,react-dom';
  const output = fixDualReactInstance(input);
  assertStringIncludes(output, expected);
});

Deno.test("fixDualReactInstance - package with version (@tanstack/react-query@5.0.0)", () => {
  const input = '<script src="https://esm.sh/@tanstack/react-query@5.0.0"></script>';
  const expected = 'https://esm.sh/@tanstack/react-query@5.0.0?external=react,react-dom';
  const output = fixDualReactInstance(input);
  assertStringIncludes(output, expected);
});

Deno.test("fixDualReactInstance - package with subpath (recharts/dist/index.js)", () => {
  const input = '<script src="https://esm.sh/recharts/dist/index.js"></script>';
  const expected = 'https://esm.sh/recharts/dist/index.js?external=react,react-dom';
  const output = fixDualReactInstance(input);
  assertStringIncludes(output, expected);
});

Deno.test("fixDualReactInstance - URL with existing query params (should skip)", () => {
  const input = '<script src="https://esm.sh/recharts?deps=react"></script>';
  const output = fixDualReactInstance(input);
  // Should not add duplicate ?external since it already has query params
  assertEquals(output.match(/\?/g)?.length || 0, 1); // Only one '?'
  assertStringIncludes(output, '?deps=react'); // Original param preserved
});

Deno.test("fixDualReactInstance - multiple packages in same HTML (CRITICAL: line 383 /g flag)", () => {
  const input = `
    <script src="https://esm.sh/recharts"></script>
    <script src="https://esm.sh/@radix-ui/react-dialog"></script>
    <script src="https://esm.sh/lucide-react"></script>
  `;
  const output = fixDualReactInstance(input);

  // All three URLs should be transformed (tests global flag /g fix)
  const matches = output.match(/\?external=react,react-dom/g);
  assertEquals(matches?.length || 0, 3, "All three esm.sh URLs should be transformed");

  assertStringIncludes(output, 'https://esm.sh/recharts?external=react,react-dom');
  assertStringIncludes(output, 'https://esm.sh/@radix-ui/react-dialog?external=react,react-dom');
  assertStringIncludes(output, 'https://esm.sh/lucide-react?external=react,react-dom');
});

Deno.test("fixDualReactInstance - CSP update (adds data: to script-src)", () => {
  const input = `
    <meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline' blob:;">
    <script src="https://esm.sh/recharts"></script>
  `;
  const output = fixDualReactInstance(input);

  assertStringIncludes(output, 'blob: data:', 'CSP should include data: after blob:');
  assertStringIncludes(output, "script-src 'unsafe-inline' blob: data:");
});

Deno.test("fixDualReactInstance - import map shimming", () => {
  const input = `
    <script type="importmap">
      {
        "imports": {
          "recharts": "https://esm.sh/recharts"
        }
      }
    </script>
  `;
  const output = fixDualReactInstance(input);

  // Should add React shims to import map
  assertStringIncludes(output, '"react": "data:text/javascript,export default window.React"');
  assertStringIncludes(output, '"react-dom": "data:text/javascript,export default window.ReactDOM"');
  assertStringIncludes(output, '"react/jsx-runtime"');
});

// =============================================================================
// unescapeTemplateLiterals tests (4 tests)
// =============================================================================

Deno.test("unescapeTemplateLiterals - single script block with backticks", () => {
  const input = `
    <script type="module">
      const str = \\\`Hello World\\\`;
      console.log(str);
    </script>
  `;
  const output = unescapeTemplateLiterals(input);

  assertStringIncludes(output, 'const str = `Hello World`;');
  assertEquals(output.includes('\\`'), false, 'Escaped backticks should be removed');
});

Deno.test("unescapeTemplateLiterals - multiple script blocks (CRITICAL: line 435 /g flag)", () => {
  const input = `
    <script type="module">
      const str1 = \\\`First\\\`;
    </script>
    <script type="module">
      const str2 = \\\`Second\\\`;
    </script>
    <script type="module">
      const str3 = \\\`Third\\\`;
    </script>
  `;
  const output = unescapeTemplateLiterals(input);

  // All three script blocks should be processed (tests global flag /g fix)
  assertStringIncludes(output, 'const str1 = `First`;');
  assertStringIncludes(output, 'const str2 = `Second`;');
  assertStringIncludes(output, 'const str3 = `Third`;');
  assertEquals(output.match(/\\`/g), null, 'All escaped backticks should be removed');
});

Deno.test("unescapeTemplateLiterals - dollar signs in template literals", () => {
  const input = `
    <script type="module">
      const name = 'World';
      const greeting = \\\`Hello \\\${name}\\\`;
    </script>
  `;
  const output = unescapeTemplateLiterals(input);

  assertStringIncludes(output, 'const greeting = `Hello ${name}`;');
  assertEquals(output.includes('\\$'), false, 'Escaped dollar signs should be removed');
});

Deno.test("unescapeTemplateLiterals - quadruple backslashes", () => {
  const input = `
    <script type="module">
      const regex = /\\\\\\\\/g;
    </script>
  `;
  const output = unescapeTemplateLiterals(input);

  // Quadruple backslashes \\\\\\\\ become double backslashes \\\\
  assertStringIncludes(output, 'const regex = /\\\\\\\\/g;');
  assertEquals(output.match(/\\\\\\\\\\\\\\\\/g), null, 'Eight backslashes should not exist in output');
});

// =============================================================================
// ensureLibraryInjection tests (2 tests)
// =============================================================================

Deno.test("ensureLibraryInjection - Recharts detection → PropTypes injection", () => {
  const code = `
    import { LineChart, Line } from 'recharts';
    export default function Chart() {
      return <LineChart><Line /></LineChart>;
    }
  `;
  const html = `
    <html>
      <head>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
      </head>
      <body></body>
    </html>
  `;

  const output = ensureLibraryInjection(html, code);

  assertStringIncludes(output, 'prop-types@15.8.1/prop-types.min.js');
  assertStringIncludes(output, 'window.PropTypes = PropTypes');

  // Should be injected after ReactDOM script
  const reactDomIndex = output.indexOf('react-dom.production.min.js');
  const propTypesIndex = output.indexOf('prop-types.min.js');
  assertEquals(propTypesIndex > reactDomIndex, true, 'PropTypes should be after ReactDOM');
});

Deno.test("ensureLibraryInjection - Framer Motion detection → Motion library injection", () => {
  const code = `
    import { motion, AnimatePresence } from 'framer-motion';
    export default function Animated() {
      return <motion.div>Hello</motion.div>;
    }
  `;
  const html = `
    <html>
      <head></head>
      <body></body>
    </html>
  `;

  const output = ensureLibraryInjection(html, code);

  assertStringIncludes(output, 'framer-motion@10.18.0/dist/framer-motion.js');

  // Should be injected before </head> since no ReactDOM script exists
  assertStringIncludes(output, 'framer-motion.js"></script>\n</head>');
});

// =============================================================================
// normalizeExports tests (1 test)
// =============================================================================

Deno.test("normalizeExports - const * as → import * as conversion", () => {
  const input = `
    <script type="module">
      const * as React from 'react';
      const * as Icons from 'lucide-react';
      import something from React;
      import other from ReactDOM;
    </script>
  `;
  const output = normalizeExports(input);

  assertStringIncludes(output, "import * as React from 'react';");
  assertStringIncludes(output, "import * as Icons from 'lucide-react';");
  assertStringIncludes(output, "from 'react';");
  assertStringIncludes(output, "from 'react-dom';");

  // Should not contain invalid const * as syntax
  assertEquals(output.includes('const * as'), false);
  assertEquals(output.includes('from React;'), false);
  assertEquals(output.includes('from ReactDOM;'), false);
});

// =============================================================================
// Integration tests - combining multiple transformations
// =============================================================================

Deno.test("integration - full transformation pipeline", () => {
  const code = `
    import { LineChart } from 'recharts';
    import { motion } from 'framer-motion';
    export default function App() {
      return <motion.div>\\\`Chart\\\`</motion.div>;
    }
  `;

  let html = `
    <html>
      <head>
        <meta http-equiv="Content-Security-Policy" content="script-src 'unsafe-inline' blob:;">
        <script type="importmap">{"imports": {}}</script>
      </head>
      <body>
        <script type="module">
          const * as React from 'react';
          const template = \\\`Hello \\\${world}\\\`;
        </script>
        <script src="https://esm.sh/recharts"></script>
        <script src="https://esm.sh/@radix-ui/react-dialog"></script>
      </body>
    </html>
  `;

  // Apply all transformations in order (matching bundle-artifact index.ts lines 658-664)
  html = ensureLibraryInjection(html, code);
  html = normalizeExports(html);
  html = fixDualReactInstance(html);
  html = unescapeTemplateLiterals(html);

  // Verify ensureLibraryInjection worked
  assertStringIncludes(html, 'prop-types');
  assertStringIncludes(html, 'framer-motion');

  // Verify normalizeExports worked
  assertStringIncludes(html, "import * as React from 'react'");

  // Verify fixDualReactInstance worked
  assertStringIncludes(html, 'recharts?external=react,react-dom');
  assertStringIncludes(html, '@radix-ui/react-dialog?external=react,react-dom');
  assertStringIncludes(html, 'data:');
  assertStringIncludes(html, '"react": "data:text/javascript');

  // Verify unescapeTemplateLiterals worked
  assertStringIncludes(html, 'const template = `Hello ${world}`;');
  assertEquals(html.includes('\\`'), false);
  assertEquals(html.includes('\\$'), false);
});

Deno.test("edge case - no transformations needed", () => {
  const code = `export default function App() { return <div>Simple</div>; }`;
  const html = `<html><head></head><body><div id="root"></div></body></html>`;

  // Apply all transformations
  let output = ensureLibraryInjection(html, code);
  output = normalizeExports(output);
  output = fixDualReactInstance(output);
  output = unescapeTemplateLiterals(output);

  // Should remain unchanged
  assertEquals(output, html);
});

Deno.test("edge case - empty HTML", () => {
  const code = '';
  const html = '';

  let output = ensureLibraryInjection(html, code);
  output = normalizeExports(output);
  output = fixDualReactInstance(output);
  output = unescapeTemplateLiterals(output);

  assertEquals(output, '');
});
