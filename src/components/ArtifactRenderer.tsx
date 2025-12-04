import { Suspense, useRef, useEffect, useState, memo, useMemo, useCallback } from "react";
import { ArtifactData } from "./ArtifactContainer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Markdown } from "./prompt-kit/markdown";
import { generateCompleteIframeStyles } from "@/utils/themeUtils";
import { ArtifactSkeleton } from "@/components/ui/artifact-skeleton";
import { WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewUrl, WebPreviewNavigationButton } from '@/components/ai-elements/web-preview';
import { RefreshCw, Maximize2, Download, Edit } from "lucide-react";
import { ValidationResult, categorizeError } from "@/utils/artifactValidator";
import { detectNpmImports } from '@/utils/npmDetection';
import { lazy } from "react";
import { classifyError, shouldAttemptRecovery, getFallbackRenderer, ArtifactError } from "@/utils/artifactErrorRecovery";
import { ArtifactErrorRecovery } from "./ArtifactErrorRecovery";

// Lazy load Sandpack component for code splitting
const SandpackArtifactRenderer = lazy(() =>
  import('./SandpackArtifactRenderer').then(module => ({
    default: module.SandpackArtifactRenderer
  }))
);

/**
 * BundledArtifactFrame - Renders server-bundled artifacts via blob URL
 *
 * Supabase storage sets X-Frame-Options headers that block direct iframe embedding.
 * This component fetches the bundle content and creates a blob URL, which bypasses
 * those restrictions while maintaining security (content is validated by origin check).
 *
 * ## React Instance Unification (Fixed 2025-11-27)
 *
 * Problem: esm.sh packages with `?deps=react@18` bundled their own React copy internally.
 * When Radix UI components called hooks like useRef(), they called it on their bundled
 * React instance, but the component tree was rendered with window.React (UMD).
 * This caused "Cannot read properties of null (reading 'useRef')" errors.
 *
 * Solution:
 * 1. Replace `?deps=` with `?external=react,react-dom` on esm.sh URLs
 * 2. Add import map shims that redirect `react`/`react-dom` to window.React
 * 3. Add JSX runtime shim with jsx/jsxs/Fragment exports
 * 4. Ensure parent CSP (index.html) allows `data:` URLs for shim modules
 *
 * See lines 204-294 for implementation details.
 */
interface BundledArtifactFrameProps {
  bundleUrl: string;
  title: string;
  dependencies?: string[];
  isLoading: boolean;
  previewError: string | null;
  onLoadingChange: (loading: boolean) => void;
  onPreviewErrorChange: (error: string | null) => void;
}

