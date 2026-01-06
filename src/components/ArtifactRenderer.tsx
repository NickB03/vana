import { Suspense, useRef, useEffect, useState, memo, useMemo, useCallback } from "react";
import * as Sentry from "@sentry/react";
import { ArtifactData } from "./ArtifactContainer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Markdown } from "@/components/ui/markdown";
import { generateCompleteIframeStyles } from "@/utils/themeUtils";
import { ArtifactSkeleton } from "@/components/ui/artifact-skeleton";
import { WebPreview, WebPreviewBody } from '@/components/ai-elements/web-preview';
import { Download, Edit } from "lucide-react";
import { ValidationResult, categorizeError } from "@/utils/artifactValidator";
import { detectNpmImports } from '@/utils/npmDetection';
import { lazy } from "react";
import { classifyError, shouldAttemptRecovery, getFallbackRenderer, ArtifactError } from "@/utils/artifactErrorRecovery";
import { ArtifactErrorRecovery } from "./ArtifactErrorRecovery";
import { transpileCode } from '@/utils/sucraseTranspiler';
import * as sucraseTranspiler from '@/utils/sucraseTranspiler';
import {
  BASE_REACT_IMPORTS,
  JSX_RUNTIME_SHIM,
  REACT_DOM_CLIENT_SHIM,
  REACT_DOM_SHIM,
  REACT_EXPORT_NAMES,
  REACT_SHIM,
} from "@/utils/reactShims";

// Lazy load Sandpack component for code splitting
const SandpackArtifactRenderer = lazy(() =>
  import('./SandpackArtifactRenderer').then(module => ({
    default: module.SandpackArtifactRenderer
  }))
);

/**
 * Template Constants - Shared between components
 * These must be defined before BundledArtifactFrame to avoid reference errors
 */
const REACT_GLOBAL_EXPORTS = REACT_EXPORT_NAMES.join(", ");
const REACT_GLOBAL_EXPORTS_PATTERN = REACT_EXPORT_NAMES.join("|");
const REACT_GLOBAL_ASSIGNMENTS = REACT_EXPORT_NAMES.map(
  (name) => `      window.${name} = React.${name};`
).join("\n");

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
  onAIFix?: () => void;
  previewContentRef?: React.MutableRefObject<string | null>;
}

