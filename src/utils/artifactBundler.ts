/**
 * Server-side artifact bundling utilities
 *
 * This module handles the client-side integration for server-side bundling
 * of React artifacts with npm dependencies.
 */

import { supabase } from "@/integrations/supabase/client";
import { detectNpmImports, extractNpmDependencies } from "./npmDetection";

export interface BundleRequest {
  code: string;
  dependencies: Record<string, string>;
  artifactId: string;
  sessionId: string;
  title: string;
}

export interface BundleResponse {
  success: true;
  bundleUrl: string;      // Signed URL (1-hour expiry)
  bundleSize: number;     // Total HTML size in bytes
  bundleTime: number;     // Bundling time in milliseconds
  dependencies: string[]; // List of bundled dependencies
  expiresAt: string;      // ISO timestamp of URL expiry
  requestId: string;      // Unique request identifier
}

export interface BundleError {
  success: false;
  error: string;
  details?: string;
  retryAfter?: number;      // Seconds until rate limit resets (429)
  requiresAuth?: boolean;   // True if auth token expired/invalid (401)
  retryable?: boolean;      // True if temporary server error (500)
}

/**
 * Bundles a React artifact with npm dependencies on the server
 *
 * @param code - React component code
 * @param artifactId - Unique artifact identifier
 * @param sessionId - Chat session identifier
 * @param title - Artifact title
 * @returns Bundle response with signed URL or error
 */
export async function bundleArtifact(
  code: string,
  artifactId: string,
  sessionId: string,
  title: string
): Promise<BundleResponse | BundleError> {
  try {
    // 1. Check if bundling is needed
    if (!detectNpmImports(code)) {
      return {
        success: false,
        error: "No npm imports detected",
        details: "Artifact does not require server-side bundling"
      };
    }

    // 2. Extract dependencies
    const dependencies = extractNpmDependencies(code);

    if (Object.keys(dependencies).length === 0) {
      return {
        success: false,
        error: "No valid dependencies found",
        details: "Could not extract npm package versions from imports"
      };
    }

    // 3. Get authentication token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        error: "Authentication required",
        details: "Server-side bundling requires authentication"
      };
    }

    // 4. Call bundle-artifact Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bundle-artifact`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          code,
          dependencies,
          artifactId,
          sessionId,
          title
        } as BundleRequest)
      }
    );

    // 5. Handle response
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("[artifactBundler] Failed to parse response:", parseError);

      return {
        success: false,
        error: "Invalid server response",
        details: "Expected JSON but received invalid data",
        retryable: true
      };
    }

    if (!response.ok) {
      console.error("[artifactBundler] Bundle request failed:", response.status, data);

      // Handle specific error codes
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "300";
        const minutes = Math.ceil(parseInt(retryAfter) / 60);
        return {
          success: false,
          error: "Rate limit exceeded",
          details: `You can bundle again in ${minutes} minutes. Limit: 50 bundles per 5 hours.`,
          retryAfter: parseInt(retryAfter)
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          error: "Session expired",
          details: "Please refresh the page to re-authenticate",
          requiresAuth: true
        };
      }

      if (response.status === 500) {
        return {
          success: false,
          error: "Server error",
          details: "Bundling service temporarily unavailable. Please try again in a moment.",
          retryable: true
        };
      }

      // Generic error for other status codes
      return {
        success: false,
        error: data.error || `Request failed with status ${response.status}`,
        details: data.details
      };
    }

    // Validate response schema before returning
    if (!data.bundleUrl || typeof data.bundleUrl !== 'string') {
      return {
        success: false,
        error: "Invalid server response",
        details: "Server returned malformed bundle data (missing bundleUrl)"
      };
    }

    if (!data.bundleSize || typeof data.bundleSize !== 'number') {
      return {
        success: false,
        error: "Invalid server response",
        details: "Server returned malformed bundle data (invalid bundleSize)"
      };
    }

    if (!Array.isArray(data.dependencies)) {
      return {
        success: false,
        error: "Invalid server response",
        details: "Server returned malformed bundle data (invalid dependencies)"
      };
    }

    return data as BundleResponse;

  } catch (error) {
    console.error("[artifactBundler] Unexpected error:", error);
    return {
      success: false,
      error: "Bundling failed",
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Checks if an artifact needs server-side bundling
 *
 * @param code - Artifact code
 * @param type - Artifact type
 * @returns true if bundling is required
 */
export function needsBundling(code: string, type: string): boolean {
  // Only React artifacts can be bundled
  if (type !== "react") {
    return false;
  }

  // Check for npm imports (excluding React core)
  return detectNpmImports(code);
}
