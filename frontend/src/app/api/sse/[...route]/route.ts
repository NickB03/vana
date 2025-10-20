/**
 * SSE Proxy Route Handler - Secure Server-Sent Events proxy
 * Prevents JWT token exposure in browser URLs by handling authentication server-side
 *
 * SECURITY NOTE: Authentication is required for all requests except:
 * 1. Local development (localhost/127.0.0.1)
 * 2. Explicitly allowlisted hosts via ALLOW_UNAUTHENTICATED_SSE
 *
 * WARNING: Never set ALLOW_UNAUTHENTICATED_SSE in production environments
 * as it bypasses authentication checks and creates a security vulnerability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractAuthTokens } from '@/lib/auth-cookies';
import { validateCsrfToken, logCsrfAttempt } from '@/lib/csrf-server';

// Edge Runtime Configuration
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
 * GET handler for SSE proxy with dynamic route segments
 * Handles URLs like /api/sse/agent_network_sse/session123
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    // SECURITY CHECK 1: Determine if localhost/development bypass applies
    // Must check this BEFORE CSRF validation to allow local development
    const requestHost = request.headers.get('host') || '';

    // Local development check: Only allow localhost/127.0.0.1
    const isLocalDevelopment =
      requestHost.startsWith('localhost:') ||
      requestHost.startsWith('127.0.0.1:') ||
      requestHost === 'localhost' ||
      requestHost === '127.0.0.1';

    // Explicit allowlist check: For development/testing environments only
    const isAllowedHost = ALLOWED_UNAUTHENTICATED_HOSTS.includes(requestHost);

    // SECURITY CHECK 2: CSRF Token Validation (skip for localhost in development)
    // Prevents CSRF attacks on SSE endpoints by validating double-submit cookie pattern
    if (!isLocalDevelopment && !isAllowedHost) {
      const csrfValid = validateCsrfToken(request);
      logCsrfAttempt(request, csrfValid);

      if (!csrfValid) {
        console.warn('[SSE Proxy] CSRF validation failed');
        return new NextResponse('CSRF validation failed. Please refresh the page and try again.', {
          status: 403,
          headers: {
            'Content-Type': 'text/plain',
          }
        });
      }
    } else {
      console.log('[SSE Proxy] Skipping CSRF validation for localhost development');
    }

    // SECURITY CHECK 3: Authentication Token Validation
    // Extract authentication tokens using secure extraction utility
    const { accessToken } = extractAuthTokens(request);

    // Log security check results for debugging
    console.log('[SSE Proxy Security] Host:', requestHost);
    console.log('[SSE Proxy Security] Is local development:', isLocalDevelopment);
    console.log('[SSE Proxy Security] Is allowlisted host:', isAllowedHost);
    console.log('[SSE Proxy Security] Has access token:', !!accessToken);

    // Enforce authentication unless explicitly bypassed
    if (!isLocalDevelopment && !isAllowedHost && !accessToken) {
      console.warn('[SSE Proxy Security] Blocked unauthenticated request from:', requestHost);
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
      console.warn('[SSE Proxy Security] Allowing unauthenticated access for:', requestHost);
      console.warn('[SSE Proxy Security] Reason:', isLocalDevelopment ? 'Local development' : 'Allowlisted host');
    }

    // Construct upstream SSE URL
    const resolvedParams = await params;
    const routePath = resolvedParams.route.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const upstreamUrl = `${API_BASE_URL}/${routePath}${searchParams ? `?${searchParams}` : ''}`;

    console.log('[SSE Proxy] Route:', routePath);
    console.log('[SSE Proxy] Upstream URL:', upstreamUrl);
    console.log('[SSE Proxy] Has auth token:', !!accessToken);

    // Create SSE connection to upstream server with authentication
    const headers: HeadersInit = {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    // Only add Authorization header if we have a token
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    // Important: Don't use standard fetch for SSE streams
    // Instead, create a proper streaming response
    try {
      const response = await fetch(upstreamUrl, {
        method: 'GET',
        headers,
        // Disable Next.js fetch caching for SSE
        cache: 'no-store',
        next: { revalidate: 0 }
      });

      console.log('[SSE Proxy] Upstream response:', response.status, response.statusText);
      console.log('[SSE Proxy] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.error('[SSE Proxy] Upstream error:', response.status, await response.text());
        return new NextResponse(`Upstream SSE error: ${response.status}`, {
          status: response.status,
          headers: {
            'Content-Type': 'text/plain',
          }
        });
      }

      // For SSE, we need to stream the response body directly
      const reader = response.body?.getReader();
      if (!reader) {
        return new NextResponse('No response body from upstream', {
          status: 502,
          headers: {
            'Content-Type': 'text/plain',
          }
        });
      }

      // Create a transform stream for SSE data
      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();

          // Send initial connection event
          controller.enqueue(encoder.encode(': connected\n\n'));

          let lastActivityTime = Date.now();
          const keepAliveInterval = setInterval(() => {
            if (Date.now() - lastActivityTime > 15000) {
              controller.enqueue(encoder.encode(': keepalive\n\n'));
              lastActivityTime = Date.now();
            }
          }, 15000);

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              lastActivityTime = Date.now();
              const chunk = decoder.decode(value, { stream: true });
              console.log('[SSE Proxy] Forwarding chunk:', chunk.substring(0, 100));
              controller.enqueue(encoder.encode(chunk));
            }
          } catch (error) {
            console.error('SSE proxy stream error:', error);
            const errorEvent = `event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`;
            controller.enqueue(encoder.encode(errorEvent));
          } finally {
            clearInterval(keepAliveInterval);
            controller.close();
            reader.releaseLock();
          }
        },

        cancel() {
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
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
          // Disable buffering for SSE
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (error) {
      console.error('SSE proxy connection error:', error);
      return new NextResponse(`Proxy connection error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        status: 502,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

  } catch (error) {
    console.error('SSE proxy error:', error);
    return new NextResponse(`Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      }
    });
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
      'Access-Control-Max-Age': '86400',
    },
  });
}
