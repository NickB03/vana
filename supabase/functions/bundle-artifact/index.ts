import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { ErrorResponseBuilder } from "../_shared/error-handler.ts";
import { RATE_LIMITS } from "../_shared/config.ts";
import { uploadWithRetry } from "../_shared/storage-retry.ts";
import { getPrebuiltBundles } from "../_shared/prebuilt-bundles.ts";
import { getWorkingCdnUrl } from "../_shared/cdn-fallback.ts";
import {
  JSX_RUNTIME_SHIM,
  REACT_DOM_CLIENT_SHIM,
  REACT_DOM_SHIM,
  REACT_EXPORT_NAMES,
  REACT_SHIM,
} from "../_shared/react-shims.ts";
import { generateContentHash, lookupBundleCache, storeBundleCache } from "../_shared/bundle-cache.ts";
import { createStageProgress, type BundleComplete, type BundleError } from "../_shared/sse-stream.ts";
import { recordBundleMetrics } from "../_shared/bundle-metrics.ts";

/**
 * Bundle Artifact Edge Function
 *
 * Server-side bundling for React artifacts with npm dependencies using Deno native bundler.
 *
 * Features:
 * - Server-side bundling with Deno native bundler (uses esbuild internally, 10x faster than WASM)
 * - npm dependency support via multi-CDN fallback (esm.sh → esm.run → jsdelivr)
 * - Automatic CDN health verification with 3s timeout per provider
 * - Standalone HTML generation with embedded scripts
 * - Supabase Storage integration with signed URLs (4-week expiry)
 * - Authentication required (expensive operation, prevents abuse)
 * - Rate limiting (50 requests/5h for authenticated users)
 * - Comprehensive error handling with automatic temp directory cleanup
 * - XSS prevention with HTML sanitization and CSP headers
 * - Request tracking with unique request IDs
 * - Security validations: session ownership, UUID format, bundle size, dependency versions
 *
 * @see https://docs.deno.com/runtime/reference/bundling/
 */

interface BundleRequest {
  code: string;                     // React component code (max 500KB)
  dependencies: Record<string, string>; // npm packages with versions
  artifactId: string;               // Unique artifact identifier (UUID)
  sessionId: string;                // Chat session identifier (UUID)
  title: string;                    // Artifact title (max 200 chars)
  isGuest?: boolean;                // Whether this is a guest request (skips auth)
  bundleReact?: boolean;            // Use ESM React instead of UMD + shims
  streaming?: boolean;              // Enable SSE progress streaming
}

interface BundleResponse {
  success: true;
  bundleUrl: string;      // Signed URL (4-week expiry)
  bundleSize: number;     // Total HTML size in bytes
  bundleTime: number;     // Bundling time in milliseconds
  dependencies: string[]; // List of bundled dependencies
  expiresAt: string;      // ISO timestamp of URL expiry
  requestId: string;      // Unique request identifier
}

// Validation limits
const MAX_CODE_SIZE = 500 * 1024; // 500KB
const MAX_TITLE_LENGTH = 200;
const MAX_BUNDLE_SIZE = 10 * 1024 * 1024; // 10MB (matches storage bucket limit)
// NOTE: Bundle timeout is enforced by Supabase Edge Function runtime (default 60s).
// Client-side timeout is configured in bundleArtifactWithProgress() in src/utils/artifactBundler.ts.

const REACT_ESM_VERSION = "18.3.1";
const REACT_ESM_URLS = {
  react: `https://esm.sh/react@${REACT_ESM_VERSION}`,
  reactDom: `https://esm.sh/react-dom@${REACT_ESM_VERSION}`,
  reactDomClient: `https://esm.sh/react-dom@${REACT_ESM_VERSION}/client`,
  jsxRuntime: `https://esm.sh/react@${REACT_ESM_VERSION}/jsx-runtime`,
  jsxDevRuntime: `https://esm.sh/react@${REACT_ESM_VERSION}/jsx-dev-runtime`,
} as const;

// UMD Shims - redirect ESM imports to window globals to avoid dual React instances
// These work around Safari import map limitations and esm.sh compatibility issues
const FRAMER_MOTION_SHIM = 'data:text/javascript,if(!window.Motion){throw new Error("Framer Motion failed to load. Please refresh the page.")}const M=window.Motion;export default M;export const{motion,AnimatePresence,useAnimation,useMotionValue,useTransform,useSpring,useScroll,useInView,useDragControls,useAnimationControls,useReducedMotion,useMotionTemplate,animate,stagger,delay,spring,easeIn,easeOut,easeInOut,circIn,circOut,circInOut,backIn,backOut,backInOut,anticipate,cubicBezier,MotionConfig,LazyMotion,domAnimation,domMax,m}=M;';
const LUCIDE_REACT_SHIM = 'data:text/javascript,if(!window.LucideReact){throw new Error("Lucide React failed to load. Please refresh the page.")}const L=window.LucideReact;export default L;export const createLucideIcon=L.createLucideIcon;export const{Check,X,ChevronDown,ChevronUp,ChevronLeft,ChevronRight,ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Plus,Minus,Edit,Trash,Save,Download,Upload,Search,Filter,Settings,User,Menu,MoreVertical,Trophy,Star,Heart,Flag,Target,Award,PlayCircle,PauseCircle,SkipForward,SkipBack,AlertCircle,CheckCircle,XCircle,Info,HelpCircle,Loader,Clock,Calendar,Mail,Phone,Grid,List,Layout,Sidebar,Maximize,Minimize,Copy,Eye,EyeOff,Lock,Unlock,Share,Link,Home,Folder,File,Image,Code,Terminal,Play,Pause,Square,Circle,Maximize2,Minimize2,ExternalLink,RefreshCw,RotateCw,RotateCcw,Sun,Moon,Bell,Bookmark,Camera,Database,Disc,FileText,Globe,Hash,Key,Layers,MapPin,Mic,Monitor,Package,Percent,Power,Printer,Send,Server,Shield,Shuffle,Sliders,Smartphone,Tag,ThumbsUp,ThumbsDown,Trash2,TrendingUp,TrendingDown,Tv,Type,Video,Volume,VolumeX,Wifi,WifiOff,Zap,ZoomIn,ZoomOut,PlusCircle,MinusCircle,ArrowUpCircle,ArrowDownCircle,ArrowLeftCircle,ArrowRightCircle,ChevronFirst,ChevronLast,ChevronsUp,ChevronsDown,ChevronsLeft,ChevronsRight,MoreHorizontal,Grip,GripVertical,GripHorizontal,Move,MoveHorizontal,MoveVertical,Pencil,PencilLine,Eraser,Undo,Redo,Undo2,Redo2,History,Bold,Italic,Underline,Strikethrough,AlignLeft,AlignCenter,AlignRight,AlignJustify,ListOrdered,Table,Columns,Rows,SplitSquareHorizontal,SplitSquareVertical}=L;';

