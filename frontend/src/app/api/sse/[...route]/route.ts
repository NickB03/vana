/**
 * SSE Proxy Route Handler - Secure Server-Sent Events proxy
 * Prevents JWT token exposure in browser URLs by handling authentication server-side
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractAuthTokens } from '@/lib/auth-cookies';

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * GET handler for SSE proxy with dynamic route segments
 * Handles URLs like /api/sse/agent_network_sse/session123
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ route: string[] }> }
) {
  try {
    // Extract authentication tokens using secure extraction utility
    const { accessToken } = extractAuthTokens(request);

    // In development mode, allow SSE without authentication
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (!isDevelopment && !accessToken) {
      return new NextResponse('Unauthorized: No access token found', {
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Construct upstream SSE URL
    const resolvedParams = await params;
    const routePath = resolvedParams.route.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const upstreamUrl = `${API_BASE_URL}/${routePath}${searchParams ? `?${searchParams}` : ''}`;

    console.log('[SSE Proxy] Route:', routePath);
    console.log('[SSE Proxy] Upstream URL:', upstreamUrl);
    console.log('[SSE Proxy] Has auth token:', !!accessToken);
    console.log('[SSE Proxy] Development mode:', isDevelopment);

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

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              // Forward SSE data to client
              const chunk = decoder.decode(value, { stream: true });
              console.log('[SSE Proxy] Forwarding chunk:', chunk.substring(0, 100));
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          } catch (error) {
            console.error('SSE proxy stream error:', error);
            // Send error event to client
            const errorEvent = `event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorEvent));
          } finally {
            controller.close();
            reader.releaseLock();
          }
        },

        cancel() {
          // Cleanup when client disconnects
          // SSE proxy stream cancelled - use proper logger if needed
          reader.cancel();
        }
      });

      // Return streaming response with SSE headers
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Connection': 'keep-alive',
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