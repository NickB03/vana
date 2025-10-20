/**
 * POST SSE Proxy Route Handler - Canonical ADK Streaming
 *
 * This endpoint enables canonical ADK streaming mode by proxying POST requests
 * to the backend's /run_sse endpoint, which streams raw ADK events without
 * legacy conversion.
 *
 * PHASE 3.3: Frontend Endpoint Switch
 * - Activated when NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
 * - Forwards to backend POST /run_sse (Phase 1.1)
 * - Streams canonical ADK events to frontend
 * - Triggers AdkEventHandler (not LegacyEventHandler)
 * - Populates rawAdkEvents in store
 *
 * SECURITY:
 * - CSRF validation (skip for localhost in development)
 * - JWT authentication required (except localhost/allowlisted hosts)
 * - Same security model as [...route]/route.ts
 *
 * @see /docs/plans/phase3_3_execution_plan.md
 * @see /docs/validation/phase3_canonical_mode_verification.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractAuthTokens } from '@/lib/auth-cookies';
import { validateCsrfToken, logCsrfAttempt } from '@/lib/csrf-server';

// Edge Runtime Configuration for optimal SSE performance
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Environment configuration
const API_BASE_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

/**
 * Security Configuration: Allowlist for unauthenticated SSE access
 *
 * SECURITY WARNING: Only use this for development/testing environments!
 * Production environments should NEVER bypass authentication.
 *
 * Format: Comma-separated list of host:port combinations
 * Example: "dev.example.com:3000,staging.example.com:3000"
 *
 * Leave empty or undefined for production to enforce authentication.
 */
const ALLOWED_UNAUTHENTICATED_HOSTS =
  process.env.ALLOW_UNAUTHENTICATED_SSE?.split(',').map(h => h.trim()).filter(Boolean) || [];

/**
 * POST handler for canonical ADK SSE streaming
 *
 * Expected request body:
 * {
 *   appName: string,
 *   userId: string,
 *   sessionId: string,
 *   newMessage: {
 *     parts: [{ text: string }],
 *     role: "user"
 *   },
 *   streaming: boolean
 * }
 *
 * @param request - Next.js request with JSON body
 * @returns StreamingResponse with canonical ADK events
 */