/**
 * Peer dependencies that need to be externalized to prevent dual instances.
 * When a package has peer deps, we externalize them so they use the prebuilt version.
 *
 * Note: Includes entries for Phase 2/3 packages (forward-compatible).
 * These won't affect current behavior - they only apply when those packages are used.
 */
const PEER_DEPENDENCIES: Record<string, string[]> = {
  'react-konva': ['konva'],
  '@nivo/bar': ['@nivo/core'],
  '@nivo/line': ['@nivo/core'],
  '@nivo/pie': ['@nivo/core'],
  '@nivo/heatmap': ['@nivo/core'],
  '@nivo/treemap': ['@nivo/core'],
  '@dnd-kit/sortable': ['@dnd-kit/core'],
  '@dnd-kit/utilities': ['@dnd-kit/core'],
  'react-chartjs-2': ['chart.js'],
  '@hookform/resolvers': ['react-hook-form'],
  // Three.js ecosystem peer dependencies
  '@react-three/drei': ['three'],
  '@react-three/rapier': ['three'],
  '@react-spring/three': ['three'],
  '@react-three/postprocessing': ['three'],
  'three-stdlib': ['three'],
};

/**
 * Generate esm.sh CDN URL for a package with React externalized.
 *
 * Uses ?external=react,react-dom so packages import React from window globals via import map.
 * Also externalizes peer dependencies to prevent dual instances.
 *
 * Without externalization, packages would bundle their own copy of React/peers,
 * causing "Invalid hook call" errors due to multiple React instances in the same page.
 * The ?external parameter tells esm.sh to leave those imports unresolved,
 * allowing the browser's import map to redirect them to the global React (window.React).
 *
 * @param pkg - Package name (e.g., "lucide-react")
 * @param version - Semver version (e.g., "0.263.1")
 * @returns CDN URL with externalization parameters
 */
function buildEsmUrl(pkg: string, version: string): string {
  const externals = ['react', 'react-dom'];

  // Add peer dependencies if this package has any
  const peerDeps = PEER_DEPENDENCIES[pkg];
  if (peerDeps) {
    externals.push(...peerDeps);
  }

  return `https://esm.sh/${pkg}@${version}?external=${externals.join(',')}`;
}

// Security validation patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Hash-based artifact IDs from frontend: "artifact-" followed by 32 hex characters
const ARTIFACT_HASH_REGEX = /^artifact-[0-9a-f]{32}$/i;
// Accept semver with optional prefix: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, etc.
const SEMVER_REGEX = /^[\^~>=<]?(\d+\.)?(\d+\.)?(\*|\d+)(-[\w.]+)?(\+[\w.]+)?$/;
const NPM_TAG_REGEX = /^(latest|next|beta|alpha|canary)$/;
const SAFE_PACKAGE_NAME = /^[@a-z0-9\-/]+$/i;

/**
 * Build import map for browser runtime.
 * Handles React shims, prebuilt bundles, and CDN fallback for remaining dependencies.
 *
 * @param dependencies - Package dependencies with versions
 * @param bundleReact - Whether to use ESM React imports instead of UMD + shims
 * @param requestId - Request ID for logging
 * @returns Import map object and CDN provider info
 */
async function buildImportMap(
  dependencies: Record<string, string>,
  bundleReact: boolean,
  requestId: string
): Promise<{ importMap: Record<string, string>; cdnProvider: string }> {
  // Build base import map with React shims
  const browserImportMap: Record<string, string> = bundleReact
    ? {
        react: REACT_ESM_URLS.react,
        "react-dom": REACT_ESM_URLS.reactDom,
        "react-dom/client": REACT_ESM_URLS.reactDomClient,
        "react/jsx-runtime": REACT_ESM_URLS.jsxRuntime,
        "react/jsx-dev-runtime": REACT_ESM_URLS.jsxDevRuntime,
      }
    : {
        "react-shim": REACT_SHIM,
        "react-dom-shim": REACT_DOM_SHIM,
        react: REACT_SHIM,
        "react-dom": REACT_DOM_SHIM,
        "react-dom/client": REACT_DOM_CLIENT_SHIM,
        "react/jsx-runtime": JSX_RUNTIME_SHIM,
        "react/jsx-dev-runtime": JSX_RUNTIME_SHIM,
        "framer-motion": FRAMER_MOTION_SHIM,
        "lucide-react": LUCIDE_REACT_SHIM,
      };

  // Add prebuilt bundles
  const { prebuilt, remaining, stats: prebuiltStats } = getPrebuiltBundles(dependencies);
  if (prebuiltStats.prebuiltCount > 0) {
    console.log(`[${requestId}] Using ${prebuiltStats.prebuiltCount} prebuilt bundles`);
  }

  for (const pkg of prebuilt) {
    if (!bundleReact && pkg.name === 'lucide-react') continue;
    browserImportMap[pkg.name] = pkg.bundleUrl;
  }

  // Add remaining dependencies with CDN fallback
  let cdnProvider = 'esm.sh';
  for (const [pkg, version] of Object.entries(remaining)) {
    const usesUmdGlobal = !bundleReact && (pkg === 'framer-motion' || pkg === 'lucide-react');
    if (pkg === 'react' || pkg === 'react-dom' || usesUmdGlobal) continue;

    const cdnResult = await getWorkingCdnUrl(pkg, version, requestId);
    if (cdnResult) {
      browserImportMap[pkg] = cdnResult.url;
      cdnProvider = cdnResult.provider;
    } else {
      browserImportMap[pkg] = buildEsmUrl(pkg, version);
    }
  }

  return { importMap: browserImportMap, cdnProvider };
}

/**
 * Transform bundle code with GLM syntax fixes and package import replacements.
 *
 * @param code - Original React component code
 * @param dependencies - Package dependencies with versions
 * @param bundleReact - Whether to use ESM React imports instead of UMD + shims
 * @param requestId - Request ID for logging
 * @returns Transformed code string
 */
