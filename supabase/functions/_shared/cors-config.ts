/**
 * CORS Configuration for Edge Functions
 *
 * Security: Restrict origins to prevent CSRF and unauthorized API access
 * Default: localhost for development
 * Production: Set ALLOWED_ORIGINS environment variable
 *
 * Supports wildcard patterns for subdomains:
 *   - Exact: "https://example.com"
 *   - Wildcard: "https://*.example.com" (matches any subdomain)
 */

/**
 * Convert a wildcard pattern to a RegExp
 * Only supports * as a subdomain wildcard (e.g., https://*.example.com)
 */
function patternToRegex(pattern: string): RegExp {
  // Escape regex special characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Convert * to regex pattern for subdomain (alphanumeric, hyphens)
  const regexStr = escaped.replace(/\*/g, '[a-zA-Z0-9-]+');
  return new RegExp(`^${regexStr}$`);
}

// Get allowed origins from environment variable or use development defaults
const getAllowedOrigins = (): { exact: Set<string>; patterns: RegExp[] } => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");

  let origins: string[];
  if (envOrigins) {
    // Parse comma-separated list from environment
    origins = envOrigins.split(",").map(origin => origin.trim());
  } else {
    // Development defaults - include common Vite ports (8080-8090) for development flexibility
    origins = [
      "http://localhost:8080",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://localhost:8083",
      "http://localhost:8084",
      "http://localhost:8085",
      "http://localhost:8086",
      "http://localhost:8087",
      "http://localhost:8088",
      "http://localhost:8089",
      "http://localhost:8090",
      "http://localhost:5173",
      "http://127.0.0.1:8080",
      "http://127.0.0.1:8081",
      "http://127.0.0.1:8082",
      "http://127.0.0.1:8083",
      "http://127.0.0.1:8084",
      "http://127.0.0.1:8085",
      "http://127.0.0.1:8086",
      "http://127.0.0.1:8087",
      "http://127.0.0.1:8088",
      "http://127.0.0.1:8089",
      "http://127.0.0.1:8090",
      "http://127.0.0.1:5173",
    ];
  }

  // Separate exact matches from wildcard patterns
  const exact = new Set<string>();
  const patterns: RegExp[] = [];

  for (const origin of origins) {
    if (origin.includes('*')) {
      patterns.push(patternToRegex(origin));
    } else {
      exact.add(origin);
    }
  }

  return { exact, patterns };
};

const ALLOWED_ORIGINS = getAllowedOrigins();

// Keep first exact origin for fallback (backwards compatibility)
const FALLBACK_ORIGIN = ALLOWED_ORIGINS.exact.values().next().value || "http://localhost:8080";

/**
 * Check if origin is allowed (supports exact matches and wildcard patterns)
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Fast path: exact match
  if (ALLOWED_ORIGINS.exact.has(origin)) {
    return true;
  }

  // Slow path: check wildcard patterns
  return ALLOWED_ORIGINS.patterns.some(pattern => pattern.test(origin));
}

/**
 * Get CORS headers for the request
 * Returns appropriate Access-Control-Allow-Origin based on request origin
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if origin is allowed
  const allowedOrigin = isOriginAllowed(requestOrigin) ? requestOrigin : FALLBACK_ORIGIN;

  return {
    "Access-Control-Allow-Origin": allowedOrigin!,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

/**
 * Get CORS headers for preflight (OPTIONS) requests
 */
export function getPreflightHeaders(requestOrigin: string | null): Record<string, string> {
  return getCorsHeaders(requestOrigin);
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get("Origin");

  if (!isOriginAllowed(origin)) {
    return new Response("Origin not allowed", {
      status: 403,
      headers: { "Content-Type": "text/plain" }
    });
  }

  return new Response(null, {
    status: 204,
    headers: getPreflightHeaders(origin)
  });
}