const BundledArtifactFrame = memo(({
  bundleUrl,
  title,
  dependencies,
  isLoading,
  previewError,
  onLoadingChange,
  onPreviewErrorChange,
}: BundledArtifactFrameProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchBundle = async () => {
      try {
        console.log('[BundledArtifactFrame] Fetching bundle from:', bundleUrl);
        onLoadingChange(true);
        setFetchError(null);

        const response = await fetch(bundleUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch bundle: ${response.status} ${response.statusText}`);
        }

        let htmlContent = await response.text();

        // FIX: Apply client-side syntax fixes for bundles created before server-side fixes were deployed
        // GLM sometimes generates "const * as X from 'pkg'" which is invalid JavaScript
        // Transform to proper "import * as X from 'pkg'" syntax

        // Debug: Check if problematic pattern exists in the HTML
        const constStarMatches = htmlContent.match(/const\s*\*\s*as/g);
        if (constStarMatches) {
          console.log('[BundledArtifactFrame] Found "const * as" patterns:', constStarMatches.length);
          // Debug: show the exact matches in context
          const contextMatches = htmlContent.match(/.{0,30}const\s*\*\s*as.{0,50}/g);
          if (contextMatches) {
            console.log('[BundledArtifactFrame] Context of matches:', contextMatches);
          }
        }

        // Fix: Transform "const * as X from 'pkg'" to "import * as X from 'pkg'"
        // Note: The pattern may be escaped differently in the HTML template string
        const beforeReplace = htmlContent;
        htmlContent = htmlContent.replace(
          /const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?/g,
          'import * as $1 from $2;'
        );

        if (beforeReplace !== htmlContent) {
          console.log('[BundledArtifactFrame] Successfully transformed const * as patterns');
        } else if (constStarMatches) {
          console.log('[BundledArtifactFrame] WARNING: Found patterns but replacement did not match');
        }

        // Also fix unquoted package names: "from React;" -> "from 'react';"
        htmlContent = htmlContent.replace(/from\s+React\s*;/g, "from 'react';");
        htmlContent = htmlContent.replace(/from\s+ReactDOM\s*;/g, "from 'react-dom';");

        // CLIENT-SIDE FIX: Inject missing libraries and globals into bundles created before server fix
        // Framer Motion UMD uses window.React which is set by the UMD React script.
        // Since we're using ?external=react,react-dom for esm.sh packages, they'll also use
        // window.React via import map shims, so everything shares the same React instance.

        // Check if PropTypes library is missing (CRITICAL: Required by Recharts and other UMD libs)
        // PropTypes was removed from React 15.5+ and is now a separate package
        // Many UMD libraries (like Recharts) expect window.PropTypes to be available
        if (!htmlContent.includes('prop-types')) {
          console.log('[BundledArtifactFrame] Injecting PropTypes library (required for Recharts)');
          const propTypesScript = `
  <!-- Injected: PropTypes library for component validation -->
  <script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
  <script>
    if (typeof PropTypes !== 'undefined') {
      console.log('PropTypes injected successfully');
      window.PropTypes = PropTypes;
    }
  </script>`;
          // CRITICAL: PropTypes must load BEFORE any library that uses it (like Recharts)
          // Inject after ReactDOM script
          const reactDomScriptMatch = htmlContent.match(/(<script[^>]*react-dom[^>]*\.js[^>]*><\/script>)/i);
          if (reactDomScriptMatch) {
            htmlContent = htmlContent.replace(reactDomScriptMatch[1], reactDomScriptMatch[1] + propTypesScript);
          } else {
            // Fallback: inject before </head>
            htmlContent = htmlContent.replace('</head>', propTypesScript + '\n</head>');
          }
        }

        const needsFramerMotion = !htmlContent.includes('framer-motion') &&
          (htmlContent.includes('motion.') || htmlContent.includes('Motion') || htmlContent.includes('AnimatePresence'));
        if (needsFramerMotion) {
          console.log('[BundledArtifactFrame] Injecting Framer Motion UMD library');
          // Use Framer Motion v10 which has better UMD compatibility with React 18
          // v11 has stricter requirements that cause "useRef" errors
          const framerScript = `
  <!-- Injected: Framer Motion v10 for animations (better UMD compatibility) -->
  <script crossorigin src="https://unpkg.com/framer-motion@10.18.0/dist/framer-motion.js"></script>
  <script>
    // Wait for script to fully load and check for Motion global
    (function checkMotion() {
      if (typeof Motion !== 'undefined' && Motion.motion) {
        console.log('Framer Motion injected successfully');
        window.motion = Motion.motion;
        window.AnimatePresence = Motion.AnimatePresence;
        // Expose utilities
        if (Motion.useAnimation) window.useAnimation = Motion.useAnimation;
        if (Motion.useMotionValue) window.useMotionValue = Motion.useMotionValue;
        if (Motion.useTransform) window.useTransform = Motion.useTransform;
      } else {
        console.warn('Framer Motion not yet available, waiting...');
        setTimeout(checkMotion, 50);
      }
    })();
  </script>`;
          // IMPORTANT: Framer Motion UMD needs BOTH React AND ReactDOM loaded first
          // Try to inject after ReactDOM script (which comes after React)
          const reactDomScriptMatch = htmlContent.match(/(<script[^>]*react-dom[^>]*\.js[^>]*><\/script>)/i);
          if (reactDomScriptMatch) {
            htmlContent = htmlContent.replace(reactDomScriptMatch[1], reactDomScriptMatch[1] + framerScript);
          } else {
            // Fallback: inject before </head>
            htmlContent = htmlContent.replace('</head>', framerScript + '\n</head>');
          }
        }

        // Check if canvas-confetti script is missing
        if (!htmlContent.includes('canvas-confetti') && htmlContent.includes('canvasConfetti')) {
          console.log('[BundledArtifactFrame] Injecting canvas-confetti library');
          const confettiScript = `
  <!-- Injected: Canvas Confetti for celebrations -->
  <script crossorigin src="https://unpkg.com/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>
  <script>
    if (typeof confetti !== 'undefined') {
      window.canvasConfetti = { create: confetti.create || confetti, reset: confetti.reset };
      window.confetti = confetti;
    }
  </script>`;
          htmlContent = htmlContent.replace('</head>', confettiScript + '\n</head>');
        }

        // Check if React hooks are NOT exposed as globals
        // Old bundles strip "const { useState } = React" but don't expose hooks globally
        if (!htmlContent.includes('window.useState = React.useState') && htmlContent.includes('useState(')) {
          console.log('[BundledArtifactFrame] Injecting React hook globals');
          const hooksScript = `
  <script>
    // Injected: React hooks as globals
    if (typeof React !== 'undefined') {
      window.useState = React.useState;
      window.useEffect = React.useEffect;
      window.useCallback = React.useCallback;
      window.useMemo = React.useMemo;
      window.useRef = React.useRef;
      window.useContext = React.useContext;
      window.useReducer = React.useReducer;
      window.useLayoutEffect = React.useLayoutEffect;
    }
  </script>`;
          // Inject after React script
          htmlContent = htmlContent.replace(
            /(<script[^>]*react\.production\.min\.js[^>]*><\/script>)/,
            '$1' + hooksScript
          );
        }

        // CRITICAL FIX: Server-side escaping bug produces invalid JS
        // The bundle-artifact function escapes backticks and dollar signs for template literal embedding,
        // but those escapes persist in the final HTML, causing "Invalid or unexpected token" errors.
        // We need to unescape them for the browser to parse correctly.
        if (htmlContent.includes('\\`') || htmlContent.includes('\\$')) {
          console.log('[BundledArtifactFrame] Unescaping template literal characters');
          // Only unescape within the module script to avoid breaking other parts of the HTML
          htmlContent = htmlContent.replace(
            /(<script type="module">)([\s\S]*?)(<\/script>)/,
            (match, open, content, close) => {
              // Unescape: \` -> ` and \$ -> $ and \\\\ -> \\
              const unescaped = content
                .replace(/\\`/g, '`')
                .replace(/\\\$/g, '$')
                .replace(/\\\\\\\\/g, '\\\\'); // Double-escaped backslashes
              return open + unescaped + close;
            }
          );
        }

        // CRITICAL FIX: Dual React instance problem
        // The bundle loads React via UMD (unpkg), but esm.sh packages with ?deps= still
        // bundle their own internal React copy. This causes "Cannot read properties of null
        // (reading 'useRef')" errors because Radix UI hooks call useRef on their bundled
        // React, not window.React.
        //
        // SOLUTION: Change ?deps= to ?external=react,react-dom which tells esm.sh to NOT
        // bundle React internally, but instead import it from the import map. The import map
        // shims redirect react/react-dom to window.React/window.ReactDOM (from UMD).
        if (htmlContent.includes('esm.sh')) {
          console.log('[BundledArtifactFrame] Fixing dual React instance - using external React');

          // Step 1: Replace ?deps= with ?external= on ALL esm.sh URLs
          // This tells esm.sh to not bundle React, but import it externally
          htmlContent = htmlContent.replace(
            /(https:\/\/esm\.sh\/[^'"?\s]+)\?deps=react@[\d.]+,react-dom@[\d.]+/g,
            '$1?external=react,react-dom'
          );

          // Also handle URLs that might already have ?external but with wrong deps
          // And add ?external to any esm.sh URLs that have neither
          htmlContent = htmlContent.replace(
            /(https:\/\/esm\.sh\/@[^'"?\s]+)(['"\s>])/g,
            (match, url, ending) => {
              // If URL already has query params, skip
              if (url.includes('?')) return match;
              // Add external parameter for React packages
              return `${url}?external=react,react-dom${ending}`;
            }
          );

          // Step 2: Update CSP to allow data: URLs for import map shims
          // The import map uses data:text/javascript shims to redirect react/react-dom to window globals
          // Match CSP meta tag specifically and add data: after blob:
          const cspMetaMatch = htmlContent.match(/<meta[^>]*Content-Security-Policy[^>]*content="([^"]*)"/i);
          if (cspMetaMatch) {
            const cspContent = cspMetaMatch[1];
            console.log('[BundledArtifactFrame] Found CSP:', cspContent.substring(0, 200));

            if (cspContent.includes('blob:') && !cspContent.includes('data:')) {
              console.log('[BundledArtifactFrame] CSP needs data: - adding it');
              const newCspContent = cspContent.replace(/(script-src[^;]*blob:)/i, '$1 data:');
              htmlContent = htmlContent.replace(cspContent, newCspContent);
              console.log('[BundledArtifactFrame] Updated CSP script-src with data:');
            } else {
              console.log('[BundledArtifactFrame] CSP already has data: or no blob:');
            }
          } else {
            console.log('[BundledArtifactFrame] No CSP meta tag found');
          }

          // Step 3: Update import map to include 'react' and 'react-dom' entries
          // The esm.sh packages with ?external=react,react-dom will import 'react' (bare specifier)
          // We need to redirect these to shims that export window.React/window.ReactDOM
          const importMapMatch = htmlContent.match(/<script type="importmap">([\s\S]*?)<\/script>/);
          if (importMapMatch) {
            try {
              const importMap = JSON.parse(importMapMatch[1]);
              importMap.imports = importMap.imports || {};

              // Use the existing shim URLs if present, or create new ones
              // The shims export window.React/window.ReactDOM which were loaded via UMD
              const reactShim = importMap.imports['react-shim'] ||
                "data:text/javascript,const R=window.React;export default R;export const{useState,useEffect,useRef,useMemo,useCallback,useContext,createContext,createElement,Fragment,memo,forwardRef,useReducer,useLayoutEffect,useImperativeHandle,useDebugValue,useDeferredValue,useTransition,useId,useSyncExternalStore,useInsertionEffect,lazy,Suspense,startTransition,Children,cloneElement,isValidElement,createRef,Component,PureComponent,StrictMode}=R;";
              const reactDomShim = importMap.imports['react-dom-shim'] ||
                "data:text/javascript,const D=window.ReactDOM;export default D;export const{createRoot,hydrateRoot,createPortal,flushSync,findDOMNode,unmountComponentAtNode,render,hydrate}=D;";
              // JSX Runtime shim - esm.sh packages use the modern JSX transform which imports jsx/jsxs from react/jsx-runtime
              // React 18+ exposes these on the main React object or we can construct them from createElement
              // Note: Fragment must be React.Fragment (a symbol), not the React object itself
              const jsxRuntimeShim = "data:text/javascript,const R=window.React;const Fragment=R.Fragment;const jsx=(type,props,key)=>R.createElement(type,{...props,key});const jsxs=jsx;export{jsx,jsxs,Fragment};";

              // Add bare specifier entries that point to the shims
              importMap.imports['react'] = reactShim;
              importMap.imports['react-dom'] = reactDomShim;
              importMap.imports['react-dom/client'] = reactDomShim;
              importMap.imports['react/jsx-runtime'] = jsxRuntimeShim;
              importMap.imports['react/jsx-dev-runtime'] = jsxRuntimeShim;

              htmlContent = htmlContent.replace(
                /<script type="importmap">[\s\S]*?<\/script>/,
                `<script type="importmap">\n${JSON.stringify(importMap, null, 2)}\n</script>`
              );

              console.log('[BundledArtifactFrame] Updated import map with react/react-dom shims');
            } catch (e) {
              console.warn('[BundledArtifactFrame] Failed to update import map:', e);
            }
          }

          console.log('[BundledArtifactFrame] Converted esm.sh URLs to use external React');
        }

        // CRITICAL FIX: The bundle contains raw JSX which browsers can't parse natively.
        // We need to convert the <script type="module"> to <script type="text/babel">
        // and inject Babel Standalone for runtime transpilation.

        // Check if bundle has JSX (component tags like <Component or <div)
        const hasJsx = /<(?:[A-Z][a-zA-Z]*|[a-z]+)[\s>/]/.test(htmlContent) &&
          htmlContent.includes('<script type="module">');

        if (hasJsx) {
          console.log('[BundledArtifactFrame] Detected JSX in bundle - adding Babel transpilation');

          // Inject Babel Standalone if not present
          if (!htmlContent.includes('babel')) {
            const babelScript = `<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n`;
            htmlContent = htmlContent.replace('</head>', babelScript + '</head>');
          }

          // Convert module script to babel script
          // First, extract the module content
          const moduleMatch = htmlContent.match(/<script type="module">([\s\S]*?)<\/script>/);
          if (moduleMatch) {
            let moduleContent = moduleMatch[1];

            // Extract imports from the module content (they need special handling for Babel)
            // NOTE: Server template indents imports with spaces, so we use ^\s* to match leading whitespace
            const importStatements: string[] = [];
            moduleContent = moduleContent.replace(
              /^\s*import\s+(?:[\w*{}\s,]+\s+from\s+)?['"][^'"]+['"];?\s*$/gm,
              (match) => {
                // Trim the captured match since it may have leading/trailing whitespace
                importStatements.push(match.trim());
                return ''; // Remove from main content
              }
            );

            // For Babel, we need to use dynamic imports since static imports don't work in text/babel
            // Convert: import * as Select from 'url' -> const Select = await import('url')
            const dynamicImports = importStatements.map(imp => {
              // Handle: import * as Name from 'url'
              const namespaceMatch = imp.match(/import\s*\*\s*as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
              if (namespaceMatch) {
                return `const ${namespaceMatch[1]} = await import('${namespaceMatch[2]}');`;
              }
              // Handle: import { a, b } from 'url'
              const namedMatch = imp.match(/import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/);
              if (namedMatch) {
                const names = namedMatch[1].split(',').map(n => n.trim());
                return `const { ${names.join(', ')} } = await import('${namedMatch[2]}');`;
              }
              // Handle: import Name from 'url'
              const defaultMatch = imp.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
              if (defaultMatch) {
                return `const { default: ${defaultMatch[1]} } = await import('${defaultMatch[2]}');`;
              }
              // Log warning for debugging when import cannot be converted
              console.warn('[BundledArtifactFrame] Could not convert import statement:', imp);
              return '// Could not convert: ' + imp;
            }).join('\n');

            // Wrap in async IIFE for dynamic imports
            // NOTE: UMD React/ReactDOM are already loaded and set window.React/window.ReactDOM
            // The import map shims redirect 'react' and 'react-dom' to window globals
            // esm.sh packages with ?external=react,react-dom will use the import map

            // FIX: Check if dynamic imports already include react-shim (which exports hooks)
            // If so, skip adding duplicate hook declarations to avoid "already declared" error
            const hasReactShimImport = dynamicImports.includes("'react-shim'") ||
                                       dynamicImports.includes("'react'");

            const reactHooksDeclaration = hasReactShimImport
              ? '// React hooks imported via react-shim above'
              : 'const { useState, useEffect, useCallback, useMemo, useRef, useContext, useReducer, useLayoutEffect, createContext, createElement, Fragment, memo, forwardRef } = window.React;';

            const wrappedContent = `
(async () => {
  // Verify UMD React is available (loaded by <script> tags before this runs)
  if (!window.React || !window.ReactDOM) {
    throw new Error('React not loaded - UMD scripts may have failed');
  }
  console.log('[Artifact] Using UMD React ' + window.React.version);

  // Load user dependencies (esm.sh packages with ?external=react,react-dom will use import map shims)
  ${dynamicImports}

  // Expose React hooks globally for component code that uses them directly
  // (Only if not already imported from react-shim)
  ${reactHooksDeclaration}

  // Run component code
  ${moduleContent}
})();`;

            // Replace the module script with a babel script
            htmlContent = htmlContent.replace(
              /<script type="module">[\s\S]*?<\/script>/,
              `<script type="text/babel" data-presets="react">${wrappedContent}</script>`
            );

            console.log('[BundledArtifactFrame] Converted to Babel script with dynamic imports');
          }
        }

        // Create blob URL from the fetched HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          console.log('[BundledArtifactFrame] Created blob URL successfully');
          setBlobUrl(objectUrl);
        }
      } catch (error) {
        console.error('[BundledArtifactFrame] Failed to fetch bundle:', error);
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load bundle';
          setFetchError(errorMessage);
          onPreviewErrorChange(errorMessage);
          onLoadingChange(false);
          window.postMessage({ type: 'artifact-rendered-complete', success: false, error: errorMessage }, '*');
        }
      }
    };

    fetchBundle();

    // Cleanup: revoke blob URL when component unmounts or bundleUrl changes
    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bundleUrl, onLoadingChange, onPreviewErrorChange]);

  return (
    <div className="w-full h-full relative flex flex-col">
      <div className="flex-1 relative">
        {(isLoading || !blobUrl) && !fetchError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
            <ArtifactSkeleton type="react" />
          </div>
        )}
        {(previewError || fetchError) && !isLoading && (
          <div className="absolute top-2 left-2 right-2 bg-destructive/10 border border-destructive text-destructive text-xs p-3 rounded z-10 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <span className="font-semibold shrink-0">⚠️ Bundle Error:</span>
              <span className="flex-1 break-words font-mono">{previewError || fetchError}</span>
            </div>
            <div className="flex gap-2 pl-6">
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(previewError || fetchError || '');
                  toast.success("Error copied to clipboard");
                }}
              >
                Copy Error
              </Button>
            </div>
          </div>
        )}
        {dependencies && dependencies.length > 0 && (
          <div className="absolute bottom-2 right-2 bg-primary/10 border border-primary/20 text-xs px-2 py-1 rounded z-10">
            Bundled with {dependencies.join(', ')}
          </div>
        )}
        {blobUrl && (
          <iframe
            src={blobUrl}
            className="w-full h-full border-0 bg-background"
            title={title}
            sandbox="allow-scripts allow-same-origin"
            onLoad={() => {
              onLoadingChange(false);
              // Ensure we signal completion when iframe loads (fallback for bundles that don't signal)
              window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
              // Signal to parent that artifact has finished rendering
              window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
            }}
            onError={(e) => {
              console.error('[BundledArtifactFrame] iframe error:', e);
              onPreviewErrorChange('Failed to render bundled artifact');
              onLoadingChange(false);
              window.postMessage({ type: 'artifact-rendered-complete', success: false, error: 'Failed to render bundled artifact' }, '*');
            }}
          />
        )}
      </div>
    </div>
  );
});

