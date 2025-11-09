/**
 * CORS Configuration for Edge Functions
 *
 * Security: Restrict origins to prevent CSRF and unauthorized API access
 * Default: localhost for development
 * Production: Set ALLOWED_ORIGINS environment variable
 */

// Get allowed origins from environment variable or use development defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");

  if (envOrigins) {
    // Parse comma-separated list from environment
    return envOrigins.split(",").map(origin => origin.trim());
  }

  // Development defaults
  return [
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:5173",
  ];
};

const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers for the request
 * Returns appropriate Access-Control-Allow-Origin based on request origin
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if origin is allowed
  const allowedOrigin = isOriginAllowed(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];

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
