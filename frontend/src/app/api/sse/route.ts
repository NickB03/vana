/**
 * Secure Server-Sent Events (SSE) endpoint
 * Implements comprehensive security measures for real-time communication
 */

import { NextRequest } from 'next/server';
import { handleSSECORS } from '@/lib/cors';
import { 
  sanitizeText, 
  isValidUuid, 
  logSecurityViolation,
  isRateLimited
} from '@/lib/security';
import { tokenManager } from '@/lib/auth-security';

/**
 * SSE endpoint with enhanced security
 */
export async function GET(request: NextRequest) {
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const origin = request.headers.get('origin');
  
  try {
    // CORS validation for SSE
    const corsResult = handleSSECORS(origin, userAgent);
    if (!corsResult.isValid) {
      logSecurityViolation('invalid_input', {
        source: 'sse-cors',
        origin,
        ip: clientIP
      });
      
      return new Response('CORS policy violation', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': 'none'
        }
      });
    }
    
    // Rate limiting for SSE connections
    const connectionKey = `sse_connection_${clientIP}`;
    if (isRateLimited(connectionKey, 5, 60000)) { // 5 connections per minute per IP
      logSecurityViolation('rate_limit_exceeded', {
        source: 'sse-endpoint',
        ip: clientIP,
        type: 'connection_limit'
      });
      
      return new Response('Too many SSE connection attempts', {
        status: 429,
        headers: {
          'Retry-After': '60',
          'Content-Type': 'text/plain'
        }
      });
    }
    
    // Validate and sanitize session ID
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return new Response('Session ID required', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    const sanitizedSessionId = sanitizeText(sessionId);
    if (!isValidUuid(sanitizedSessionId)) {
      logSecurityViolation('invalid_input', {
        source: 'sse-session-id',
        sessionId: sessionId.substring(0, 20),
        ip: clientIP
      });
      
      return new Response('Invalid session ID format', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Authentication validation
    try {
      const tokens = await tokenManager.validateAndRefreshSession();
      if (!tokens) {
        return new Response('Authentication required', {
          status: 401,
          headers: { 
            'Content-Type': 'text/plain',
            'WWW-Authenticate': 'Bearer'
          }
        });
      }
    } catch (error) {
      logSecurityViolation('invalid_input', {
        source: 'sse-auth',
        error: error instanceof Error ? error.message : 'Unknown auth error',
        ip: clientIP
      });
      
      return new Response('Authentication failed', {
        status: 401,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Create SSE response with security headers
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const connectMessage = `data: ${JSON.stringify({
          type: 'connection_established',
          sessionId: sanitizedSessionId,
          timestamp: new Date().toISOString()
        })}\n\n`;
        
        controller.enqueue(encoder.encode(connectMessage));
        
        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`;
            
            controller.enqueue(encoder.encode(heartbeat));
          } catch (error) {
            console.error('SSE heartbeat error:', error);
            clearInterval(heartbeatInterval);
            controller.close();
          }
        }, 30000); // 30-second heartbeat
        
        // Clean up on connection close
        const cleanup = () => {
          clearInterval(heartbeatInterval);
          console.log('SSE connection closed for session:', sanitizedSessionId);
        };
        
        // Handle client disconnection
        request.signal.addEventListener('abort', cleanup);
        
        // Store cleanup function for potential manual cleanup
        (controller as any).cleanup = cleanup;
      },
      
      cancel() {
        // Called when client disconnects
        if ((this as any).cleanup) {
          (this as any).cleanup();
        }
      }
    });
    
    return new Response(readable, {
      headers: {
        ...corsResult.headers,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'X-Session-Id': sanitizedSessionId // For debugging (sanitized)
      }
    });
    
  } catch (error) {
    console.error('SSE endpoint error:', error);
    
    logSecurityViolation('invalid_input', {
      source: 'sse-endpoint',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });
    
    return new Response('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Handle OPTIONS preflight requests for SSE
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  const corsResult = handleSSECORS(origin);
  
  return new Response(null, {
    status: 200,
    headers: {
      ...corsResult.headers,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Last-Event-ID',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
}

/**
 * Reject all other HTTP methods
 */
export async function POST() {
  return new Response('Method not allowed', {
    status: 405,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'text/plain'
    }
  });
}

export async function PUT() {
  return new Response('Method not allowed', {
    status: 405,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'text/plain'
    }
  });
}

export async function DELETE() {
  return new Response('Method not allowed', {
    status: 405,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'text/plain'
    }
  });
}

export async function PATCH() {
  return new Response('Method not allowed', {
    status: 405,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'text/plain'
    }
  });
}