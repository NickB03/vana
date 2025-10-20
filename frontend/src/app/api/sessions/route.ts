/**
 * POST /api/sessions - Session Creation Proxy
 *
 * Proxies session creation requests to backend ADK endpoint following
 * canonical ADK pattern from Phase 3.3.
 *
 * CANONICAL ADK PATTERN:
 * 1. Frontend calls POST /api/sessions (this endpoint)
 * 2. Proxy forwards to backend POST /apps/{app}/users/{user}/sessions
 * 3. Backend generates session ID and initializes in ADK
 * 4. Frontend receives session ID before calling /run_sse
 *
 * SECURITY:
 * - Forwards JWT tokens from cookies/headers to backend
 * - No CSRF validation required (GET-like operation, just creates resource)
 * - Backend handles authentication and authorization
 *
 * @see /docs/plans/phase3_3_execution_plan.md
 * @see /app/routes/adk_routes.py (lines 271-376)
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractAuthTokens } from '@/lib/auth-cookies';

// Environment configuration
const API_BASE_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';
const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';

/**
 * POST handler for session creation
 *
 * Backend generates session ID - no request body required.
 * Returns SessionCreationResult with session metadata.
 *
 * @param request - Next.js request (empty body expected)
 * @returns SessionCreationResult or error response
 */
export async function POST(request: NextRequest) {
  try {
    // ═══════════════════════════════════════════════════════════════════
    // AUTHENTICATION TOKEN EXTRACTION
    // ═══════════════════════════════════════════════════════════════════
    const { accessToken } = extractAuthTokens(request);

    console.log('[API Route /api/sessions] Creating session via backend:', {
      url: `${API_BASE_URL}/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions`,
      hasAuth: !!accessToken,
      method: 'POST'
    });

    // ═══════════════════════════════════════════════════════════════════
    // UPSTREAM REQUEST TO BACKEND
    // ═══════════════════════════════════════════════════════════════════
    const upstreamUrl = `${API_BASE_URL}/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions`;

    // Prepare headers for upstream request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Add Authorization header if available
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Forward POST request to backend (empty body - backend generates session ID)
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({}), // Empty body - backend generates session ID
      cache: 'no-store', // Disable Next.js caching
      next: { revalidate: 0 }
    });

    console.log('[API Route /api/sessions] Upstream response:', response.status, response.statusText);

    // ═══════════════════════════════════════════════════════════════════
    // RESPONSE HANDLING
    // ═══════════════════════════════════════════════════════════════════
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`
      }));

      console.error('[API Route /api/sessions] Backend error:', {
        status: response.status,
        error: errorData
      });

      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || errorData.error || `Backend session creation failed: ${response.status}`
        },
        { status: response.status }
      );
    }

    // Parse successful response
    const data = await response.json();

    // TEMPORARY FIX (Phase 3.3): Normalize ADK response format
    // ADK returns: {id, appName, userId, state, events, lastUpdateTime}
    // We expect: {session_id, app_name, user_id, created_at}
    // TODO: Fix backend route registration conflict so custom handler executes
    const normalizedData = {
      session_id: data.id || data.session_id,
      app_name: data.appName || data.app_name,
      user_id: data.userId || data.user_id,
      created_at: data.created_at || new Date().toISOString()
    };

    console.log('[API Route /api/sessions] Session created successfully:', normalizedData);

    // Return canonical response format
    return NextResponse.json({
      success: true,
      data: normalizedData
    });

  } catch (error) {
    console.error('[API Route /api/sessions] Session creation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown session creation error'
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
