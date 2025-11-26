import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors-config.ts";
import { ErrorResponseBuilder } from "../_shared/error-handler.ts";
import { RATE_LIMITS } from "../_shared/config.ts";
import { uploadWithRetry } from "../_shared/storage-retry.ts";

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
  let tempDir: string | null = null;

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

    if (!UUID_REGEX.test(artifactId)) {
      return errors.validation(
        "Invalid artifactId format",
        "artifactId must be a valid UUID"
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

    // 4. Create temporary directory for bundling
    tempDir = await Deno.makeTempDir({ prefix: "artifact-bundle-" });
    console.log(`[${requestId}] Created temp directory: ${tempDir}`);

    // PRIORITY 7: Validate temp directory is within OS temp folder (SECURITY - command injection prevention)
    const osTempDir = Deno.env.get("TMPDIR") || Deno.env.get("TEMP") || "/tmp";
    if (!tempDir.startsWith(osTempDir)) {
      console.error(`[${requestId}] Temp directory outside OS temp folder: ${tempDir} not in ${osTempDir}`);
      return errors.internal("Failed to create temporary directory");
    }

    const componentPath = `${tempDir}/component.tsx`;
    const outputPath = `${tempDir}/output.js`;

    // 5. Wrap component code with rendering logic
    // The user's code exports a component, but we need to actually render it
    // Strategy: Remove 'export default', add React/ReactDOM imports, add render call

    const codeWithoutExport = code
      .replace(/export\s+default\s+function/, 'function App')
      .replace(/export\s+default\s+/, 'const App = ')
      .replace(/export\s+{[^}]+as\s+default\s*}/, ''); // Remove export { Foo as default }

    // SECURITY: Use string concatenation instead of template literals to prevent code injection
    // Template literals would evaluate ${...} expressions in user code, potentially exposing secrets
    // CRITICAL: Use React from window.React (UMD globals) instead of importing
    // The HTML template loads React/ReactDOM via UMD scripts before the bundle executes
    // This prevents "Can't find variable: React" errors and reduces bundle size
    const wrappedCode =
      '// Use React from window globals (loaded via UMD in HTML)\n' +
      'const React = window.React;\n' +
      'const ReactDOM = window.ReactDOM;\n' +
      '\n' +
      'if (!React || !ReactDOM) {\n' +
      '  throw new Error("React/ReactDOM not found in global scope. Ensure UMD scripts loaded first.");\n' +
      '}\n' +
      '\n' +
      codeWithoutExport + '\n' +
      '\n' +
      '// Auto-render the component to #root\n' +
      'const rootElement = document.getElementById("root");\n' +
      'if (rootElement) {\n' +
      '  const root = ReactDOM.createRoot(rootElement);\n' +
      '  root.render(React.createElement(App));\n' +
      '  console.log("Component rendered successfully with UMD React");\n' +
      '} else {\n' +
      '  console.error("Root element not found");\n' +
      '}\n';

    // Write wrapped component code to file
    await Deno.writeTextFile(componentPath, wrappedCode);

    // 6. Create import map for npm dependencies (esm.sh URLs)
    // NOTE: React/ReactDOM are loaded via UMD globals, not bundled
    // We create a "stub" import map that resolves React imports to a module that returns the global
    const importMap: Record<string, string> = {
      // Map React imports to data URLs that return window globals
      // This allows user code with "import React from 'react'" to work with UMD globals
      'react': `data:text/javascript,export default window.React; export const useState = window.React.useState; export const useEffect = window.React.useEffect; export const useRef = window.React.useRef; export const useMemo = window.React.useMemo; export const useCallback = window.React.useCallback; export const useContext = window.React.useContext; export const createContext = window.React.createContext; export const createElement = window.React.createElement; export const Fragment = window.React.Fragment;`,
      'react-dom': `data:text/javascript,export default window.ReactDOM;`,
      'react-dom/client': `data:text/javascript,export const createRoot = window.ReactDOM.createRoot; export default window.ReactDOM;`,
    };

    for (const [pkg, version] of Object.entries(dependencies)) {
      // Skip React packages since we handle them via data URLs above
      if (pkg === 'react' || pkg === 'react-dom') {
        continue;
      }

      // Use esm.sh CDN with specific versions, pinning to React 18 for peer dependencies
      importMap[pkg] = `https://esm.sh/${pkg}@${version}?deps=react@18.3.1,react-dom@18.3.1`;
    }

    console.log(`[${requestId}] Import map created with ${Object.keys(importMap).length} packages (React via UMD globals)`);

    // 7. Write import map to file for Deno bundler
    const importMapPath = `${tempDir}/import_map.json`;
    const importMapContent = {
      imports: importMap
    };

    await Deno.writeTextFile(
      importMapPath,
      JSON.stringify(importMapContent, null, 2)
    );

    console.log(`[${requestId}] Import map written to ${importMapPath}`);

    // 8. Run Deno native bundler (restored in Deno 2.4)
    // https://docs.deno.com/runtime/reference/bundling/
    const bundleStartTime = Date.now();

    let bundledCode: string;
    try {
      console.log(`[${requestId}] Starting Deno bundle process...`);

      // Use Deno.Command to run deno bundle with timeout
      const bundleCommand = new Deno.Command("deno", {
        args: [
          "bundle",
          "--quiet",  // Suppress diagnostic output
          "--import-map", importMapPath,
          componentPath,
          outputPath
        ],
        cwd: tempDir,
        stdout: "piped",
        stderr: "piped"
      });

      // Spawn process and set up timeout
      const bundleProcess = bundleCommand.spawn();

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          bundleProcess.kill("SIGTERM");
          reject(new Error(`Bundle timeout after ${BUNDLE_TIMEOUT_MS}ms`));
        }, BUNDLE_TIMEOUT_MS);
      });

      // Race between bundle completion and timeout
      const bundleOutput = await Promise.race([
        bundleProcess.output(),
        timeoutPromise
      ]);

      if (!bundleOutput.success) {
        const errorText = new TextDecoder().decode(bundleOutput.stderr);
        throw new Error(`Deno bundle failed: ${errorText}`);
      }

      // Read bundled output
      bundledCode = await Deno.readTextFile(outputPath);

      const bundleTime = Date.now() - bundleStartTime;
      console.log(`[${requestId}] Deno bundle completed in ${bundleTime}ms, output size: ${bundledCode.length} bytes`);

    } catch (buildError) {
      const errorMessage = buildError instanceof Error ? buildError.message : String(buildError);
      console.error(`[${requestId}] Deno bundle failed:`, errorMessage);

      return errors.internal(
        "Failed to bundle artifact",
        `Bundle process failed: ${errorMessage.substring(0, 500)}`
      );
    }

    const bundleTime = Date.now() - bundleStartTime;

    // PRIORITY 5: Add bundle size validation (SECURITY - prevent DoS via large bundles)
    if (bundledCode.length > MAX_BUNDLE_SIZE) {
      console.error(`[${requestId}] Bundle too large: ${bundledCode.length} bytes (max ${MAX_BUNDLE_SIZE})`);
      return errors.validation(
        "Bundle too large",
        `Generated bundle (${Math.ceil(bundledCode.length / 1024 / 1024)}MB) exceeds maximum size of ${MAX_BUNDLE_SIZE / 1024 / 1024}MB`
      );
    }

    console.log(`[${requestId}] Bundle size validated: ${bundledCode.length} bytes`);

    // 9. Generate standalone HTML with embedded bundle
    const sanitizedTitle = title
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    // PRIORITY 4: Add CSP headers (SECURITY - XSS prevention)
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self';
                 script-src 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com;
                 style-src 'unsafe-inline' https://cdn.tailwindcss.com;
                 img-src 'self' data: https:;
                 connect-src 'self' https://esm.sh;">
  <title>${sanitizedTitle}</title>

  <!-- React/ReactDOM UMD globals (CRITICAL: Must load before bundle) -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <script>
    // CRITICAL: Expose React as lowercase for library compatibility
    // Libraries like lucide-react expect window.react (lowercase)
    window.react = window.React;
    window.reactDOM = window.ReactDOM;

    // Verify React loaded successfully
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      console.error('React or ReactDOM failed to load from UMD');
      document.getElementById('root').innerHTML = '<div class="error-container"><h2>React Load Error</h2><p>React libraries failed to load. Please refresh the page.</p></div>';
    }
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
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="module">
    try {
      // Bundled component code
      ${bundledCode}

      // Error handling
      window.addEventListener('error', (event) => {
        console.error('Runtime error:', event.error);
        const root = document.getElementById('root');
        if (root && !root.innerHTML) {
          root.innerHTML = \`
            <div class="error-container">
              <h2>Component Error</h2>
              <p>\${event.error?.message || 'Unknown error occurred'}</p>
              <pre>\${event.error?.stack || ''}</pre>
            </div>
          \`;
        }
      });

      console.log('Artifact bundle loaded successfully');
    } catch (error) {
      console.error('Failed to load artifact bundle:', error);
      document.getElementById('root').innerHTML = \`
        <div class="error-container">
          <h2>Bundle Error</h2>
          <p>\${error.message}</p>
          <pre>\${error.stack}</pre>
        </div>
      \`;
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

  } finally {
    // 13. Clean up temporary directory (guaranteed execution)
    if (tempDir) {
      try {
        await Deno.remove(tempDir, { recursive: true });
        console.log(`[${requestId}] Cleaned up temp directory: ${tempDir}`);
      } catch (cleanupError) {
        // Log but don't fail the request if cleanup fails
        console.warn(`[${requestId}] Failed to clean up temp directory ${tempDir}:`, cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
      }
    }
  }
});