BundledArtifactFrame.displayName = 'BundledArtifactFrame';

interface ArtifactRendererProps {
  artifact: ArtifactData;
  isLoading: boolean;
  previewError: string | null;
  errorCategory: 'syntax' | 'runtime' | 'import' | 'unknown';
  validation: ValidationResult | null;
  injectedCDNs: string;
  themeRefreshKey: number;
  isEditingCode: boolean;
  editedContent: string;
  isFixingError: boolean;
  onEditedContentChange: (content: string) => void;
  onRefresh: () => void;
  onFullScreen: () => void;
  onEdit?: (suggestion?: string) => void;
  onAIFix: () => void;
  onLoadingChange: (loading: boolean) => void;
  onPreviewErrorChange: (error: string | null) => void;
  onErrorCategoryChange: (category: 'syntax' | 'runtime' | 'import' | 'unknown') => void;
}

export const ArtifactRenderer = memo(({
  artifact,
  isLoading,
  previewError,
  errorCategory,
  validation,
  injectedCDNs,
  themeRefreshKey,
  isEditingCode,
  editedContent,
  isFixingError,
  onEditedContentChange,
  onRefresh,
  onFullScreen,
  onEdit,
  onAIFix,
  onLoadingChange,
  onPreviewErrorChange,
  onErrorCategoryChange,
}: ArtifactRendererProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  // Error recovery state
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [currentError, setCurrentError] = useState<ArtifactError | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  const [currentRenderer, setCurrentRenderer] = useState<'bundle' | 'sandpack' | 'babel'>(
    artifact.bundleUrl ? 'bundle' : detectNpmImports(artifact.content) ? 'sandpack' : 'babel'
  );
  const MAX_RECOVERY_ATTEMPTS = 2;

  // Refs for cleanup and preventing state updates after unmount
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup effect for mounted state and timeout
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  // Watchdog timer: Force completion if rendering takes too long (15s)
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        console.warn('[ArtifactRenderer] Watchdog timer fired - forcing completion');
        onLoadingChange(false);
        window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onLoadingChange]);

  // Map error type to error category for parent component
  const mapErrorTypeToCategory = useCallback((type: string): 'syntax' | 'runtime' | 'import' | 'unknown' => {
    if (type === 'syntax' || type === 'runtime' || type === 'import') {
      return type;
    }
    return 'unknown';
  }, []);

  // Handle fallback renderer
  const handleUseFallback = useCallback(() => {
    if (!currentError) return;

    const fallback = getFallbackRenderer(currentError, currentRenderer);
    if (fallback) {
      setRecoveryAttempts(prev => prev + 1);
      setCurrentRenderer(fallback === 'sandpack' ? 'sandpack' : 'babel');
      setCurrentError(null);
      onRefresh();
    }
  }, [currentError, currentRenderer, onRefresh]);

  // Handle artifact errors with recovery logic
  const handleArtifactError = useCallback((errorMessage: string) => {
    const classifiedError = classifyError(errorMessage);
    setCurrentError(classifiedError);

    // Update existing error handlers
    onPreviewErrorChange(errorMessage);
    onErrorCategoryChange(mapErrorTypeToCategory(classifiedError.type));

    // Check if automatic recovery should be attempted
    if (shouldAttemptRecovery(classifiedError, recoveryAttempts, MAX_RECOVERY_ATTEMPTS)) {
      if (classifiedError.retryStrategy === 'with-fix' && classifiedError.canAutoFix) {
        // Automatically trigger AI fix for auto-fixable errors
        setIsRecovering(true);
        setRecoveryAttempts(prev => prev + 1);

        // Clear any existing timeout
        if (recoveryTimeoutRef.current) {
          clearTimeout(recoveryTimeoutRef.current);
        }

        // Set new timeout with mounted check
        recoveryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            onAIFix();
            setIsRecovering(false);
          }
        }, 500);
      } else if (classifiedError.retryStrategy === 'different-renderer' && classifiedError.fallbackRenderer) {
        // Automatically switch renderer
        handleUseFallback();
      }
    }
  }, [onPreviewErrorChange, onErrorCategoryChange, mapErrorTypeToCategory, recoveryAttempts, onAIFix, handleUseFallback]);

  // Listen for iframe messages
  useEffect(() => {
    onLoadingChange(true);
    onPreviewErrorChange(null);

    const handleIframeMessage = (e: MessageEvent) => {
      // Security: Only accept messages from our iframes (blob URLs report 'null') or same origin
      // Prevents malicious iframes or websites from sending fake artifact signals
      const validOrigins = ['null', window.location.origin];
      if (!validOrigins.includes(e.origin)) {
        // Silently ignore messages from untrusted origins
        return;
      }


      if (e.data?.type === 'artifact-error') {
        handleArtifactError(e.data.message);
        onLoadingChange(false);
        // Ensure we signal completion even on error if not already sent
        window.postMessage({ type: 'artifact-rendered-complete', success: false, error: e.data.message }, '*');
      } else if (e.data?.type === 'artifact-ready') {
        onLoadingChange(false);
        // Ensure we signal completion when ready (redundant for some paths but safe)
        window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
      }
    };

    const loadTimeout = setTimeout(() => {
      onLoadingChange(false);
    }, 3000);

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
      clearTimeout(loadTimeout);
    };
  }, [artifact.content, onLoadingChange, onPreviewErrorChange, onErrorCategoryChange, recoveryAttempts, handleArtifactError]);

  // Render mermaid diagrams
  useEffect(() => {
    if (artifact.type === "mermaid" && mermaidRef.current) {
      const renderMermaid = async () => {
        try {
          onLoadingChange(true);
          const mermaid = (await import("mermaid")).default;
          const id = `mermaid-${Date.now()}`;
          const { svg } = await mermaid.render(id, artifact.content);
          if (mermaidRef.current) {
            const template = document.createElement('template');
            const cleanSvg = svg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
            template.innerHTML = cleanSvg.trim();
            const svgElement = template.content.firstChild;

            mermaidRef.current.textContent = '';
            if (svgElement) {
              mermaidRef.current.appendChild(svgElement);
            }
          }
          onLoadingChange(false);
          window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
        } catch (error) {
          console.error('Mermaid render error:', error);
          onPreviewErrorChange(error instanceof Error ? error.message : 'Failed to render diagram');
          onLoadingChange(false);
          window.postMessage({ type: 'artifact-rendered-complete', success: false, error: error instanceof Error ? error.message : 'Failed to render diagram' }, '*');
        }
      };
      renderMermaid();
    }
  }, [artifact.content, artifact.type, onLoadingChange, onPreviewErrorChange]);

  // Check if needs Sandpack (memoized for performance)
  const needsSandpack = useMemo(() => {
    if (artifact.type !== 'react') return false;
    const sandpackEnabled = import.meta.env.VITE_ENABLE_SANDPACK !== 'false';
    if (!sandpackEnabled) return false;
    return detectNpmImports(artifact.content);
  }, [artifact.content, artifact.type]);

  // Handle manual retry
  const handleRetry = () => {
    setRecoveryAttempts(prev => prev + 1);
    setCurrentError(null);
    onRefresh();
  };

  // Reset recovery state when artifact changes
  useEffect(() => {
    setRecoveryAttempts(0);
    setCurrentError(null);
    setIsRecovering(false);
  }, [artifact.id]);

  // Code/HTML rendering
  if (artifact.type === "code" || artifact.type === "html") {
    const isFullHTML = artifact.content.includes("<!DOCTYPE");
    const previewContent = isFullHTML
      ? artifact.content
      : `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  ${injectedCDNs}
  ${generateCompleteIframeStyles()}
  <script>
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: e.message + ' at ' + e.filename + ':' + e.lineno
      }, '*');
      return true;
    });
    window.addEventListener('unhandledrejection', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: 'Promise rejection: ' + e.reason
      }, '*');
    });
    const originalError = console.error;
    console.error = (...args) => {
      originalError.apply(console, args);
      window.parent.postMessage({
        type: 'artifact-error',
        message: args.join(' ')
      }, '*');
    };
    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
  </script>
</head>
<body>
${artifact.content}
</body>
</html>`;

    return (
      <div className="w-full h-full relative flex flex-col">
        {validation && !validation.isValid && (
          <Alert variant="destructive" className="m-2 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Validation Errors:</strong>
              <ul className="list-disc pl-4 mt-1">
                {validation.errors.map((err, idx) => (
                  <li key={idx}>{err.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {validation && validation.warnings.length > 0 && (
          <Alert className="m-2 mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Warnings:</strong>
              <ul className="list-disc pl-4 mt-1">
                {validation.warnings.slice(0, 3).map((warn, idx) => (
                  <li key={idx}>{warn.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
              <ArtifactSkeleton type={artifact.type} />
            </div>
          )}
          {previewError && !isLoading && currentError && (
            <div className="absolute top-2 left-2 right-2 z-10">
              <ArtifactErrorRecovery
                error={currentError}
                isRecovering={isRecovering || isFixingError}
                canRetry={recoveryAttempts < MAX_RECOVERY_ATTEMPTS}
                canUseFallback={!!getFallbackRenderer(currentError, currentRenderer)}
                onRetry={handleRetry}
                onUseFallback={handleUseFallback}
                onAskAIFix={onAIFix}
              />
            </div>
          )}
          <WebPreview defaultUrl="about:blank" key={`webpreview-${themeRefreshKey}`}>
            <WebPreviewNavigation>
              <WebPreviewNavigationButton
                tooltip="Refresh preview"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </WebPreviewNavigationButton>
              <WebPreviewUrl />
              <WebPreviewNavigationButton
                tooltip="Full screen"
                onClick={onFullScreen}
              >
                <Maximize2 className="h-4 w-4" />
              </WebPreviewNavigationButton>
            </WebPreviewNavigation>
            <WebPreviewBody
              srcDoc={previewContent}
              key={`${injectedCDNs}-${themeRefreshKey}`}
              loading={isLoading ? <ArtifactSkeleton type={artifact.type} /> : undefined}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
            />
          </WebPreview>
        </div>
      </div>
    );
  }

  // Markdown rendering
  if (artifact.type === "markdown") {
    return (
      <div className="w-full h-full flex flex-col">
        {isEditingCode ? (
          <div className="flex-1 overflow-auto p-4 bg-muted">
            <textarea
              value={editedContent}
              onChange={(e) => onEditedContentChange(e.target.value)}
              className="w-full h-full p-4 text-sm bg-muted text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-4 bg-background">
            <Markdown>{artifact.content}</Markdown>
          </div>
        )}
      </div>
    );
  }

  // SVG rendering
  if (artifact.type === "svg") {
    const hasViewBox = artifact.content.includes('viewBox');
    const hasWidthHeight = artifact.content.includes('width=') && artifact.content.includes('height=');

    let svgContent = artifact.content.trim();

    if (!hasViewBox && !hasWidthHeight) {
      svgContent = svgContent.replace(
        /<svg([^>]*)>/,
        '<svg$1 viewBox="0 0 800 600" width="800" height="600">'
      );
    }

    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;

    return (
      <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
        <img
          src={svgDataUrl}
          alt={artifact.title}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            console.error('SVG rendering error:', artifact.content);
          }}
        />
      </div>
    );
  }

  // Mermaid rendering
  if (artifact.type === "mermaid") {
    return (
      <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Rendering diagram...</p>
          </div>
        )}
        {previewError && !isLoading && (
          <div className="bg-destructive/10 border border-destructive text-destructive text-xs p-2 rounded flex items-start gap-2">
            <span className="font-semibold shrink-0">⚠️ Error:</span>
            <span className="flex-1 break-words">{previewError}</span>
          </div>
        )}
        <div ref={mermaidRef} className={isLoading || previewError ? 'hidden' : ''} />
      </div>
    );
  }

  // Image rendering
  if (artifact.type === "image") {
    return (
      <div className="w-full h-full overflow-auto p-6 bg-muted/30 flex flex-col items-center justify-center gap-4">
        <img
          src={artifact.content}
          alt={artifact.title}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
        />
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const link = document.createElement('a');
              link.href = artifact.content;
              link.download = `${artifact.title.replace(/\s+/g, '_')}.png`;
              link.click();
              toast.success("Image downloaded");
            }}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={() => onEdit?.(`Edit this image: ${artifact.title}. `)}
            size="sm"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Image
          </Button>
        </div>
      </div>
    );
  }

  // React - check rendering method priority:
  // 1. Server bundle (bundleUrl exists) - most reliable for npm packages
  // 2. Sandpack (needsSandpack && no bundleUrl) - fallback for npm packages
  // 3. Client-side Babel - for simple React without npm imports
  if (artifact.type === "react") {
    // PRIORITY 1: If artifact has a bundle URL from server-side bundling, use that
    // Server bundles are pre-processed and handle GLM syntax quirks (unquoted imports, etc.)
    // NOTE: We fetch the bundle content and create a blob URL to bypass X-Frame-Options headers
    // that Supabase storage sets, which would otherwise block iframe embedding
    if (artifact.bundleUrl) {
      const ALLOWED_BUNDLE_ORIGINS = [
        import.meta.env.VITE_SUPABASE_URL
      ];

      let isValidOrigin = false;
      try {
        const url = new URL(artifact.bundleUrl);
        isValidOrigin = ALLOWED_BUNDLE_ORIGINS.includes(url.origin);
      } catch {
        isValidOrigin = false;
      }

      if (!isValidOrigin) {
        console.error('[ArtifactRenderer] Invalid bundle URL origin:', artifact.bundleUrl);
        return (
          <div className="flex items-center justify-center h-full p-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bundle URL failed security validation. Please refresh the page.
              </AlertDescription>
            </Alert>
          </div>
        );
      }

      // Use BundledArtifactFrame component for fetching and rendering via blob URL
      return (
        <BundledArtifactFrame
          bundleUrl={artifact.bundleUrl}
          title={artifact.title}
          dependencies={artifact.dependencies}
          isLoading={isLoading}
          previewError={previewError}
          onLoadingChange={onLoadingChange}
          onPreviewErrorChange={onPreviewErrorChange}
        />
      );
    }

    // PRIORITY 2: Sandpack for npm imports when no server bundle available
    if (needsSandpack) {
      return (
        <div className="w-full h-full relative">
          <Suspense fallback={<ArtifactSkeleton type="react" />}>
            <SandpackArtifactRenderer
              code={artifact.content}
              title={artifact.title}
              showEditor={false}
              onError={(error) => {
                onPreviewErrorChange(error);
                onLoadingChange(false);
                window.postMessage({ type: 'artifact-rendered-complete', success: false, error }, '*');
              }}
              onReady={() => {
                onLoadingChange(false);
                window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
              }}
            />
          </Suspense>
        </div>
      );
    }
    // If bundling failed with npm imports, show error
    if (artifact.bundlingFailed && detectNpmImports(artifact.content)) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
          <div className="w-16 h-16 mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">Bundling Failed</h3>
          <p className="text-sm text-muted-foreground mb-1 max-w-md">
            {artifact.bundleError || "This component requires npm packages that couldn't be bundled."}
          </p>
          {artifact.bundleErrorDetails && (
            <p className="text-xs text-muted-foreground mb-4 max-w-md">
              {artifact.bundleErrorDetails}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.location.reload();
              }}
            >
              Refresh Page
            </Button>
            {onEdit && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onEdit?.(`Fix this bundling error: ${artifact.bundleError}`)}
              >
                Ask AI for Help
              </Button>
            )}
          </div>
        </div>
      );
    }

    // PRIORITY 3: Client-side Babel rendering for simple React (no npm imports)
    const processedCode = artifact.content
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```\n?$/gm, '')
      // FIX: Fix unquoted package names in imports (GLM bug: "from React;" -> "from 'react';")
      .replace(/from\s+React\s*;/g, "from 'react';")
      .replace(/from\s+ReactDOM\s*;/g, "from 'react-dom';")
      .replace(/^import\s+.*?from\s+['"]react['"];?\s*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]react-dom['"];?\s*$/gm, '')
      .replace(/^import\s+React.*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]lucide-react['"];?\s*$/gm, '')
      .replace(/^import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"];?\s*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]recharts['"];?\s*$/gm, '')
      .replace(/^import\s+.*?from\s+['"]framer-motion['"];?\s*$/gm, '')
      .replace(/^const\s*\{[^}]*(?:useState|useEffect|useReducer|useRef|useMemo|useCallback|useContext|useLayoutEffect)[^}]*\}\s*=\s*React;?\s*$/gm, '')
      // Strip Framer Motion destructuring (iframe template already declares these)
      .replace(/^const\s*\{\s*motion\s*,\s*AnimatePresence\s*\}\s*=\s*Motion;?\s*$/gm, '')
      .replace(/^const\s*\{[^}]*(?:motion|AnimatePresence)[^}]*\}\s*=\s*(?:Motion|FramerMotion|window\.Motion);?\s*$/gm, '')
      // Strip Recharts destructuring (iframe template already declares these)
      .replace(/^const\s*\{[^}]*(?:BarChart|LineChart|PieChart|AreaChart|ResponsiveContainer)[^}]*\}\s*=\s*(?:Recharts|window\.Recharts);?\s*$/gm, '')
      // Strip Lucide icons destructuring (iframe template already declares these)
      .replace(/^const\s*\{[^}]*\}\s*=\s*(?:LucideIcons|window\.LucideReact|LucideReact);?\s*$/gm, '')
      // Strip malformed "const * as X from 'package'" syntax (GLM bug - generates invalid JS)
      .replace(/^const\s*\*\s*as\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, '')
      // Strip Radix UI destructuring - the iframe template now provides RadixUISelect via dynamic import
      .replace(/^const\s*\{[^}]*\}\s*=\s*RadixUISelect;?\s*$/gm, '')
      // NOTE: Keep Radix UI imports - they resolve via import map in the iframe template
      // Stripping them causes "X is not defined" errors since the variable is never declared
      .replace(/^export\s+default\s+/gm, '')
      .trim();

    // Extract component name with priority:
    // 1. export default function ComponentName
    // 2. function ComponentName (standalone function declaration)
    // 3. const ComponentName = ( or const ComponentName = function (arrow/function expression)
    // 4. export default ComponentName (at end, references existing component)
    const exportDefaultFunctionMatch = artifact.content.match(/export\s+default\s+function\s+(\w+)/);
    const functionMatch = artifact.content.match(/^function\s+([A-Z]\w*)\s*\(/m); // Function starting with capital letter
    const constComponentMatch = artifact.content.match(/const\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)\s*=>|\(\s*\)\s*=>|function)/);
    const exportDefaultMatch = artifact.content.match(/export\s+default\s+([A-Z]\w*)\s*;?\s*$/m);

    const componentName = exportDefaultFunctionMatch?.[1]
      || functionMatch?.[1]
      || constComponentMatch?.[1]
      || exportDefaultMatch?.[1]
      || 'App';

    const reactPreviewContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script>
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      console.error('React or ReactDOM failed to load');
      window.parent.postMessage({
        type: 'artifact-error',
        message: 'React libraries failed to load. Please refresh the page.'
      }, '*');
    }
    window.react = window.React;
    window.reactDOM = window.ReactDOM;
  </script>
  <script type="importmap">
    {
      "imports": {
        "react": "data:text/javascript,const R=window.React;export default R;export const{useState,useEffect,useRef,useMemo,useCallback,useContext,createContext,createElement,Fragment,memo,forwardRef,useReducer,useLayoutEffect,useImperativeHandle,useDebugValue,useDeferredValue,useTransition,useId,useSyncExternalStore,useInsertionEffect,lazy,Suspense,startTransition,Children,cloneElement,isValidElement,createRef,Component,PureComponent,StrictMode}=R;",
        "react-dom": "data:text/javascript,const D=window.ReactDOM;export default D;export const{createRoot,hydrateRoot,createPortal,flushSync,findDOMNode,unmountComponentAtNode,render,hydrate}=D;",
        "react-dom/client": "data:text/javascript,const D=window.ReactDOM;export default D;export const{createRoot,hydrateRoot,createPortal,flushSync}=D;",
        "react/jsx-runtime": "data:text/javascript,const R=window.React;const Fragment=R.Fragment;const jsx=(type,props,key)=>R.createElement(type,{...props,key});const jsxs=jsx;export{jsx,jsxs,Fragment};",
        "react/jsx-dev-runtime": "data:text/javascript,const R=window.React;const Fragment=R.Fragment;const jsx=(type,props,key)=>R.createElement(type,{...props,key});const jsxs=jsx;export{jsx,jsxs,Fragment};",
        "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.0.5?external=react,react-dom",
        "@radix-ui/react-dropdown-menu": "https://esm.sh/@radix-ui/react-dropdown-menu@2.0.6?external=react,react-dom",
        "@radix-ui/react-popover": "https://esm.sh/@radix-ui/react-popover@1.0.7?external=react,react-dom",
        "@radix-ui/react-tabs": "https://esm.sh/@radix-ui/react-tabs@1.0.4?external=react,react-dom",
        "@radix-ui/react-select": "https://esm.sh/@radix-ui/react-select@2.0.0?external=react,react-dom",
        "@radix-ui/react-slider": "https://esm.sh/@radix-ui/react-slider@1.1.2?external=react,react-dom",
        "@radix-ui/react-switch": "https://esm.sh/@radix-ui/react-switch@1.0.3?external=react,react-dom",
        "@radix-ui/react-tooltip": "https://esm.sh/@radix-ui/react-tooltip@1.0.7?external=react,react-dom",
        "lucide-react": "https://esm.sh/lucide-react@0.263.1?external=react,react-dom"
      }
    }
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
  <script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/recharts@2.5.0/umd/Recharts.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/framer-motion@11.11.11/dist/framer-motion.js"></script>
  ${injectedCDNs}
  ${generateCompleteIframeStyles()}
  <style>
    #root {
      width: 100%;
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-type="module" data-presets="react">
    const { useState, useEffect, useReducer, useRef, useMemo, useCallback } = React;

    const LucideIcons = window.LucideReact || window.lucideReact || {};
    const {
      Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
      ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
      Plus, Minus, Edit, Trash, Save, Download, Upload,
      Search, Filter, Settings, User, Menu, MoreVertical,
      Trophy, Star, Heart, Flag, Target, Award,
      PlayCircle, PauseCircle, SkipForward, SkipBack,
      AlertCircle, CheckCircle, XCircle, Info, HelpCircle,
      Loader, Clock, Calendar, Mail, Phone,
      Grid, List, Layout, Sidebar, Maximize, Minimize,
      Copy, Eye, EyeOff, Lock, Unlock, Share, Link
    } = LucideIcons;

    Object.keys(LucideIcons).forEach(iconName => {
      if (typeof window[iconName] === 'undefined') {
        window[iconName] = LucideIcons[iconName];
      }
    });

    const Recharts = window.Recharts || {};
    const {
      BarChart, LineChart, PieChart, AreaChart, ScatterChart,
      Bar, Line, Pie, Area, Scatter, XAxis, YAxis, CartesianGrid,
      Tooltip, Legend, ResponsiveContainer
    } = Recharts;

    const FramerMotion = window.Motion || {};
    const { motion, AnimatePresence } = FramerMotion;

    Object.keys(FramerMotion).forEach(exportName => {
      if (typeof window[exportName] === 'undefined') {
        window[exportName] = FramerMotion[exportName];
      }
    });

    // Radix UI Select components (imported dynamically from ESM CDN)
    // These are provided for artifacts that use "const { Select, ... } = RadixUISelect" pattern
    // Wrapped in try-catch so artifacts without Radix UI still work if import fails
    let RadixUISelect = {};
    let Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectPortal, SelectViewport, SelectGroup, SelectLabel, SelectSeparator, SelectIcon, SelectItemText, SelectItemIndicator, SelectScrollUpButton, SelectScrollDownButton;
    try {
      RadixUISelect = await import('@radix-ui/react-select');
      Select = RadixUISelect.Root;
      SelectTrigger = RadixUISelect.Trigger;
      SelectValue = RadixUISelect.Value;
      SelectContent = RadixUISelect.Content;
      SelectItem = RadixUISelect.Item;
      SelectPortal = RadixUISelect.Portal;
      SelectViewport = RadixUISelect.Viewport;
      SelectGroup = RadixUISelect.Group;
      SelectLabel = RadixUISelect.Label;
      SelectSeparator = RadixUISelect.Separator;
      SelectIcon = RadixUISelect.Icon;
      SelectItemText = RadixUISelect.ItemText;
      SelectItemIndicator = RadixUISelect.ItemIndicator;
      SelectScrollUpButton = RadixUISelect.ScrollUpButton;
      SelectScrollDownButton = RadixUISelect.ScrollDownButton;
      console.log('[Artifact] Radix UI Select loaded successfully');
    } catch (e) {
      console.warn('[Artifact] Radix UI Select not available:', e.message);
    }

    ${processedCode}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const Component = ${componentName};

      if (typeof Component === 'undefined') {
        throw new Error('Component "${componentName}" is not defined. Make sure you have "export default ${componentName}" in your code.');
      }

      root.render(<Component />);

      // Signal to parent that artifact has finished rendering
      window.parent.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
    } catch (error) {
      window.parent.postMessage({
        type: 'artifact-error',
        message: error.message || 'Failed to render component'
      }, '*');
      window.parent.postMessage({ type: 'artifact-rendered-complete', success: false, error: error.message }, '*');
      console.error('Render error:', error);
    }
  </script>
  <script>
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: e.message
      }, '*');
    });
    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
  </script>
</body>
</html>`;

    return (
      <div className="w-full h-full relative flex flex-col">
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-20">
              <ArtifactSkeleton type="react" />
            </div>
          )}
          {previewError && !isLoading && currentError && (
            <div className="absolute top-2 left-2 right-2 z-10">
              <ArtifactErrorRecovery
                error={currentError}
                isRecovering={isRecovering || isFixingError}
                canRetry={recoveryAttempts < MAX_RECOVERY_ATTEMPTS}
                canUseFallback={!!getFallbackRenderer(currentError, currentRenderer)}
                onRetry={handleRetry}
                onUseFallback={handleUseFallback}
                onAskAIFix={onAIFix}
              />
            </div>
          )}
          <WebPreview defaultUrl="about:blank" key={`webpreview-react-${themeRefreshKey}`}>
            <WebPreviewNavigation>
              <WebPreviewNavigationButton
                tooltip="Refresh preview"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </WebPreviewNavigationButton>
              <WebPreviewUrl />
              <WebPreviewNavigationButton
                tooltip="Full screen"
                onClick={onFullScreen}
              >
                <Maximize2 className="h-4 w-4" />
              </WebPreviewNavigationButton>
            </WebPreviewNavigation>
            <WebPreviewBody
              srcDoc={reactPreviewContent}
              key={`${injectedCDNs}-${themeRefreshKey}`}
              loading={isLoading ? <ArtifactSkeleton type={artifact.type} /> : undefined}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
            />
          </WebPreview>
        </div>
      </div>
    );
  }

  return null;
});

ArtifactRenderer.displayName = "ArtifactRenderer";
