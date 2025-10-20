/**
 * SSE Proxy Route Handler - Query-based SSE proxy
 * Handles SSE proxying using ?path= query parameter for encoded URLs
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractAuthTokens } from '@/lib/auth-cookies';

// Environment configuration
const API_BASE_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

/**
 * GET handler for SSE proxy with query parameter
 * Handles URLs like /api/sse?path=http%3A//backend/sse/endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Extract target path from query parameter
    const searchParams = request.nextUrl.searchParams;
    const targetPath = searchParams.get('path');

    if (!targetPath) {
      return new NextResponse('Missing path parameter', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Extract authentication tokens using secure extraction utility
    const { accessToken } = extractAuthTokens(request);

    if (!accessToken) {
      return new NextResponse('Unauthorized: No access token found', { 
        status: 401,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Construct upstream SSE URL
    let upstreamUrl: string;
    try {
      // If targetPath is a full URL, use it directly
      if (targetPath.startsWith('http')) {
        upstreamUrl = decodeURIComponent(targetPath);
      } else {
        // If relative path, construct full URL
        const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
        upstreamUrl = `${API_BASE_URL}${cleanPath}`;
      }
    } catch {
      return new NextResponse('Invalid path parameter', {
        status: 400,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Create SSE connection to upstream server with authentication
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    if (!upstreamResponse.ok) {
      return new NextResponse(`Upstream SSE error: ${upstreamResponse.status}`, {
        status: upstreamResponse.status,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    if (!upstreamResponse.body) {
      return new NextResponse('No response body from upstream', {
        status: 502,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Create ReadableStream for SSE proxy
    const stream = new ReadableStream({
      async start(controller) {
        const reader = upstreamResponse.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            // Forward SSE data to client
            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        } catch (error) {
          console.error('SSE proxy stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
          reader.releaseLock();
        }
      },

      cancel() {
        // Cleanup when client disconnects
        // SSE proxy stream cancelled - use proper logger if needed
      }
    });

    // Return SSE response with proper headers
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, x-auth-token',
      },
    });

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