const BundledArtifactFrame = memo(({
  bundleUrl,
  title,
  dependencies,
  isLoading,
  previewError,
  onLoadingChange,
  onPreviewErrorChange,
  onAIFix,
  previewContentRef,
}: BundledArtifactFrameProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const fetchBundle = async () => {
      try {
        console.log('[BundledArtifactFrame] Fetching bundle from:', bundleUrl);
        fetchStartTimeRef.current = Date.now();
        Sentry.addBreadcrumb({
          category: 'artifact.loading',
          message: 'Bundle fetch started',
          level: 'info',
          data: { bundleUrl },
        });
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
          console.log('[BundledArtifactFrame] Injecting React globals');
          const hooksScript = `
  <script>
    // Injected: React globals
    if (typeof React !== 'undefined') {
${REACT_GLOBAL_ASSIGNMENTS}
      if (typeof ReactDOM !== 'undefined' && ReactDOM.unstable_batchedUpdates) {
        window.unstable_batchedUpdates = ReactDOM.unstable_batchedUpdates;
      }
    }
  </script>`;
          // Inject after React script
          htmlContent = htmlContent.replace(
            /(<script[^>]*react\.production\.min\.js[^>]*><\/script>)/,
            '$1' + hooksScript
          );
        }

        // CRITICAL FIX: Lowercase React alias for lucide-react UMD compatibility
        // lucide-react UMD bundle expects `global.react` (lowercase) not `global.React`
        // This alias must be set BEFORE lucide-react loads
        if (!htmlContent.includes('window.react = window.React')) {
          console.log('[BundledArtifactFrame] Injecting lowercase React alias for lucide-react');
          const reactAliasScript = `
  <script>
    // Injected: Lowercase React alias (lucide-react UMD expects window.react)
    if (typeof React !== 'undefined') {
      window.react = window.React;
      window.reactDOM = window.ReactDOM;
    }
  </script>`;
          // Inject after ReactDOM script (before any library that needs it)
          const reactDomScriptMatch = htmlContent.match(/(<script[^>]*react-dom[^>]*\.js[^>]*><\/script>)/i);
          if (reactDomScriptMatch) {
            htmlContent = htmlContent.replace(reactDomScriptMatch[1], reactDomScriptMatch[1] + reactAliasScript);
          } else {
            // Fallback: inject before </head>
            htmlContent = htmlContent.replace('</head>', reactAliasScript + '\n</head>');
          }
        }

        // CRITICAL FIX: Inject Lucide React UMD if needed but missing
        // Some bundled artifacts use Lucide icons as globals (Plus, Check, etc.) but don't load the library
        const usesLucideIcons = /\b(Plus|Check|X|ChevronDown|ChevronUp|ArrowUp|ArrowDown|Star|Heart|Edit|Trash|Search|Settings|User|Menu)\b/.test(htmlContent);
        const hasLucideScript = htmlContent.includes('lucide-react') || htmlContent.includes('LucideReact');
        if (usesLucideIcons && !hasLucideScript) {
          console.log('[BundledArtifactFrame] Injecting Lucide React library for icon usage');
          const lucideScript = `
  <!-- Injected: Lucide React icons -->
  <script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
  <script>
    // Expose Lucide icons as globals
    if (typeof LucideReact !== 'undefined') {
      const icons = LucideReact;
      Object.keys(icons).forEach(function(name) {
        if (typeof window[name] === 'undefined') {
          window[name] = icons[name];
        }
      });
      window.LucideIcons = icons;
      console.log('Lucide React injected successfully');
    }
  </script>`;
          // Inject after lowercase React alias (which must come after ReactDOM)
          const reactDomScriptMatch = htmlContent.match(/(<script[^>]*react-dom[^>]*\.js[^>]*><\/script>[\s\S]*?<\/script>)/i);
          if (reactDomScriptMatch) {
            htmlContent = htmlContent.replace(reactDomScriptMatch[1], reactDomScriptMatch[1] + lucideScript);
          } else {
            htmlContent = htmlContent.replace('</head>', lucideScript + '\n</head>');
          }
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
              const reactShim = REACT_SHIM;
              const reactDomShim = REACT_DOM_SHIM;
              const reactDomClientShim = REACT_DOM_CLIENT_SHIM;
              const jsxRuntimeShim = JSX_RUNTIME_SHIM;

              // Add bare specifier entries that point to the shims
              importMap.imports['react'] = reactShim;
              importMap.imports['react-dom'] = reactDomShim;
              importMap.imports['react-dom/client'] = reactDomClientShim;
              importMap.imports['react/jsx-runtime'] = jsxRuntimeShim;
              importMap.imports['react/jsx-dev-runtime'] = jsxRuntimeShim;

              htmlContent = htmlContent.replace(
                /<script type="importmap">[\s\S]*?<\/script>/,
                `<script type="importmap">\n${JSON.stringify(importMap, null, 2)}\n</script>`
              );

              console.log('[BundledArtifactFrame] Updated import map with react/react-dom shims');
            } catch (e) {
              const errorMessage = e instanceof Error ? e.message : String(e);
              console.error('[BundledArtifactFrame] Failed to update import map:', e);
              Sentry.captureException(e, {
                tags: { component: 'BundledArtifactFrame', action: 'import-map-update' },
              });
              setFetchError(`Import map configuration failed: ${errorMessage}`);
              return; // Don't continue with broken import map
            }
          }

          console.log('[BundledArtifactFrame] Converted esm.sh URLs to use external React');
        }

        // CRITICAL FIX: The bundle contains raw JSX which browsers can't parse natively.
        // We use Sucrase for fast transpilation. Errors show "Ask AI to Fix" UI.

        // Check if bundle has JSX (component tags like <Component or <div)
        const hasJsx = /<(?:[A-Z][a-zA-Z]*|[a-z]+)[\s>/]/.test(htmlContent) &&
          htmlContent.includes('<script type="module">');

        if (hasJsx) {
          console.log('[BundledArtifactFrame] Detected JSX in bundle - attempting Sucrase transpilation');

          // Extract the module content
          const moduleMatch = htmlContent.match(/<script type="module">([\s\S]*?)<\/script>/);
          if (moduleMatch) {
            let moduleContent = moduleMatch[1];
            const transpileStart = performance.now();

            // Try Sucrase transpilation first
            let sucraseSucceeded = false;
            try {
              const transpileResult = transpileCode(moduleContent, {
                filename: 'bundle-module.tsx',
              });

              if (transpileResult.success) {
                const elapsed = performance.now() - transpileStart;
                console.log(`[BundledArtifactFrame] Sucrase transpiled bundle in ${elapsed.toFixed(2)}ms`);

                Sentry.addBreadcrumb({
                  category: 'artifact.bundled-transpile',
                  message: 'Sucrase transpilation successful for bundled artifact',
                  level: 'info',
                  data: { elapsed, sucraseElapsed: transpileResult.elapsed },
                });

                // Replace the module script with transpiled code (keep as type="module")
                htmlContent = htmlContent.replace(
                  /<script type="module">[\s\S]*?<\/script>/,
                  `<script type="module">${transpileResult.code}</script>`
                );
                sucraseSucceeded = true;
              } else {
                console.warn('[BundledArtifactFrame] Sucrase transpilation failed:', transpileResult.error);
                Sentry.captureException(new Error(`Bundled artifact Sucrase transpilation failed: ${transpileResult.error}`), {
                  tags: {
                    component: 'BundledArtifactFrame',
                    transpiler: 'sucrase',
                    errorRecovery: 'ai-fix-prompt',
                  },
                  extra: {
                    error: transpileResult.error,
                    details: transpileResult.details,
                    line: transpileResult.line,
                    column: transpileResult.column,
                  },
                });
              }
            } catch (sucraseError) {
              console.warn('[BundledArtifactFrame] Sucrase exception:', sucraseError);
              Sentry.captureException(sucraseError, {
                tags: {
                  component: 'BundledArtifactFrame',
                  action: 'transpile',
                  errorType: 'exception',
                },
              });
            }

            // If Sucrase failed, show error with AI fix option
            if (!sucraseSucceeded) {
              console.error('[BundledArtifactFrame] Sucrase transpilation failed - no fallback available');

              // Show error to user with fix option
              toast.error('Bundled artifact transpilation failed', {
                description: 'The artifact code contains syntax that could not be transpiled.',
                duration: Infinity,
                action: onAIFix ? {
                  label: 'Ask AI to Fix',
                  onClick: () => onAIFix()
                } : undefined,
              });

              Sentry.addBreadcrumb({
                category: 'artifact.bundled-transpile',
                message: 'Transpilation failed - showing error to user',
                level: 'error',
                data: { reason: 'sucrase-failed' },
              });

              onPreviewErrorChange?.('Bundled artifact transpilation failed');
              onLoadingChange?.(false);
              return; // Don't proceed with rendering
            }
          }
        }

        // Store processed HTML for pop-out functionality
        if (previewContentRef) {
          previewContentRef.current = htmlContent;
        }

        // Create blob URL from the fetched HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          const elapsed = Date.now() - fetchStartTimeRef.current;
          console.log(`[BundledArtifactFrame] Created blob URL successfully in ${elapsed}ms`);
          Sentry.addBreadcrumb({
            category: 'artifact.loading',
            message: 'Bundle fetch completed successfully',
            level: 'info',
            data: { elapsed, bundleUrl },
          });
          setBlobUrl(objectUrl);
          onLoadingChange(false);
        }
      } catch (error) {
        console.error('[BundledArtifactFrame] Failed to fetch bundle:', error);
        if (isMounted) {
          const elapsed = Date.now() - fetchStartTimeRef.current;
          const errorMessage = error instanceof Error ? error.message : 'Failed to load bundle';

          // Capture exception, not just breadcrumb
          Sentry.captureException(error, {
            tags: {
              component: 'BundledArtifactFrame',
              action: 'fetch-bundle',
            },
            extra: {
              elapsed,
              bundleUrl,
              errorMessage,
              dependencies,
            },
          });

          setFetchError(errorMessage);
          onPreviewErrorChange(errorMessage);
          onLoadingChange(false);

          // Show prominent error toast
          toast.error('Failed to load artifact bundle', {
            description: errorMessage,
            action: {
              label: 'Retry',
              onClick: () => window.location.reload(),
            },
          });

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
  }, [bundleUrl, onLoadingChange, onPreviewErrorChange, onAIFix]);

  return (
    <div className="w-full h-full relative flex flex-col">
      <div className="flex-1 relative">
        {isLoading && !fetchError && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20">
            <ArtifactSkeleton type="react" />
          </div>
        )}
        {(previewError || fetchError) && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm z-20">
            <div className="bg-destructive/10 border border-destructive text-destructive p-6 rounded-lg flex flex-col gap-4 max-w-lg mx-4 shadow-lg">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Component Error
                </h3>
                <p className="text-sm break-words font-mono bg-destructive/5 p-3 rounded">
                  {previewError || fetchError}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(previewError || fetchError || '');
                    toast.success("Error copied to clipboard");
                  }}
                >
                  Copy Error
                </Button>
                {onAIFix && (
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs"
                    onClick={onAIFix}
                  >
                    Ask AI to Fix
                  </Button>
                )}
              </div>
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
            sandbox="allow-scripts"
            onLoad={() => {
            onLoadingChange(false);
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

/**
 * Additional Template Constants - Shared between artifact templates
 * Note: REACT_GLOBAL_EXPORTS, REACT_GLOBAL_EXPORTS_PATTERN, and REACT_GLOBAL_ASSIGNMENTS
 * are defined earlier in the file before BundledArtifactFrame
 */

// React Import Map (shims for ES modules to use UMD React)
// These packages are available client-side via esm.sh and don't need server bundling
// NOTE: Versions MUST match prebuilt-bundles.json (source of truth)
const REACT_IMPORT_MAP = {
  imports: {
    ...BASE_REACT_IMPORTS,
    // Charts - loaded via UMD but import map needed for ESM-style imports
    "recharts": "https://esm.sh/recharts@2.15.0?external=react,react-dom",
    // Radix UI primitives (versions synced with prebuilt-bundles.json)
    "@radix-ui/react-dialog": "https://esm.sh/@radix-ui/react-dialog@1.1.15?external=react,react-dom",
    "@radix-ui/react-dropdown-menu": "https://esm.sh/@radix-ui/react-dropdown-menu@2.1.16?external=react,react-dom",
    "@radix-ui/react-popover": "https://esm.sh/@radix-ui/react-popover@1.1.15?external=react,react-dom",
    "@radix-ui/react-tabs": "https://esm.sh/@radix-ui/react-tabs@1.1.13?external=react,react-dom",
    "@radix-ui/react-select": "https://esm.sh/@radix-ui/react-select@2.2.6?external=react,react-dom",
    "@radix-ui/react-slider": "https://esm.sh/@radix-ui/react-slider@1.3.6?external=react,react-dom",
    "@radix-ui/react-switch": "https://esm.sh/@radix-ui/react-switch@1.2.6?external=react,react-dom",
    "@radix-ui/react-tooltip": "https://esm.sh/@radix-ui/react-tooltip@1.2.8?external=react,react-dom",
    "@radix-ui/react-accordion": "https://esm.sh/@radix-ui/react-accordion@1.2.12?external=react,react-dom",
    "@radix-ui/react-checkbox": "https://esm.sh/@radix-ui/react-checkbox@1.3.3?external=react,react-dom",
    "@radix-ui/react-radio-group": "https://esm.sh/@radix-ui/react-radio-group@1.3.8?external=react,react-dom",
    "@radix-ui/react-scroll-area": "https://esm.sh/@radix-ui/react-scroll-area@1.2.10?external=react,react-dom",
    "@radix-ui/react-avatar": "https://esm.sh/@radix-ui/react-avatar@1.1.11?external=react,react-dom",
    "@radix-ui/react-progress": "https://esm.sh/@radix-ui/react-progress@1.1.8?external=react,react-dom",
    "@radix-ui/react-separator": "https://esm.sh/@radix-ui/react-separator@1.1.8?external=react,react-dom",
    // Icons and animations
    "lucide-react": "https://esm.sh/lucide-react@0.556.0?external=react,react-dom",
    "framer-motion": "https://esm.sh/framer-motion@10.18.0?external=react,react-dom"
  }
} as const;

const IMPORT_MAP_JSON = JSON.stringify(REACT_IMPORT_MAP, null, 2);

// Library setup script - exposes UMD libraries as globals
const LIBRARY_SETUP_SCRIPT = `
    const { ${REACT_GLOBAL_EXPORTS} } = React;

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
      BarChart, LineChart, PieChart, AreaChart, ScatterChart, RadarChart, RadialBarChart, ComposedChart, Treemap,
      Bar, Line, Pie, Area, Scatter, Cell, Radar, RadialBar, Sector, Funnel,
      XAxis, YAxis, ZAxis, CartesianGrid, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
      Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine, ReferenceArea, ReferenceDot,
      Label, LabelList
    } = Recharts;

    const FramerMotion = window.Motion || {};
    const { motion, AnimatePresence } = FramerMotion;

    Object.keys(FramerMotion).forEach(exportName => {
      if (typeof window[exportName] === 'undefined') {
        window[exportName] = FramerMotion[exportName];
      }
    });

    // Canvas Confetti for celebration effects
    if (typeof confetti !== 'undefined') {
      window.canvasConfetti = { create: confetti.create || confetti, reset: confetti.reset };
      window.confetti = confetti;
    }

    // Radix UI Select components (imported dynamically from ESM CDN)
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
`;

// Error handling script - report errors to parent window
const ERROR_HANDLING_SCRIPT = `
    window.addEventListener('error', (e) => {
      window.parent.postMessage({
        type: 'artifact-error',
        message: e.message
      }, '*');
    });
    window.addEventListener('load', () => {
      window.parent.postMessage({ type: 'artifact-ready' }, '*');
    });
`;

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
  onBundleReactFallback?: (errorMessage: string) => void;
  onLoadingChange: (loading: boolean) => void;
  onPreviewErrorChange: (error: string | null) => void;
  onErrorCategoryChange: (category: 'syntax' | 'runtime' | 'import' | 'unknown') => void;
  previewContentRef?: React.MutableRefObject<string | null>;
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
  onBundleReactFallback,
  onLoadingChange,
  onPreviewErrorChange,
  onErrorCategoryChange,
  previewContentRef,
}: ArtifactRendererProps) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const bundleReactFallbackAttemptsRef = useRef<Set<string>>(new Set());

  // Error recovery state
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [currentError, setCurrentError] = useState<ArtifactError | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  // Renderer selection: 'bundle' for server-bundled, 'sandpack' for npm imports or fallback
  // Note: 'babel' renderer was removed in December 2025 (Sucrase-only architecture)
  const [currentRenderer, setCurrentRenderer] = useState<'bundle' | 'sandpack'>(
    artifact.bundleUrl ? 'bundle' : 'sandpack'
  );
  const MAX_RECOVERY_ATTEMPTS = 2;

  // Defense-in-depth: React to bundleUrl changes to handle race conditions
  // If bundleUrl becomes available after initial render, update the renderer choice
  useEffect(() => {
    if (artifact.bundleUrl && currentRenderer !== 'bundle') {
      console.log('[ArtifactRenderer] bundleUrl became available, switching to bundle renderer');
      setCurrentRenderer('bundle');
      // NOTE: Don't reset isLoading here - BundledArtifactFrame will set it to true
      // when it starts fetching (line 76). Resetting here caused a race condition where
      // loading was set to true AFTER the 3-second timeout had already cleared it,
      // leaving the skeleton overlay stuck on screen.
    }
  }, [artifact.bundleUrl, currentRenderer]);

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

  // Watchdog timer: Force completion if rendering takes too long (10s)
  useEffect(() => {
    if (isLoading) {
      const watchdogStart = Date.now();
      const timer = setTimeout(() => {
        const elapsed = Date.now() - watchdogStart;

        // Treat watchdog timeout as a failure
        const timeoutError = new Error(`Artifact loading timeout after ${elapsed}ms`);

        Sentry.captureException(timeoutError, {
          tags: {
            component: 'ArtifactRenderer',
            action: 'watchdog-timeout',
          },
          extra: {
            elapsed,
            artifactId: artifact.id,
            artifactType: artifact.type,
            bundleUrl: artifact.bundleUrl,
          },
        });

        // Set error state instead of pretending success
        onPreviewErrorChange('Artifact failed to load within 10 seconds. The component may have errors or be stuck in an infinite loop.');
        onLoadingChange(false);

        // Signal failure, not success
        window.postMessage({
          type: 'artifact-rendered-complete',
          success: false,
          error: 'Loading timeout'
        }, '*');

        // Show user-facing error
        toast.error('Artifact loading timeout', {
          description: 'The component took too long to render. Try refreshing or requesting a fix from AI.',
        });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onLoadingChange, onPreviewErrorChange, artifact]);

  // Map error type to error category for parent component
  const mapErrorTypeToCategory = useCallback((type: string): 'syntax' | 'runtime' | 'import' | 'unknown' => {
    if (type === 'syntax' || type === 'runtime' || type === 'import') {
      return type;
    }
    return 'unknown';
  }, []);

  const shouldAttemptBundleReactFallback = useCallback((message: string) => {
    const normalized = message.toLowerCase();
    if (!normalized.includes('does not provide an export named')) {
      return false;
    }
    return (
      normalized.includes('react-dom') ||
      normalized.includes('react-dom/client') ||
      normalized.includes('react')
    );
  }, []);

  // Handle fallback renderer
  const handleUseFallback = useCallback(() => {
    if (!currentError) return;

    const fallback = getFallbackRenderer(currentError, currentRenderer);
    if (fallback) {
      setRecoveryAttempts(prev => prev + 1);
      // FallbackRenderer is 'sandpack' | 'static-preview', map to renderer type
      setCurrentRenderer('sandpack');
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

    if (
      onBundleReactFallback &&
      artifact.type === 'react' &&
      artifact.bundleUrl &&
      shouldAttemptBundleReactFallback(errorMessage)
    ) {
      const attempts = bundleReactFallbackAttemptsRef.current;
      if (!attempts.has(artifact.id)) {
        attempts.add(artifact.id);
        onBundleReactFallback(errorMessage);
      }
    }

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
  }, [
    onPreviewErrorChange,
    onErrorCategoryChange,
    mapErrorTypeToCategory,
    recoveryAttempts,
    onAIFix,
    handleUseFallback,
    onBundleReactFallback,
    artifact.bundleUrl,
    artifact.id,
    artifact.type,
    shouldAttemptBundleReactFallback,
  ]);

  // Track when loading started for elapsed time logging
  const loadingStartTimeRef = useRef<number>(Date.now());

  // Effect 1: Start loading ONLY when artifact identity changes
  // This is separate from the message listener to avoid race conditions where
  // the effect re-runs (due to callback deps changing) and resets isLoading=true
  // after the iframe has already signaled artifact-ready
  useEffect(() => {
    loadingStartTimeRef.current = Date.now();
    onLoadingChange(true);
    onPreviewErrorChange(null);
    Sentry.addBreadcrumb({
      category: 'artifact.loading',
      message: 'Artifact changed, loading started',
      level: 'info',
      data: { artifactId: artifact.id, artifactType: artifact.type },
    });
  }, [artifact.id, onLoadingChange, onPreviewErrorChange]);

  // Effect 2: Listen for iframe messages (safe to re-run without resetting loading)
  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      // Security: Only accept messages from our iframes (blob URLs report 'null') or same origin
      // Prevents malicious iframes or websites from sending fake artifact signals
      const validOrigins = ['null', window.location.origin];
      if (!validOrigins.includes(e.origin)) {
        // Silently ignore messages from untrusted origins
        return;
      }

      if (e.data?.type === 'artifact-error') {
        const elapsed = Date.now() - loadingStartTimeRef.current;
        // Sanitize and limit error message length to prevent memory issues
        const MAX_ERROR_LENGTH = 5000;
        const sanitizedMessage = String(e.data.message || 'Unknown error').substring(0, MAX_ERROR_LENGTH);
        Sentry.addBreadcrumb({
          category: 'artifact.loading',
          message: 'Artifact error received from iframe',
          level: 'error',
          data: { elapsed, error: sanitizedMessage },
        });
        handleArtifactError(sanitizedMessage);
        onLoadingChange(false);
        // Ensure we signal completion even on error if not already sent
        window.postMessage({ type: 'artifact-rendered-complete', success: false, error: sanitizedMessage }, '*');
      } else if (e.data?.type === 'artifact-ready') {
        const elapsed = Date.now() - loadingStartTimeRef.current;
        Sentry.addBreadcrumb({
          category: 'artifact.loading',
          message: 'Artifact ready signal received from iframe',
          level: 'info',
          data: { elapsed },
        });
        onLoadingChange(false);
        // Ensure we signal completion when ready (redundant for some paths but safe)
        window.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
      }
    };

    window.addEventListener('message', handleIframeMessage);
    return () => {
      window.removeEventListener('message', handleIframeMessage);
    };
  }, [onLoadingChange, handleArtifactError]);

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
          const errorMessage = error instanceof Error ? error.message : 'Failed to render diagram';
          handleArtifactError(errorMessage);
          onLoadingChange(false);
          window.postMessage({ type: 'artifact-rendered-complete', success: false, error: errorMessage }, '*');
        }
      };
      renderMermaid();
    }
  }, [artifact.content, artifact.type, onLoadingChange, handleArtifactError]);

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

    // Store preview content for pop-out functionality
    if (previewContentRef) {
      previewContentRef.current = previewContent;
    }

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
          <WebPreview key={`webpreview-${themeRefreshKey}`} className="rounded-none border-0">
            <WebPreviewBody
              srcDoc={previewContent}
              key={`${injectedCDNs}-${themeRefreshKey}`}
              loading={isLoading ? <ArtifactSkeleton type={artifact.type} /> : undefined}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-downloads allow-popups"
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
            console.error('[ArtifactRenderer] SVG rendering error:', artifact.content);
            onPreviewErrorChange?.('The SVG image failed to render. The image data may be corrupted or contain invalid syntax.');
          }}
        />
      </div>
    );
  }

  // Mermaid rendering
  if (artifact.type === "mermaid") {
    return (
      <div className="w-full h-full overflow-auto p-4 bg-background flex items-center justify-center">
        {isLoading && <ArtifactSkeleton type="mermaid" />}
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
          onAIFix={onAIFix}
          previewContentRef={previewContentRef}
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
    // If bundling failed with npm imports, show error with recovery options
    if (artifact.bundlingFailed && detectNpmImports(artifact.content)) {
      // Build error message from bundleError and bundleErrorDetails
      const bundlingErrorMessage = [
        artifact.bundleError || "This component requires npm packages that couldn't be bundled.",
        artifact.bundleErrorDetails
      ].filter(Boolean).join(' ');

      const bundlingError = classifyError(bundlingErrorMessage);

      return (
        <div className="w-full h-full flex flex-col bg-background">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <ArtifactErrorRecovery
                error={bundlingError}
                isRecovering={isRecovering || isFixingError}
                canRetry={recoveryAttempts < MAX_RECOVERY_ATTEMPTS}
                canUseFallback={!!getFallbackRenderer(bundlingError, 'bundle')}
                onRetry={() => {
                  window.location.reload();
                }}
                onUseFallback={() => {
                  // Switch to Sandpack renderer for npm imports
                  setCurrentRenderer('sandpack');
                  setRecoveryAttempts(prev => prev + 1);
                }}
                onAskAIFix={() => {
                  onEdit?.(`Fix this bundling error: ${bundlingErrorMessage}`);
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    // PRIORITY 3: Client-side transpilation for simple React (no npm imports)

    /**
     * Generate HTML template with Sucrase (pre-transpiled code)
     * - NO Babel script tag needed
     * - Uses <script type="module"> for transpiled code
     * - Faster loading and execution
     */
    const generateSucraseTemplate = (transpiledCode: string, componentName: string) => {
      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh https://esm.run https://cdn.jsdelivr.net blob: data:; style-src 'unsafe-inline' https://cdn.tailwindcss.com; img-src 'self' data: https:; connect-src 'self' https://esm.sh https://*.esm.sh https://cdn.jsdelivr.net;">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
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
    ${IMPORT_MAP_JSON}
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide-react@0.263.1/dist/umd/lucide-react.js"></script>
  <script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/recharts@2.5.0/umd/Recharts.js"></script>
  <script src="https://unpkg.com/framer-motion@10.18.0/dist/framer-motion.js"></script>
  <script crossorigin src="https://unpkg.com/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>
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
  <script type="module">
${LIBRARY_SETUP_SCRIPT}

    ${transpiledCode}

    try {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      const Component = ${componentName};

      if (typeof Component === 'undefined') {
        throw new Error('Component "${componentName}" is not defined. Make sure you have "export default ${componentName}" in your code.');
      }

      root.render(React.createElement(Component, null));

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
${ERROR_HANDLING_SCRIPT}
  </script>
</body>
</html>`;
    };

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
      .replace(new RegExp(`^const\\s*\\{[^}]*(?:${REACT_GLOBAL_EXPORTS_PATTERN})[^}]*\\}\\s*=\\s*React;?\\s*$`, 'gm'), '')
      // Strip Framer Motion destructuring (iframe template already declares these)
      .replace(/^const\s*\{\s*motion\s*,\s*AnimatePresence\s*\}\s*=\s*Motion;?\s*$/gm, '')
      .replace(/^const\s*\{[^}]*(?:motion|AnimatePresence)[^}]*\}\s*=\s*(?:Motion|FramerMotion|window\.Motion);?\s*$/gm, '')
      // Strip Recharts destructuring (iframe template already declares these)
      .replace(/^const\s*\{[^}]*(?:BarChart|LineChart|PieChart|AreaChart|ScatterChart|RadarChart|RadialBarChart|ComposedChart|Treemap|ResponsiveContainer|Cell|Brush|Label|LabelList)[^}]*\}\s*=\s*(?:Recharts|window\.Recharts);?\s*$/gm, '')
      // Strip Lucide icons destructuring (iframe template already declares these)
      .replace(/^const\s*\{[^}]*\}\s*=\s*(?:LucideIcons|window\.LucideReact|LucideReact);?\s*$/gm, '')
      // Fix malformed "const * as X from 'package'" syntax (GLM bug - generates invalid JS)
      .replace(
        /^const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/gm,
        'import * as $1 from $2;'
      )
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

    // Determine which template to use based on feature flag and transpilation success
    let reactPreviewContent: string;

    // Sucrase transpilation with AI-assisted error recovery
    // Try Sucrase transpilation (with exception handling for library failures)
    let transpileResult: sucraseTranspiler.TranspileResult | sucraseTranspiler.TranspileError;

      try {
        transpileResult = transpileCode(processedCode, {
          filename: `${componentName}.tsx`,
        });
      } catch (error) {
        // Convert exception to error result for consistent handling
        // This catches cases where the Sucrase library itself fails to load
        console.error('[ArtifactRenderer] Sucrase exception caught:', error);

        // Classify error severity
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const isCriticalError = errorMessage.includes('Cannot find module') ||
                                errorMessage.includes('ENOENT') ||
                                errorStack?.includes('ReferenceError');

        // Add comprehensive Sentry context
        Sentry.captureException(error, {
          tags: {
            component: 'ArtifactRenderer',
            action: 'transpile',
            errorType: 'exception',
            severity: isCriticalError ? 'critical' : 'recoverable',
          },
          extra: {
            componentName,
            errorMessage,
            errorStack,
            codeLength: processedCode.length,
            artifactType: artifact.type,
          },
        });

        // Different handling for critical vs recoverable errors
        if (isCriticalError) {
          toast.error('Transpiler failed to load', {
            description: 'This may require a page refresh or indicate a configuration issue.',
            duration: Infinity, // Don't auto-dismiss
            action: {
              label: 'Refresh Page',
              onClick: () => window.location.reload()
            },
          });
        } else {
          // Show user-friendly toast notification for recoverable errors
          toast.warning(
            'Transpiler encountered an error',
            {
              description: 'There was an issue processing this artifact. Please try refreshing or use "Ask AI to Fix" to resolve.',
              duration: 10000, // 10 seconds
            }
          );
        }

        transpileResult = {
          success: false,
          error: errorMessage,
          details: errorStack,
        };
      }

      if (transpileResult.success) {
        console.log(`[ArtifactRenderer] Sucrase transpiled in ${transpileResult.elapsed.toFixed(2)}ms`);
        Sentry.addBreadcrumb({
          category: 'artifact.transpile',
          message: 'Sucrase transpilation successful',
          level: 'info',
          data: { elapsed: transpileResult.elapsed, componentName },
        });
        reactPreviewContent = generateSucraseTemplate(transpileResult.code, componentName);
        // Store preview content for pop-out functionality
        if (previewContentRef) {
          previewContentRef.current = reactPreviewContent;
        }
    } else {
      // Transpilation failed - show error UI with AI fix option
      console.error('[ArtifactRenderer] Sucrase transpilation failed:', transpileResult.error);

      // Capture exception for Sentry dashboard visibility
      Sentry.captureException(new Error(`Sucrase transpilation failed: ${transpileResult.error}`), {
        tags: {
          component: 'ArtifactRenderer',
          transpiler: 'sucrase',
          error_type: 'transpilation_failure',
        },
        extra: {
          error: transpileResult.error,
          details: transpileResult.details,
          line: transpileResult.line,
          column: transpileResult.column,
          codeLength: processedCode.length,
          componentName,
        },
      });

      // Show error toast with AI fix option
      const errorLocation = transpileResult.line
        ? ` (Line ${transpileResult.line}${transpileResult.column ? `, Column ${transpileResult.column}` : ''})`
        : '';

      toast.error('Artifact transpilation failed', {
        description: `${transpileResult.error}${errorLocation}`,
        duration: Infinity, // Don't auto-dismiss - user needs to take action
        action: onAIFix ? {
          label: 'Ask AI to Fix',
          onClick: () => onAIFix()
        } : undefined,
      });

      Sentry.addBreadcrumb({
        category: 'artifact.transpile',
        message: 'Transpilation failed - showing error to user',
        level: 'error',
        data: {
          error: transpileResult.error,
          componentName,
        },
      });

      // Set preview error and show error UI - don't render broken artifact
      const transpilationErrorMessage = `Transpilation failed: ${transpileResult.error}`;
      onPreviewErrorChange?.(transpilationErrorMessage);
      onLoadingChange?.(false);

      // Classify the error for proper recovery options
      const transpilationError = classifyError(transpilationErrorMessage);

      // Return error UI instead of null to prevent blank screen
      return (
        <div className="w-full h-full flex items-center justify-center p-8 bg-background">
          <ArtifactErrorRecovery
            error={transpilationError}
            isRecovering={isFixingError}
            canRetry={false}
            canUseFallback={false}
            onRetry={() => {}}
            onUseFallback={() => {}}
            onAskAIFix={onAIFix}
          />
        </div>
      );
    }

    return (
      <div className="w-full h-full relative flex flex-col">
        <div className="flex-1 relative">
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
          <WebPreview key={`webpreview-react-${themeRefreshKey}`} className="rounded-none border-0">
            <WebPreviewBody
              srcDoc={reactPreviewContent}
              key={`${injectedCDNs}-${themeRefreshKey}`}
              loading={isLoading ? <ArtifactSkeleton type={artifact.type} /> : undefined}
              className="w-full h-full border-0 bg-background"
              title={artifact.title}
              sandbox="allow-scripts allow-downloads allow-popups"
            />
          </WebPreview>
        </div>
      </div>
    );
  }

  return null;
});

ArtifactRenderer.displayName = "ArtifactRenderer";