function transformBundleCode(
  code: string,
  dependencies: Record<string, string>,
  bundleReact: boolean,
  requestId: string
): string {
  let transformedCode = code;

  // FIX: Transform malformed GLM syntax
  transformedCode = transformedCode.replace(
    /^const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/gm,
    'import * as $1 from $2;'
  );

  // FIX: Strip duplicate React hook destructuring
  const reactExportPattern = REACT_EXPORT_NAMES.join("|");
  transformedCode = transformedCode.replace(
    new RegExp(`^const\\s*\\{[^}]*(?:${reactExportPattern})[^}]*\\}\\s*=\\s*React;?\\s*$`, "gm"),
    ""
  );

  // FIX: Strip duplicate Framer Motion destructuring
  transformedCode = transformedCode.replace(
    /^const\s*\{\s*motion\s*,?\s*AnimatePresence\s*,?\s*\}\s*=\s*(?:Motion|FramerMotion|window\.Motion);?\s*$/gm,
    ''
  );

  // FIX: Strip Lucide icons destructuring
  transformedCode = transformedCode.replace(
    /^const\s*\{[^}]*\}\s*=\s*(?:Lucide|LucideReact|window\.Lucide);?\s*$/gm,
    ''
  );

  // FIX: Fix unquoted package names
  transformedCode = transformedCode.replace(/from\s+React\s*;/g, "from 'react';");
  transformedCode = transformedCode.replace(/from\s+ReactDOM\s*;/g, "from 'react-dom';");

  // Replace npm package imports with esm.sh CDN URLs
  for (const [pkg, version] of Object.entries(dependencies)) {
    const usesUmdGlobal = !bundleReact && (pkg === 'lucide-react' || pkg === 'framer-motion');
    if (pkg === 'react' || pkg === 'react-dom' || usesUmdGlobal) continue;

    const esmUrl = buildEsmUrl(pkg, version);
    const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    transformedCode = transformedCode.replace(
      new RegExp(`from\\s+['"]${escapedPkg}['"]`, 'g'),
      `from '${esmUrl}'`
    );
    transformedCode = transformedCode.replace(
      new RegExp(`import\\s+['"]${escapedPkg}['"]`, 'g'),
      `import '${esmUrl}'`
    );
  }

  if (!bundleReact) {
    transformedCode = transformedCode
      .replace(/from\s+['"]react['"]/g, `from 'react-shim'`)
      .replace(/from\s+['"]react-dom\/client['"]/g, `from 'react-dom-shim'`)
      .replace(/from\s+['"]react-dom['"]/g, `from 'react-dom-shim'`);
  }

  if (!bundleReact) {
    transformedCode = transformedCode
      .replace(/^import\s+.*?from\s+['"]lucide-react['"];?\s*$/gm, '')
      .replace(/^import\s+\{[^}]*\}\s+from\s+['"]lucide-react['"];?\s*$/gm, '');
  }

  // Transform export default to App assignment
  return normalizeDefaultExportToApp(transformedCode);
}

/**
 * Inject required libraries that artifacts commonly use.
 * Detects usage patterns and adds script tags for: PropTypes, Framer Motion, Lucide, Canvas Confetti
 *
 * This is a server-side HTML transformation that ensures libraries are pre-injected
 * before the bundle is uploaded to storage. Replaces ~50 lines of client-side code in ArtifactRenderer.
 *
 * @param html - Generated HTML template
 * @param code - Original React component code
 * @returns HTML with library script tags injected
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
 * - "const * as X from 'pkg'" → "import * as X from 'pkg'"
 * - "from React;" → "from 'react';"
 *
 * This is a server-side HTML transformation applied before upload.
 * Replaces ~20 lines of client-side code in ArtifactRenderer.
 *
 * @param html - Generated HTML template
 * @returns HTML with normalized import syntax
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

/**
 * Fix dual React instance problem with esm.sh packages.
 * - Changes ?deps=react,react-dom to ?external=react,react-dom
 * - Updates CSP to allow data: URLs for import map shims
 *
 * This is a server-side HTML transformation applied before upload.
 * Replaces ~150 lines of client-side code in ArtifactRenderer.
 *
 * @param html - Generated HTML template
 * @returns HTML with dual React instance fixes applied
 */
function fixDualReactInstance(html: string): string {
  if (!html.includes('esm.sh')) return html;

  // Step 1: Replace ?deps= with ?external=
  html = html.replace(
    /(https:\/\/esm\.sh\/[^'"?\s]+)\?deps=react@[\d.]+,react-dom@[\d.]+/g,
    '$1?external=react,react-dom'
  );

  // Step 2: Add ?external to esm.sh URLs without query params
  html = html.replace(
    /(https:\/\/esm\.sh\/@[^'"?\s]+)(['"\s>])/g,
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
 * - \` → `
 * - \$ → $
 *
 * This is a server-side HTML transformation applied before upload.
 * Replaces ~20 lines of client-side code in ArtifactRenderer.
 *
 * @param html - Generated HTML template
 * @returns HTML with unescaped template literals
 */
function unescapeTemplateLiterals(html: string): string {
  if (!html.includes('\\`') && !html.includes('\\$')) return html;

  return html.replace(
    /(<script type="module">)([\s\S]*?)(<\/script>)/,
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
 * Generate complete HTML bundle with embedded code and dependencies.
 *
 * @param params - Bundle generation parameters
 * @returns Generated HTML string and size in bytes
 */
function generateBundleHtml(params: {
  code: string;
  importMap: Record<string, string>;
  title: string;
  bundleReact: boolean;
  dependencies: Record<string, string>;
}): { html: string; size: number } {
  const { code, importMap, title, bundleReact } = params;

  // Sanitize title for HTML
  const sanitizedTitle = title
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const reactGlobalAssignments = REACT_EXPORT_NAMES.map(
    (name) => `      globalThis.${name} = globalThis.React.${name};`
  ).join("\n");

  const reactUmdScripts = bundleReact ? "" : `
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>`;

  const framerMotionScript = bundleReact ? "" : `
  <script crossorigin src="https://unpkg.com/framer-motion@10.18.0/dist/framer-motion.js"></script>`;

  const lucideScript = bundleReact ? "" : `
  <script src="https://unpkg.com/lucide-react@0.556.0/dist/umd/lucide-react.js"></script>`;

  const reactUmdBootstrapScript = bundleReact ? "" : `
  <script>
    if (typeof globalThis.React === 'undefined' || typeof globalThis.ReactDOM === 'undefined') {
      console.error('React or ReactDOM failed to load from UMD');
      document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('root').innerHTML = '<div class="error-container"><h2>React Load Error</h2><p>React libraries failed to load. Please refresh the page.</p></div>';
      });
    } else {
      console.log('React ' + globalThis.React.version + ' loaded successfully');
      window.react = window.React;
      window.reactDOM = window.ReactDOM;
${reactGlobalAssignments}
    }
  </script>`;

  const libraryBootstrapScript = bundleReact
    ? `
  <script>
    if (typeof confetti !== 'undefined') {
      window.canvasConfetti = { create: confetti.create || confetti, reset: confetti.reset };
      window.confetti = confetti;
    }
  </script>`
    : `
  <script>
    if (typeof Motion !== 'undefined' && Motion.motion) {
      console.log('Framer Motion loaded successfully');
      window.motion = Motion.motion;
      window.AnimatePresence = Motion.AnimatePresence;
    }
    if (typeof confetti !== 'undefined') {
      window.canvasConfetti = { create: confetti.create || confetti, reset: confetti.reset };
      window.confetti = confetti;
    }
    if (typeof LucideReact !== 'undefined') {
      console.log('Lucide React loaded successfully');
      window.Lucide = LucideReact;
      Object.keys(LucideReact).forEach(iconName => {
        if (typeof window[iconName] === 'undefined') {
          window[iconName] = LucideReact[iconName];
        }
      });
    }
  </script>`;

  const reactEsmImports = bundleReact
    ? `import * as __React from 'react';
    import * as __ReactDOMClient from 'react-dom/client';
    import * as __ReactDOMLegacy from 'react-dom';`
    : "";

  const reactEsmBootstrap = bundleReact
    ? `
    const __ReactDOM = { ...__ReactDOMLegacy, ...__ReactDOMClient };
    globalThis.React = __React;
    globalThis.ReactDOM = __ReactDOM;
${reactGlobalAssignments}`
    : "";

  const importMapJson = JSON.stringify({ imports: importMap }, null, 2);

  const escapedCode = code.replace(/<\/script>/gi, '<\\/script>');

  // Split imports from body
  const importStatements: string[] = [];
  const bodyCode = escapedCode.replace(
    /^import\s+(?:[\w*{}\s,]+\s+from\s+)?['"][^'"]+['"];?\s*$/gm,
    (match) => {
      importStatements.push(match);
      return '';
    }
  ).trim();
  const importsBlock = importStatements.join('\n');

  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self';
                 script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh https://esm.run https://cdn.jsdelivr.net blob: data:;
                 style-src 'unsafe-inline' https://cdn.tailwindcss.com;
                 img-src 'self' data: https:;
                 connect-src 'self' https://esm.sh https://*.esm.sh https://esm.run https://cdn.jsdelivr.net;">
  <title>${sanitizedTitle}</title>
  ${reactUmdScripts}
  <script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>
  ${framerMotionScript}
  <script crossorigin src="https://unpkg.com/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>
  ${lucideScript}
  ${reactUmdBootstrapScript}
  ${libraryBootstrapScript}
  <script type="importmap">
${importMapJson}
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    #root { min-height: 100vh; }
    .error-container { padding: 2rem; background-color: #fee; border-left: 4px solid #f00; margin: 1rem; }
    .loading-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; font-size: 1.2rem; color: #666; }
  </style>
</head>
<body>
  <div id="root"><div class="loading-container">Loading component...</div></div>
  <script type="module">
    ${reactEsmImports}
    ${importsBlock}
    ${reactEsmBootstrap}
    try {
      ${bodyCode}
      const rootElement = document.getElementById('root');
      // CRITICAL: This template requires a global 'App' component to exist
      // The normalizeDefaultExport() function (line 498-599) transforms all export patterns
      // to create a top-level 'const App = ...' or 'function App() {}' declaration.
      //
      // Valid patterns that work:
      //   export default function MyComponent() { ... }     → function App() { ... }
      //   export default () => { ... }                      → const App = () => { ... }
      //   export default class MyComponent { ... }          → const App = class { ... }
      //
      // The App variable must be in the module script scope (not inside a function)
      // so that this template can access it via 'typeof App !== "undefined"'.
      //
      // If App is undefined, the error message is shown to help debug export issues.
      if (rootElement && typeof App !== 'undefined') {
        const root = globalThis.ReactDOM.createRoot(rootElement);
        root.render(globalThis.React.createElement(App));
        console.log('Component rendered successfully');
        window.parent.postMessage({ type: 'artifact-rendered-complete', success: true }, '*');
      } else if (!rootElement) {
        console.error('Root element not found');
        window.parent.postMessage({ type: 'artifact-rendered-complete', success: false, error: 'Root element not found' }, '*');
      } else {
        console.error('App component not defined');
        rootElement.innerHTML = '<div class="error-container"><h2>Component Error</h2><p>App component was not exported correctly.</p></div>';
        window.parent.postMessage({ type: 'artifact-rendered-complete', success: false, error: 'App component not defined' }, '*');
      }
      console.log('Artifact loaded successfully');
    } catch (error) {
      console.error('Failed to load artifact:', error);
      const rootEl = document.getElementById('root');
      if (rootEl) {
        let userMessage = error.message;
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          userMessage = 'Failed to load dependencies. Check your internet connection and refresh.';
        } else if (error.message.includes('esm.sh')) {
          userMessage = 'Package server (esm.sh) is temporarily unavailable. Please try again.';
        }
        rootEl.innerHTML = '<div class="error-container"><h2>Load Error</h2><p>' + userMessage + '</p><p style="font-size:0.8em;color:#666;margin-top:1em;">Technical: ' + error.message + '</p></div>';
      }
      window.parent.postMessage({ type: 'artifact-rendered-complete', success: false, error: error.message }, '*');
    }
  </script>
  <script>
    window.addEventListener('error', (event) => {
      console.error('Runtime error:', event.error || event.message);
      const root = document.getElementById('root');
      if (root && root.querySelector('.loading-container')) {
        const msg = event.error?.message || event.message || 'Unknown error occurred';
        root.innerHTML = '<div class="error-container"><h2>Component Error</h2><p>' + msg + '</p></div>';
      }
    });
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      const root = document.getElementById('root');
      if (root && root.querySelector('.loading-container')) {
        const msg = event.reason?.message || String(event.reason) || 'Unknown error';
        root.innerHTML = '<div class="error-container"><h2>Load Error</h2><p>' + msg + '</p></div>';
      }
    });
  </script>
</body>
</html>`;

  // Apply server-side transformations before uploading
  // These replace ~300 lines of client-side code in ArtifactRenderer.tsx
  let finalHtml = htmlTemplate;
  finalHtml = ensureLibraryInjection(finalHtml, params.code);
  finalHtml = normalizeExports(finalHtml);
  finalHtml = fixDualReactInstance(finalHtml);
  finalHtml = unescapeTemplateLiterals(finalHtml);

  const htmlSize = new TextEncoder().encode(finalHtml).length;
  return { html: finalHtml, size: htmlSize };
}

/**
 * Normalize default exports to use 'App' as the component name.
 * Replaces the fragile regex chain that broke certain export patterns (see PR #509).
 *
 * CRITICAL: The HTML template (line 441-443) expects a global App component:
 *   if (typeof App !== 'undefined') { ... root.render(React.createElement(App)); }
 *
 * All export patterns must resolve to: a top-level 'const App = ...' or 'function App() {}'
 * declaration that's accessible in the module script scope.
 *
 * Handles all GLM-generated export patterns:
 * 1. export default function App() {}
 * 2. export default function OtherName() {}
 * 3. export default function() {} (anonymous)
 * 4. function App() {} ... export default App;
 * 5. const X = () => {}; export default X;
 * 6. export { X as default };
 * 7. export default () => ...
 * 8. export default memo(App) / forwardRef(App)
 * 9. export default class extends Component {}
 */
export function normalizeDefaultExportToApp(code: string): string {
  // Check if App already exists as a declaration
  const hasAppDeclaration = /\b(function|const|let|var|class)\s+App\b/.test(code);

  // Pattern 1: export default function App() -> function App()
  if (/export\s+default\s+function\s+App\s*\(/.test(code)) {
    return code.replace(/export\s+default\s+function\s+App/, 'function App');
  }

  // Pattern 2: export default function OtherName() -> function App()
  const namedFnMatch = code.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/);
  if (namedFnMatch && namedFnMatch[1] !== 'App') {
    return code.replace(/export\s+default\s+function\s+[A-Za-z_$][\w$]*/, 'function App');
  }

  // Pattern 3: export default function() -> function App()
  if (/export\s+default\s+function\s*\(/.test(code)) {
    return code.replace(/export\s+default\s+function\s*\(/, 'function App(');
  }

  // Pattern 4: function App() {} ... export default App; -> just remove export
  if (hasAppDeclaration && /export\s+default\s+App\s*;?/.test(code)) {
    return code.replace(/\n?export\s+default\s+App\s*;?/, '');
  }

  // Pattern 8: export default memo(App) / forwardRef(App) etc - HOC patterns
  const hocMatch = code.match(/export\s+default\s+(memo|forwardRef|withRouter|connect)\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/);
  if (hocMatch) {
    const [, hoc, componentName] = hocMatch;
    // If the wrapped component is already declared
    if (new RegExp(`\\b(function|const|let|var|class)\\s+${componentName}\\b`).test(code)) {
      // If component is already named App, just remove the export line entirely
      // to avoid duplicate declaration (can't do: const App = memo(App) when App exists)
      if (componentName === 'App') {
        return code.replace(/\n?export\s+default\s+[^;]+;?/, '');
      }
      // For other components (e.g., Calculator), create App alias
      return code.replace(/export\s+default\s+/, 'const App = ');
    }
  }

  // Pattern 5: const X = ...; export default X; -> add App alias
  const namedExportMatch = code.match(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/);
  if (namedExportMatch && !hasAppDeclaration) {
    const exportedName = namedExportMatch[1];
    // Check it's not a reserved word or expression
    if (!/^(function|class|async|await|null|undefined|true|false)$/.test(exportedName)) {
      return code
        .replace(/\n?export\s+default\s+[A-Za-z_$][\w$]*\s*;?/, '')
        + `\nconst App = ${exportedName};`;
    }
  }

  // Pattern 6: export { X as default } -> remove and add alias
  const namedAsDefaultMatch = code.match(/export\s*\{\s*([A-Za-z_$][\w$]*)\s+as\s+default\s*\}\s*;?/);
  if (namedAsDefaultMatch) {
    const exportedName = namedAsDefaultMatch[1];
    let result = code.replace(/\n?export\s*\{[^}]*\bas\s+default\b[^}]*\}\s*;?/, '');
    if (exportedName !== 'App' && !hasAppDeclaration) {
      result += `\nconst App = ${exportedName};`;
    }
    return result;
  }

  // Pattern 7: export default () => ... -> const App = () => ...
  if (/export\s+default\s+(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(code)) {
    return code.replace(/export\s+default\s+/, 'const App = ');
  }

  // Pattern 9: export default class ... -> const App = class ...
  if (/export\s+default\s+class\b/.test(code)) {
    return code.replace(/export\s+default\s+class/, 'const App = class');
  }

  // Fallback: any remaining export default -> const App =
  if (/export\s+default\s+/.test(code)) {
    if (hasAppDeclaration) {
      // App already exists, just remove the export
      return code.replace(/\n?export\s+default\s+[^;]+;?/, '');
    }
    return code.replace(/export\s+default\s+/, 'const App = ');
  }

  return code;
}

/**
 * Bundle artifact with SSE progress streaming.
 *
 * All bundling logic runs INSIDE the async start() callback to ensure
 * events are streamed in real-time and the stream closes properly.
 *
 * Pattern from tool-calling-chat.ts - uses streamClosed guard to prevent
 * "cannot close or enqueue" errors when client disconnects early.
 */
async function bundleWithProgress(
  body: BundleRequest,
  supabase: SupabaseClient,
  corsHeaders: Record<string, string>,
  requestId: string,
  startTime: number
): Promise<Response> {
  const { code, dependencies, artifactId, sessionId, title, bundleReact = false } = body;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let streamClosed = false;

      // Helper with streamClosed guard (prevents "cannot close or enqueue" errors)
      function sendEvent(event: string, data: unknown) {
        if (streamClosed) {
          console.warn(`[${requestId}] Stream closed, ignoring: ${event}`);
          return;
        }
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          if (error instanceof TypeError && String(error).includes("cannot close or enqueue")) {
            streamClosed = true;
          } else {
            throw error;
          }
        }
      }

      function closeStream() {
        if (!streamClosed) {
          try {
            controller.close();
          } catch {
            // Already closed
          }
          streamClosed = true;
        }
      }

      try {
        // Stage 1: Validate (10%)
        sendEvent("progress", createStageProgress("validate"));

        // Stage 2: Check cache (20%)
        sendEvent("progress", createStageProgress("cache-check"));
        // Include bundleReact and title in hash - they affect HTML output
        const contentHash = await generateContentHash(code, dependencies, bundleReact, title);
        const cached = await lookupBundleCache(supabase, contentHash, requestId);

        if (streamClosed) {
          console.log(`[${requestId}] Client disconnected after cache lookup, aborting`);
          return;
        }

        if (cached.hit && cached.freshUrl && cached.entry) {
          console.log(`[${requestId}] SSE: Cache hit, returning immediately`);

          // Record metrics (fire-and-forget)
          recordBundleMetrics({
            artifactId,
            sessionId,
            bundleTimeMs: Date.now() - startTime,
            cacheHit: true,
            bundleSize: cached.entry.bundle_size,
            fallbackUsed: false,
            dependencyCount: Object.keys(dependencies).length
          }, requestId).catch((error) => {
            console.error(`[${requestId}] Failed to record bundle metrics: ${error.message}`, {
              operation: 'metrics_write',
              cacheHit: true
            });
          });

          const completeEvent: BundleComplete = {
            success: true,
            bundleUrl: cached.freshUrl,
            bundleSize: cached.entry.bundle_size,
            bundleTime: Date.now() - startTime,
            dependencies: Object.keys(dependencies),
            expiresAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
            requestId,
            cacheHit: true,
          };
          sendEvent("complete", completeEvent);
          closeStream();
          return;
        }

        // Stage 3: Fetch CDN URLs (40%)
        sendEvent("progress", createStageProgress("fetch"));

        // Transform the code using shared helper
        const codeWithoutExport = transformBundleCode(code, dependencies, bundleReact, requestId);

        // Stage 4: Bundle (70%)
        sendEvent("progress", createStageProgress("bundle"));

        // Build import map using shared helper
        const { importMap: browserImportMap } = await buildImportMap(dependencies, bundleReact, requestId);

        // Generate HTML bundle using shared helper
        const { html: htmlTemplate, size: htmlSize } = generateBundleHtml({
          code: codeWithoutExport,
          importMap: browserImportMap,
          title,
          bundleReact,
          dependencies,
        });

        if (streamClosed) {
          console.log(`[${requestId}] Client disconnected after bundling, aborting upload`);
          return;
        }

        // Stage 5: Upload (90%)
        sendEvent("progress", createStageProgress("upload"));

        const storagePath = `${sessionId}/${artifactId}/bundle.html`;
        const expiresIn = 2419200; // 4 weeks

        const uploadResult = await uploadWithRetry(
          supabase,
          "artifact-bundles",
          storagePath,
          htmlTemplate,
          { contentType: "text/html", upsert: true },
          expiresIn,
          requestId
        );

        if (streamClosed) {
          console.log(`[${requestId}] Client disconnected after upload, aborting cache store`);
          return;
        }

        console.log(`[${requestId}] SSE: Uploaded to storage: ${storagePath}`);

        // Store in bundle cache (fire-and-forget)
        storeBundleCache(
          supabase,
          contentHash,
          storagePath,
          uploadResult.url,
          htmlSize,
          Object.keys(dependencies).length,
          requestId
        ).catch((error) => {
          console.error(`[${requestId}] Failed to cache bundle: ${error.message}`, {
            contentHash,
            operation: 'cache_write'
          });
        });

        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        const totalTime = Date.now() - startTime;

        console.log(
          `[${requestId}] SSE: Bundle complete:`,
          `${totalTime}ms total,`,
          `${htmlSize} bytes,`,
          `${Object.keys(dependencies).length} dependencies`
        );

        // Record metrics (fire-and-forget)
        recordBundleMetrics({
          artifactId,
          sessionId,
          bundleTimeMs: totalTime,
          cacheHit: false,
          cdnProvider: 'esm.sh',
          bundleSize: htmlSize,
          fallbackUsed: false,
          dependencyCount: Object.keys(dependencies).length
        }, requestId).catch((error) => {
          console.error(`[${requestId}] Failed to record bundle metrics: ${error.message}`, {
            operation: 'metrics_write',
            cacheHit: false
          });
        });

        // Complete (100%)
        const completeEvent: BundleComplete = {
          success: true,
          bundleUrl: uploadResult.url,
          bundleSize: htmlSize,
          bundleTime: totalTime,
          dependencies: Object.keys(dependencies),
          expiresAt,
          requestId,
          cacheHit: false,
        };
        sendEvent("complete", completeEvent);
        closeStream();

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[${requestId}] SSE: Bundle error:`, errorMsg);
        const errorEvent: BundleError = {
          success: false,
          error: errorMsg,
          requestId,
        };
        sendEvent("error", errorEvent);
        closeStream();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Request-ID": requestId,
    },
  });
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  const errors = ErrorResponseBuilder.withHeaders(corsHeaders, requestId);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return errors.validation("Method not allowed", "Only POST requests are accepted");
  }

  const startTime = Date.now();

  try {
    // 1. Parse and validate request body
    let body: BundleRequest;
    try {
      body = await req.json();
    } catch {
      return errors.validation("Invalid JSON", "Request body must be valid JSON");
    }

    const {
      code,
      dependencies,
      artifactId,
      sessionId,
      title,
      isGuest = false,
      bundleReact = false,
    } = body;

    console.log(`[${requestId}] Request type: ${isGuest ? 'GUEST' : 'AUTHENTICATED'}`);

    // Validate required fields
    if (!code || typeof code !== "string") {
      return errors.validation("Invalid code", "code is required and must be a string");
    }

    if (code.length > MAX_CODE_SIZE) {
      return errors.validation(
        "Code too large",
        `Maximum code size is ${MAX_CODE_SIZE} bytes (${Math.ceil(MAX_CODE_SIZE / 1024)}KB)`
      );
    }

    if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) {
      return errors.validation(
        "Invalid dependencies",
        "dependencies is required and must be an object with package versions"
      );
    }

    // PRIORITY 6: Validate dependency versions and package names (SECURITY)
    // Prevents:
    // - Path traversal: versions like "../../../etc/passwd"
    // - Command injection: package names with shell metacharacters
    // - CDN URL manipulation: versions with "/" breaking URL construction (buildEsmUrl line 130)
    for (const [pkg, version] of Object.entries(dependencies)) {
      if (typeof version !== "string") {
        return errors.validation(
          "Invalid dependency version",
          `Version for ${pkg} must be a string, got ${typeof version}`
        );
      }

      // Validate package name
      if (!SAFE_PACKAGE_NAME.test(pkg)) {
        return errors.validation(
          "Invalid package name",
          `Package name "${pkg}" contains invalid characters`
        );
      }

      // Validate version format
      if (!SEMVER_REGEX.test(version) && !NPM_TAG_REGEX.test(version)) {
        return errors.validation(
          "Invalid package version",
          `Version "${version}" for ${pkg} must be valid semver (e.g., "1.0.0") or npm tag (e.g., "latest")`
        );
      }

      // Prevent path traversal in versions
      if (version.includes("..") || version.includes("/") || version.includes("\\")) {
        return errors.validation(
          "Invalid version format",
          `Version "${version}" for ${pkg} cannot contain path characters`
        );
      }
    }

    if (!artifactId || typeof artifactId !== "string") {
      return errors.validation("Invalid artifactId", "artifactId is required and must be a string");
    }

    if (!sessionId || typeof sessionId !== "string") {
      return errors.validation("Invalid sessionId", "sessionId is required and must be a string");
    }

    // PRIORITY 3: Add UUID format validation (SECURITY - path traversal prevention)
    if (!UUID_REGEX.test(sessionId)) {
      return errors.validation(
        "Invalid sessionId format",
        "sessionId must be a valid UUID"
      );
    }

    // Accept both UUID format (for database records) and hash format (from frontend parser)
    if (!UUID_REGEX.test(artifactId) && !ARTIFACT_HASH_REGEX.test(artifactId)) {
      return errors.validation(
        "Invalid artifactId format",
        "artifactId must be a valid UUID or artifact hash (artifact-[32 hex chars])"
      );
    }

    if (!title || typeof title !== "string") {
      return errors.validation("Invalid title", "title is required and must be a string");
    }

    if (title.length > MAX_TITLE_LENGTH) {
      return errors.validation(
        "Title too long",
        `Maximum title length is ${MAX_TITLE_LENGTH} characters`
      );
    }

    console.log(`[${requestId}] Validation complete: ${Object.keys(dependencies).length} dependencies, ${code.length} bytes code`);

    // Check for streaming mode early - we'll branch to SSE handler after auth/rate limiting
    const isStreaming = body.streaming === true;
    if (isStreaming) {
      console.log(`[${requestId}] Streaming mode enabled`);
    }

    // 2. Authentication - optional (supports both guest and authenticated users)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[${requestId}] Missing Supabase configuration`);
      return errors.internal("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let user = null;

    // Try to authenticate if token provided (but don't fail - treat as guest if invalid)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !isGuest) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

        if (!authError && authUser) {
          user = authUser;
          console.log(`[${requestId}] Authenticated user: ${user.id}`);
        } else {
          // Token invalid/expired - treat as guest
          console.log(`[${requestId}] Auth token invalid/expired, treating as guest:`, authError?.message);
        }
      } catch (e) {
        console.log(`[${requestId}] Auth exception, treating as guest:`, e);
      }
    } else {
      console.log(`[${requestId}] Guest request (no authentication)`);
    }

    // Session and artifact ownership validation (skip for guests)
    if (user) {
      // PRIORITY 2: Add session ownership validation (SECURITY - authorization bypass prevention)
      const { data: sessionData, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("user_id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error(`[${requestId}] Session not found:`, sessionError?.message);
        return errors.validation("Invalid session", "Session not found");
      }

      if (sessionData.user_id !== user.id) {
        console.error(`[${requestId}] Session ownership mismatch: session.user_id=${sessionData.user_id}, auth.user.id=${user.id}`);
        return errors.forbidden(
          "Access denied",
          "You do not have permission to bundle artifacts for this session"
        );
      }

      console.log(`[${requestId}] Session ownership validated for session ${sessionId}`);

      // PRIORITY 3: Validate artifact belongs to session (SECURITY - prevent artifact hijacking)
      const { data: artifactData, error: artifactError } = await supabase
        .from("chat_messages")
        .select("id, session_id")
        .eq("id", artifactId)
        .single();

      // Artifact doesn't need to exist yet (it may be created after bundling)
      // But if it does exist, verify it belongs to this session
      if (artifactData && artifactData.session_id !== sessionId) {
        console.error(
          `[${requestId}] Artifact session mismatch: artifact.session_id=${artifactData.session_id}, request.sessionId=${sessionId}`
        );
        return errors.forbidden(
          "Access denied",
          "Artifact does not belong to this session"
        );
      }

      if (artifactData) {
        console.log(`[${requestId}] Artifact ownership validated for artifact ${artifactId}`);
      } else {
        console.log(`[${requestId}] Artifact ${artifactId} does not exist yet (new artifact)`);
      }
    } else {
      console.log(`[${requestId}] Skipping ownership validation for guest user`);
    }

    // 3. Rate limiting - different limits for authenticated vs guest users
    let rateLimitData;
    let rateLimitError;

    if (user) {
      // Authenticated user rate limit (50 req/5h)
      const result = await supabase.rpc(
        "check_user_rate_limit",
        {
          p_user_id: user.id,
          p_max_requests: RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS,
          p_window_hours: RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS
        }
      );
      rateLimitData = result.data;
      rateLimitError = result.error;
    } else {
      // Guest rate limit (IP-based, 20 req/5h - same as chat)
      const rawClientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || req.headers.get("x-real-ip");

      let clientIp: string;
      if (!rawClientIp) {
        // SECURITY: Generate unique ID instead of shared "unknown" bucket
        clientIp = `no-ip_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
        console.warn(
          `[bundle-artifact] SECURITY: Missing IP headers (x-forwarded-for, x-real-ip). ` +
          `Using unique identifier: ${clientIp}. Check proxy configuration.`
        );
      } else {
        clientIp = rawClientIp;
      }

      console.log(`[${requestId}] Guest IP address: ${clientIp}`);

      const result = await supabase.rpc(
        "check_guest_rate_limit",
        {
          p_identifier: clientIp,
          p_max_requests: 20, // Same as guest chat limit
          p_window_hours: 5
        }
      );
      rateLimitData = result.data;
      rateLimitError = result.error;
    }

    if (rateLimitError) {
      console.error(`[${requestId}] Rate limit check failed:`, rateLimitError);
      return errors.internal("Failed to check rate limit");
    }

    // Validate rate limit response is not null
    if (!rateLimitData) {
      console.error(`[${requestId}] Rate limit check returned null data`);
      return errors.internal("Failed to verify rate limit");
    }

    if (!rateLimitData.allowed) {
      const maxRequests = user ? RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS : 20;
      console.warn(
        `[${requestId}] Rate limit exceeded for ${user ? `user ${user.id}` : 'guest'}:`,
        `${rateLimitData.request_count}/${maxRequests}`
      );

      return errors.rateLimited(
        rateLimitData.reset_at,
        0,
        maxRequests,
        user
          ? "Bundle rate limit exceeded. Please try again later."
          : "Guest bundle rate limit exceeded. Sign in for higher limits or try again later."
      );
    }

    const maxRequests = user ? RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS : 20;
    console.log(`[${requestId}] Rate limit check passed: ${rateLimitData.request_count}/${maxRequests}`);

    // Branch to SSE streaming handler if streaming mode is enabled
    if (isStreaming) {
      return bundleWithProgress(body, supabase, corsHeaders, requestId, startTime);
    }

    // 4. Check bundle cache before processing
    const contentHash = await generateContentHash(code, dependencies, bundleReact, title);
    const cached = await lookupBundleCache(supabase, contentHash, requestId);

    if (cached.hit && cached.freshUrl && cached.entry) {
      console.log(`[${requestId}] Cache hit, returning cached bundle`);

      // Record metrics (fire-and-forget)
      recordBundleMetrics({
        artifactId,
        sessionId,
        bundleTimeMs: Date.now() - startTime,
        cacheHit: true,
        bundleSize: cached.entry.bundle_size,
        fallbackUsed: false,
        dependencyCount: Object.keys(dependencies).length
      }, requestId).catch((error) => {
        console.error(`[${requestId}] Failed to record bundle metrics: ${error.message}`, {
          operation: 'metrics_write',
          cacheHit: true
        });
      });

      const expiresAt = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
      const response: BundleResponse = {
        success: true,
        bundleUrl: cached.freshUrl,
        bundleSize: cached.entry.bundle_size,
        bundleTime: Date.now() - startTime,
        dependencies: Object.keys(dependencies),
        expiresAt,
        requestId
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-ID": requestId
        }
      });
    }

    // 5. Transform code for runtime ESM imports (no subprocess spawning)
    const bundleStartTime = Date.now();
    console.log(`[${requestId}] Transforming code for runtime ESM imports...`);

    // Transform the code using shared helper
    const codeWithoutExport = transformBundleCode(code, dependencies, bundleReact, requestId);

    const bundleTime = Date.now() - bundleStartTime;
    console.log(`[${requestId}] Code transformation completed in ${bundleTime}ms`);

    // PRIORITY 5: Add bundle size validation (SECURITY - prevent DoS via large bundles)
    if (codeWithoutExport.length > MAX_BUNDLE_SIZE) {
      console.error(`[${requestId}] Code too large: ${codeWithoutExport.length} bytes (max ${MAX_BUNDLE_SIZE})`);
      return errors.validation(
        "Code too large",
        `Code (${Math.ceil(codeWithoutExport.length / 1024 / 1024)}MB) exceeds maximum size of ${MAX_BUNDLE_SIZE / 1024 / 1024}MB`
      );
    }

    console.log(`[${requestId}] Code size validated: ${codeWithoutExport.length} bytes`);

    // 5. Generate standalone HTML with runtime ESM imports
    // Build import map using shared helper
    const { importMap: browserImportMap } = await buildImportMap(dependencies, bundleReact, requestId);

    // Generate HTML bundle using shared helper
    const { html: htmlTemplate, size: htmlSize } = generateBundleHtml({
      code: codeWithoutExport,
      importMap: browserImportMap,
      title,
      bundleReact,
      dependencies,
    });
    console.log(`[${requestId}] Generated HTML template, total size: ${htmlSize} bytes`);

    // 10. Upload to Supabase Storage with retry logic
    //
    // Upload bundled HTML to Supabase Storage with retry logic.
    //
    // Why retry? Storage uploads can fail due to:
    // - Temporary network blips
    // - Storage service being temporarily unavailable
    // - Rate limiting on storage API
    //
    // uploadWithRetry() handles:
    // - 3 attempts with exponential backoff (100ms, 400ms, 1600ms)
    // - Automatic retry on network errors and 5xx responses
    // - Permanent failure on 4xx responses (quota exceeded, auth issues)
    //
    // Defined in: _shared/storage-retry.ts
    //
    // Failure scenarios:
    // - Quota exceeded (413 Payload Too Large) → No retry, return error immediately
    // - Network timeout → Retry up to 3 times
    // - 503 Service Unavailable → Retry up to 3 times
    // - Auth failure → No retry, return error immediately
    const storagePath = `${sessionId}/${artifactId}/bundle.html`;
    const expiresIn = 2419200; // 4 weeks in seconds (28 * 24 * 60 * 60) - extended for demo site UX

    let uploadResult;
    try {
      uploadResult = await uploadWithRetry(
        supabase,
        "artifact-bundles",
        storagePath,
        htmlTemplate,
        {
          contentType: "text/html",
          upsert: true // Allow re-bundling by overwriting
        },
        expiresIn,
        requestId
      );
    } catch (uploadError) {
      console.error(`[${requestId}] Storage upload failed after retries:`, uploadError);
      return errors.internal(
        "Failed to store bundled artifact",
        uploadError instanceof Error ? uploadError.message : String(uploadError)
      );
    }

    console.log(`[${requestId}] Uploaded to storage: ${storagePath}`);

    // Store in bundle cache (fire-and-forget)
    storeBundleCache(
      supabase,
      contentHash,
      storagePath,
      uploadResult.url,
      htmlSize,
      Object.keys(dependencies).length,
      requestId
    ).catch((error) => {
      console.error(`[${requestId}] Failed to cache bundle: ${error.message}`, {
        contentHash,
        operation: 'cache_write'
      });
    });

    // 11. Signed URL generated by uploadWithRetry
    const signedUrlData = { signedUrl: uploadResult.url };

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const totalTime = Date.now() - startTime;

    console.log(
      `[${requestId}] Bundle complete:`,
      `${totalTime}ms total,`,
      `${bundleTime}ms bundling,`,
      `${htmlSize} bytes,`,
      `${Object.keys(dependencies).length} dependencies`
    );

    // Record metrics (fire-and-forget)
    recordBundleMetrics({
      artifactId,
      sessionId,
      bundleTimeMs: totalTime,
      cacheHit: false,
      cdnProvider: 'esm.sh',
      bundleSize: htmlSize,
      fallbackUsed: false,
      dependencyCount: Object.keys(dependencies).length
    }, requestId).catch((error) => {
      console.error(`[${requestId}] Failed to record bundle metrics: ${error.message}`, {
        operation: 'metrics_write',
        cacheHit: false
      });
    });

    // 12. Return success response
    const response: BundleResponse = {
      success: true,
      bundleUrl: signedUrlData.signedUrl,
      bundleSize: htmlSize,
      bundleTime: totalTime,
      dependencies: Object.keys(dependencies),
      expiresAt,
      requestId
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Request-ID": requestId
      }
    });

  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);

    return errors.internal(
      "An unexpected error occurred",
      error instanceof Error ? error.message : String(error)
    );

  }
});