export async function POST(request: NextRequest) {
  try {
    // ═══════════════════════════════════════════════════════════════════
    // SECURITY CHECK 1: Determine if localhost/development bypass applies
    // ═══════════════════════════════════════════════════════════════════
    const requestHost = request.headers.get('host') || '';

    // Local development check: Only allow localhost/127.0.0.1
    const isLocalDevelopment =
      requestHost.startsWith('localhost:') ||
      requestHost.startsWith('127.0.0.1:') ||
      requestHost === 'localhost' ||
      requestHost === '127.0.0.1';

    // Explicit allowlist check: For development/testing environments only
    const isAllowedHost = ALLOWED_UNAUTHENTICATED_HOSTS.includes(requestHost);

    console.log('[SSE Proxy /run_sse] POST request received');
    console.log('[SSE Proxy /run_sse] Host:', requestHost);
    console.log('[SSE Proxy /run_sse] Is local development:', isLocalDevelopment);

    // ═══════════════════════════════════════════════════════════════════
    // SECURITY CHECK 2: CSRF Token Validation (skip for localhost in dev)
    // ═══════════════════════════════════════════════════════════════════
    if (!isLocalDevelopment && !isAllowedHost) {
      const csrfValid = validateCsrfToken(request);
      logCsrfAttempt(request, csrfValid);

      if (!csrfValid) {
        console.warn('[SSE Proxy /run_sse] CSRF validation failed');
        return new NextResponse('CSRF validation failed. Please refresh the page and try again.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
          }
        });
      }
    } else {
      console.log('[SSE Proxy /run_sse] Skipping CSRF validation for localhost development');
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECURITY CHECK 3: Authentication Token Validation
    // ═══════════════════════════════════════════════════════════════════
    const { accessToken } = extractAuthTokens(request);
    console.log('[SSE Proxy /run_sse] Has access token:', !!accessToken);

    // Enforce authentication unless explicitly bypassed
    if (!isLocalDevelopment && !isAllowedHost && !accessToken) {
      console.warn('[SSE Proxy /run_sse] Blocked unauthenticated request from:', requestHost);
      return new NextResponse('Unauthorized: Authentication required', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
          'WWW-Authenticate': 'Bearer realm="SSE Proxy"',
        }
      });
    }

    // Log warning if authentication was bypassed
    if (!accessToken && (isLocalDevelopment || isAllowedHost)) {
      console.warn('[SSE Proxy /run_sse] Allowing unauthenticated access for:', requestHost);
      console.warn('[SSE Proxy /run_sse] Reason:', isLocalDevelopment ? 'Local development' : 'Allowlisted host');
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST BODY PARSING & VALIDATION
    // ═══════════════════════════════════════════════════════════════════
    let requestBody;
    try {
      requestBody = await request.json();
      console.log('[SSE Proxy /run_sse] Request body parsed:', {
        appName: requestBody.appName,
        userId: requestBody.userId,
        sessionId: requestBody.sessionId,
        hasNewMessage: !!requestBody.newMessage,
        streaming: requestBody.streaming
      });
    } catch (error) {
      console.error('[SSE Proxy /run_sse] Failed to parse request body:', error);
      return new NextResponse('Invalid JSON request body', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Validate required fields
    if (!requestBody.appName || !requestBody.userId || !requestBody.sessionId) {
      console.error('[SSE Proxy /run_sse] Missing required fields:', requestBody);
      return new NextResponse('Missing required fields: appName, userId, sessionId', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // UPSTREAM REQUEST TO BACKEND POST /run_sse
    // ═══════════════════════════════════════════════════════════════════
    const upstreamUrl = `${API_BASE_URL}/run_sse`;
    console.log('[SSE Proxy /run_sse] Forwarding to upstream:', upstreamUrl);

    // Prepare headers for upstream request
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    // Only add Authorization header if we have a token
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // CRITICAL FIX: Forward CSRF token to backend
    // Even though we skip CSRF validation in the proxy for localhost,
    // the backend still expects it. Forward the token from the client.
    const csrfToken = request.headers.get('x-csrf-token');
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
      console.log('[SSE Proxy /run_sse] Forwarding CSRF token to backend');
    } else {
      console.warn('[SSE Proxy /run_sse] No CSRF token in request headers');
    }

    // Forward POST request to backend
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      // Disable Next.js fetch caching for SSE
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    console.log('[SSE Proxy /run_sse] Upstream response:', response.status, response.statusText);

    // Handle upstream errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SSE Proxy /run_sse] Upstream error:', response.status, errorText);
      return new NextResponse(`Upstream SSE error: ${response.status} - ${errorText}`, {
        status: response.status,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Ensure response has a body
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('[SSE Proxy /run_sse] No response body from upstream');
      return new NextResponse('No response body from upstream', {
        status: 502,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // STREAMING RESPONSE TO CLIENT
    // ═══════════════════════════════════════════════════════════════════
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        // Send initial connection event
        controller.enqueue(encoder.encode(': connected\n\n'));
        console.log('[SSE Proxy /run_sse] SSE stream started');

        // Keep-alive mechanism (send comment every 15s if no activity)
        let lastActivityTime = Date.now();
        const keepAliveInterval = setInterval(() => {
          if (Date.now() - lastActivityTime > 15000) {
            try {
              controller.enqueue(encoder.encode(': keepalive\n\n'));
              lastActivityTime = Date.now();
            } catch (error) {
              console.error('[SSE Proxy /run_sse] Keep-alive error:', error);
              clearInterval(keepAliveInterval);
            }
          }
        }, 15000);

        try {
          let eventCount = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[SSE Proxy /run_sse] Stream completed, total events forwarded:', eventCount);
              break;
            }

            lastActivityTime = Date.now();
            const chunk = decoder.decode(value, { stream: true });

            // Count events for logging
            const eventMatches = chunk.match(/^data:/gm);
            if (eventMatches) {
              eventCount += eventMatches.length;
            }

            // Forward chunk to client
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          console.error('[SSE Proxy /run_sse] Stream error:', error);

          // Send error event to client
          const errorEvent = `event: error\ndata: ${JSON.stringify({
            error: String(error),
            message: 'SSE proxy stream error'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } finally {
          clearInterval(keepAliveInterval);
          controller.close();
          reader.releaseLock();
          console.log('[SSE Proxy /run_sse] Stream closed');
        }
      },

      cancel() {
        console.log('[SSE Proxy /run_sse] Client disconnected');
        reader.cancel();
      }
    });

    // Return streaming response with SSE headers
    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token',
        // Disable buffering for SSE (critical for streaming)
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('[SSE Proxy /run_sse] Proxy error:', error);
    return new NextResponse(
      `Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
        }
      }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 * Required for cross-origin POST requests
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token, X-CSRF-Token',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}
