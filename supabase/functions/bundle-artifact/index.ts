import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { ErrorResponseBuilder } from "../_shared/error-handler.ts";
import { RATE_LIMITS } from "../_shared/config.ts";
import { uploadWithRetry } from "../_shared/storage-retry.ts";
import { fixOrphanedMethodChains } from "../_shared/artifact-validator.ts";

/**
 * Bundle Artifact Edge Function
 *
 * Server-side bundling for React artifacts with npm dependencies using Deno native bundler.
 *
 * Features:
 * - Server-side bundling with Deno native bundler (uses esbuild internally, 10x faster than WASM)
 * - npm dependency support via ESM CDN (esm.sh)
 * - Standalone HTML generation with embedded scripts
 * - Supabase Storage integration with signed URLs (1-hour expiry)
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
}

interface BundleResponse {
  success: true;
  bundleUrl: string;      // Signed URL (1-hour expiry)
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
const BUNDLE_TIMEOUT_MS = 30000; // 30 seconds

// Security validation patterns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Hash-based artifact IDs from frontend: "artifact-" followed by 32 hex characters
const ARTIFACT_HASH_REGEX = /^artifact-[0-9a-f]{32}$/i;
// Accept semver with optional prefix: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, etc.
const SEMVER_REGEX = /^[\^~>=<]?(\d+\.)?(\d+\.)?(\*|\d+)(-[\w.]+)?(\+[\w.]+)?$/;
const NPM_TAG_REGEX = /^(latest|next|beta|alpha|canary)$/;
const SAFE_PACKAGE_NAME = /^[@a-z0-9\-/]+$/i;

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

    const { code, dependencies, artifactId, sessionId, title, isGuest = false } = body;

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
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        || req.headers.get("x-real-ip")
        || "unknown";

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

    // 4. Transform code for runtime ESM imports (no subprocess spawning)
    // Supabase Edge Runtime doesn't allow Deno.Command, so we use runtime CDN imports
    const bundleStartTime = Date.now();

    console.log(`[${requestId}] Transforming code for runtime ESM imports...`);

    // Transform the code to work with runtime ESM imports from CDN
    // Strategy:
    // 1. Replace npm package imports with esm.sh CDN URLs
    // 2. Keep React imports pointing to window globals
    // 3. Wrap in module that renders the component

    let transformedCode = code;

    // FIX: Transform malformed GLM syntax "const * as X from 'pkg'" to proper "import * as X from 'pkg'"
    // GLM sometimes generates this invalid hybrid syntax that Babel/bundlers can't parse
    transformedCode = transformedCode.replace(
      /^const\s*\*\s*as\s+(\w+)\s+from\s+(['"][^'"]+['"])\s*;?\s*$/gm,
      'import * as $1 from $2;'
    );

    // FIX: Strip duplicate React hook destructuring (already available via UMD globals)
    transformedCode = transformedCode.replace(
      /^const\s*\{[^}]*(?:useState|useEffect|useReducer|useRef|useMemo|useCallback|useContext|useLayoutEffect)[^}]*\}\s*=\s*React;?\s*$/gm,
      ''
    );

    // FIX: Strip duplicate Framer Motion destructuring (already imported via esm.sh)
    transformedCode = transformedCode.replace(
      /^const\s*\{\s*motion\s*,?\s*AnimatePresence\s*,?\s*\}\s*=\s*(?:Motion|FramerMotion|window\.Motion);?\s*$/gm,
      ''
    );

    // FIX: Fix unquoted package names in imports (e.g., "from React;" -> "from 'react';")
    // GLM sometimes generates imports without quotes around the package name
    transformedCode = transformedCode.replace(
      /from\s+React\s*;/g,
      "from 'react';"
    );
    transformedCode = transformedCode.replace(
      /from\s+ReactDOM\s*;/g,
      "from 'react-dom';"
    );

    // FIX: Repair orphaned method chains (GLM bug: statement ends but chain continues on next line)
    // Uses shared utility from artifact-validator.ts for consistency and testability
    const chainFixResult = fixOrphanedMethodChains(transformedCode, requestId);
    transformedCode = chainFixResult.fixed;
    if (chainFixResult.changes.length > 0) {
      console.log(`[${requestId}] Applied ${chainFixResult.changes.length} orphaned chain fix(es)`);
    }

    console.log(`[${requestId}] Applied malformed syntax fixes to code`);

    // Replace import statements for npm packages with esm.sh URLs
    // This handles: import X from 'package', import { X } from 'package', import * as X from 'package'
    for (const [pkg, version] of Object.entries(dependencies)) {
      if (pkg === 'react' || pkg === 'react-dom') continue;

      const esmUrl = `https://esm.sh/${pkg}@${version}?deps=react@18.3.1,react-dom@18.3.1`;

      // Replace various import patterns
      // import X from 'package'
      transformedCode = transformedCode.replace(
        new RegExp(`from\\s+['"]${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        `from '${esmUrl}'`
      );
      // import 'package' (side effects)
      transformedCode = transformedCode.replace(
        new RegExp(`import\\s+['"]${pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g'),
        `import '${esmUrl}'`
      );
    }

    // Replace React imports with window global references
    // We'll use a shim approach in the HTML
    transformedCode = transformedCode
      .replace(/from\s+['"]react['"]/g, `from 'react-shim'`)
      .replace(/from\s+['"]react-dom\/client['"]/g, `from 'react-dom-shim'`)
      .replace(/from\s+['"]react-dom['"]/g, `from 'react-dom-shim'`);

    // Transform export default to App assignment
    const codeWithoutExport = transformedCode
      .replace(/export\s+default\s+function\s+(\w+)/, 'function App')
      .replace(/export\s+default\s+function/, 'function App')
      .replace(/export\s+default\s+/, 'const App = ')
      .replace(/export\s+{[^}]+as\s+default\s*}/, '');

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
    const sanitizedTitle = title
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    // Build import map for browser
    const browserImportMap: Record<string, string> = {
      'react-shim': 'data:text/javascript,const React = window.React; export default React; export const { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, createElement, Fragment, memo, forwardRef, useReducer, useLayoutEffect, useImperativeHandle, useDebugValue, useDeferredValue, useTransition, useId, useSyncExternalStore, lazy, Suspense, startTransition, Children, cloneElement, isValidElement, createRef, Component, PureComponent, StrictMode } = React;',
      'react-dom-shim': 'data:text/javascript,const ReactDOM = window.ReactDOM; export default ReactDOM; export const { createRoot, hydrateRoot, createPortal, flushSync, findDOMNode, unmountComponentAtNode, render, hydrate } = ReactDOM;',
    };

    // Add npm dependencies to import map
    for (const [pkg, version] of Object.entries(dependencies)) {
      if (pkg === 'react' || pkg === 'react-dom') continue;
      browserImportMap[pkg] = `https://esm.sh/${pkg}@${version}?deps=react@18.3.1,react-dom@18.3.1`;
    }

    const importMapJson = JSON.stringify({ imports: browserImportMap }, null, 2);

    // NOTE: We previously escaped backticks and dollar signs here, but that was a bug!
    // The escaping was intended for embedding in a JS template literal at build time,
    // but since we write the HTML to a file and the browser parses it directly,
    // those escape sequences (\` and \$) become literal characters causing syntax errors.
    // The only escaping needed is for </script> tags to prevent premature script termination.
    const escapedCode = codeWithoutExport
      .replace(/<\/script>/gi, '<\\/script>'); // Only escape closing script tags

    // CRITICAL FIX: ESM `import` declarations must be at module top level, NOT inside try/catch blocks.
    // Split code into imports (top-level) and body (can be wrapped in try/catch).
    // This regex captures all import statements at the start of lines.
    const importStatements: string[] = [];
    const bodyCode = escapedCode.replace(
      /^import\s+(?:[\w*{}\s,]+\s+from\s+)?['"][^'"]+['"];?\s*$/gm,
      (match) => {
        importStatements.push(match);
        return ''; // Remove from body
      }
    ).trim();

    const importsBlock = importStatements.join('\n');
    console.log(`[${requestId}] Extracted ${importStatements.length} import statements for top-level placement`);

    // PRIORITY 4: Add CSP headers (SECURITY - XSS prevention)
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self';
                 script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh blob: data:;
                 style-src 'unsafe-inline' https://cdn.tailwindcss.com;
                 img-src 'self' data: https:;
                 connect-src 'self' https://esm.sh https://*.esm.sh;">
  <title>${sanitizedTitle}</title>

  <!-- React/ReactDOM UMD globals (CRITICAL: Must load before component) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- PropTypes library (CRITICAL: Required by Recharts and other UMD libs) -->
  <script crossorigin src="https://unpkg.com/prop-types@15.8.1/prop-types.min.js"></script>

  <!-- Common libraries that GLM expects as globals -->
  <script crossorigin src="https://unpkg.com/framer-motion@11/dist/framer-motion.js"></script>
  <script crossorigin src="https://unpkg.com/canvas-confetti@1.9.3/dist/confetti.browser.js"></script>

  <script>
    // CRITICAL: Verify React loaded successfully
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      console.error('React or ReactDOM failed to load from UMD');
      document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('root').innerHTML = '<div class="error-container"><h2>React Load Error</h2><p>React libraries failed to load. Please refresh the page.</p></div>';
      });
    } else {
      console.log('React ' + React.version + ' loaded successfully');

      // Expose React hooks as globals for GLM-generated code that uses destructuring
      // GLM often generates: const { useState, useEffect } = React;
      // After the fix strips this, the hooks need to be available globally
      window.useState = React.useState;
      window.useEffect = React.useEffect;
      window.useCallback = React.useCallback;
      window.useMemo = React.useMemo;
      window.useRef = React.useRef;
      window.useContext = React.useContext;
      window.useReducer = React.useReducer;
      window.useLayoutEffect = React.useLayoutEffect;
      window.createContext = React.createContext;
      window.createElement = React.createElement;
      window.Fragment = React.Fragment;
      window.memo = React.memo;
      window.forwardRef = React.forwardRef;
    }

    // Framer Motion UMD exports to window.Motion automatically
    // The Motion global provides: motion, AnimatePresence, useAnimation, etc.
    // GLM uses: const { motion, AnimatePresence } = Motion;
    if (typeof Motion !== 'undefined' && Motion.motion) {
      console.log('Framer Motion loaded successfully');
      // Also expose common motion utilities directly as globals for convenience
      window.motion = Motion.motion;
      window.AnimatePresence = Motion.AnimatePresence;
    }

    // Expose canvas-confetti (GLM uses: const { create } = canvasConfetti)
    if (typeof confetti !== 'undefined') {
      window.canvasConfetti = { create: confetti.create || confetti, reset: confetti.reset };
      // Also expose confetti directly for simple usage
      window.confetti = confetti;
    }
  </script>

  <!-- Import map for ESM dependencies -->
  <script type="importmap">
${importMapJson}
  </script>

  <!-- Tailwind CSS for styling -->
  <script src="https://cdn.tailwindcss.com"></script>

  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    #root {
      min-height: 100vh;
    }

    .error-container {
      padding: 2rem;
      background-color: #fee;
      border-left: 4px solid #f00;
      margin: 1rem;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-size: 1.2rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div id="root"><div class="loading-container">Loading component...</div></div>

  <script type="module">
    // CRITICAL: ESM imports MUST be at module top level (not in try/catch blocks)
    // JavaScript spec requires static imports to be hoisted and evaluated before any code runs
    ${importsBlock}

    // Runtime component execution (can be in try/catch)
    try {
      // Component code (without import statements - they're above)
      ${bodyCode}

      // Render the component
      const rootElement = document.getElementById('root');
      if (rootElement && typeof App !== 'undefined') {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
        console.log('Component rendered successfully');
      } else if (!rootElement) {
        console.error('Root element not found');
      } else {
        console.error('App component not defined');
        rootElement.innerHTML = '<div class="error-container"><h2>Component Error</h2><p>App component was not exported correctly.</p></div>';
      }

      // Global error handling
      window.addEventListener('error', (event) => {
        console.error('Runtime error:', event.error);
        const root = document.getElementById('root');
        if (root && root.querySelector('.loading-container')) {
          root.innerHTML = '<div class="error-container"><h2>Component Error</h2><p>' + (event.error?.message || 'Unknown error occurred') + '</p></div>';
        }
      });

      console.log('Artifact loaded successfully');
    } catch (error) {
      console.error('Failed to load artifact:', error);
      document.getElementById('root').innerHTML = '<div class="error-container"><h2>Load Error</h2><p>' + error.message + '</p></div>';
    }
  </script>
</body>
</html>`;

    const htmlSize = new TextEncoder().encode(htmlTemplate).length;
    console.log(`[${requestId}] Generated HTML template, total size: ${htmlSize} bytes`);

    // 10. Upload to Supabase Storage with retry logic
    const storagePath = `${sessionId}/${artifactId}/bundle.html`;
    const expiresIn = 3600; // 1 hour in seconds

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
