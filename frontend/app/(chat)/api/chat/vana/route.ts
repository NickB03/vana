import { auth } from '@/app/(auth)/auth';
import { getChatById, saveChat, saveMessages } from '@/lib/db/queries';
import { ChatSDKError, VanaBackendError, createVanaErrorFromResponse } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';
import type { VisibilityType } from '@/components/visibility-selector';

export const maxDuration = 60;

// Environment validation and configuration
const VANA_BASE_URL = process.env.VANA_BASE_URL || 'http://localhost:8001';
const REQUEST_TIMEOUT = parseInt(process.env.VANA_REQUEST_TIMEOUT || '30000', 10);
const MAX_RETRIES = parseInt(process.env.VANA_MAX_RETRIES || '2', 10);

// Validate environment configuration on module load
if (!process.env.VANA_BASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('VANA_BASE_URL not configured in production environment');
}

console.log('Vana route configuration:', {
  baseUrl: VANA_BASE_URL,
  requestTimeout: REQUEST_TIMEOUT,
  maxRetries: MAX_RETRIES,
  nodeEnv: process.env.NODE_ENV
});

interface VanaRequest {
  id: string;
  message: ChatMessage;
  selectedVisibilityType: VisibilityType;
  vanaOptions?: {
    agents?: string[];
    model?: string;
    enableProgress?: boolean;
  };
}

interface VanaResponse {
  task_id: string;
  message_id: string;
  status: 'started' | 'error';
  stream_url: string;
}

/**
 * POST /api/chat/vana
 * Initialize a chat session with Vana backend
 */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`[${requestId}] POST /api/chat/vana - Starting request`, {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: new Date().toISOString()
  });

  try {
    // Parse and validate request body
    let requestBody: VanaRequest;
    try {
      requestBody = await request.json();
      console.log(`[${requestId}] Request body parsed successfully:`, {
        hasId: !!requestBody.id,
        hasMessage: !!requestBody.message,
        messagePartsCount: requestBody.message?.parts?.length || 0,
        vanaOptions: requestBody.vanaOptions
      });
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new ChatSDKError('bad_request:api').toResponse();
    }
    const { id, message, selectedVisibilityType, vanaOptions = {} } = requestBody;

    // Validate required fields
    if (!id || !message) {
      console.error(`[${requestId}] Missing required fields:`, { hasId: !!id, hasMessage: !!message });
      return new ChatSDKError('bad_request:api').toResponse();
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user) {
      console.warn(`[${requestId}] Unauthorized request - no session`);
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    console.log(`[${requestId}] Authentication successful:`, {
      userId: session.user.id,
      userType: session.user.type || 'unknown'
    });

    // Check if chat exists, create if not
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message });
      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else if (chat.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    // Save user message to database
    await saveMessages({
      messages: [{
        chatId: id,
        id: message.id,
        role: 'user',
        parts: message.parts,
        attachments: [],
        createdAt: new Date(),
      }],
    });

    // Prepare request to Vana backend
    const vanaEndpoint = `${VANA_BASE_URL}/chat/${id}/message`;
    const requestPayload = {
      message: message.parts.find(part => part.type === 'text')?.text || '',
      message_id: message.id,
      model: vanaOptions.model || 'gemini-pro',
      agents: vanaOptions.agents || [],
      enable_progress: vanaOptions.enableProgress ?? true,
      metadata: {
        role: message.role,
        created_at: new Date().toISOString(),
        user_id: session.user.id,
        chat_id: id,
      },
    };

    console.log(`[${requestId}] Sending request to Vana backend:`, {
      endpoint: vanaEndpoint,
      payload: { ...requestPayload, message: requestPayload.message.substring(0, 100) + '...' },
      timeout: REQUEST_TIMEOUT
    });
    
    try {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), REQUEST_TIMEOUT);
      
      const vanaResponse = await fetch(vanaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-User-ID': session.user.id,
          'X-Session-ID': id,
          'X-Request-ID': requestId,
          'User-Agent': 'Vana-Frontend/1.0',
          // Add CORS headers for cross-origin requests
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Session-ID'
        },
        body: JSON.stringify(requestPayload),
        signal: abortController.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] Vana backend response received:`, {
        status: vanaResponse.status,
        statusText: vanaResponse.statusText,
        headers: Object.fromEntries(vanaResponse.headers.entries()),
        responseTime: `${responseTime}ms`
      });

      if (!vanaResponse.ok) {
        let errorDetails = null;
        let errorText = '';
        
        try {
          errorText = await vanaResponse.text();
          errorDetails = JSON.parse(errorText);
        } catch (parseErr) {
          // If JSON parsing fails, use raw text
          errorDetails = { raw: errorText };
        }
        
        console.error(`[${requestId}] Vana backend error:`, {
          status: vanaResponse.status,
          statusText: vanaResponse.statusText,
          errorDetails,
          responseTime: `${Date.now() - startTime}ms`
        });
        
        // Create appropriate error based on status code
        if (vanaResponse.status === 503) {
          return new ChatSDKError('external_service:vana').toResponse();
        } else if (vanaResponse.status === 408) {
          return new ChatSDKError('timeout:vana').toResponse();
        } else if (vanaResponse.status >= 500) {
          return new ChatSDKError('external_service:vana').toResponse();
        } else {
          return new ChatSDKError('bad_request:api').toResponse();
        }
      }

      let vanaData;
      try {
        vanaData = await vanaResponse.json();
        console.log(`[${requestId}] Vana response parsed successfully:`, {
          hasTaskId: !!vanaData.task_id,
          responseFields: Object.keys(vanaData)
        });
      } catch (jsonParseError) {
        console.error(`[${requestId}] Failed to parse Vana JSON response:`, jsonParseError);
        return new ChatSDKError('parse_error:vana').toResponse();
      }
      
      const response: VanaResponse = {
        task_id: vanaData.task_id,
        message_id: message.id,
        status: 'started',
        stream_url: `/api/chat/vana/${id}/stream?task_id=${vanaData.task_id}`,
      };

      console.log(`[${requestId}] Vana request completed successfully:`, {
        taskId: response.task_id,
        messageId: response.message_id,
        totalTime: `${Date.now() - startTime}ms`
      });
      
      return Response.json(response, { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'X-Response-Time': `${Date.now() - startTime}ms`,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'X-Request-ID, X-Response-Time'
        }
      });

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`[${requestId}] Failed to communicate with Vana backend:`, {
        error: error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        responseTime: `${responseTime}ms`,
        name: error instanceof Error ? error.name : undefined
      });
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.warn(`[${requestId}] Request aborted due to timeout`);
          return new ChatSDKError('timeout:vana').toResponse();
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.error(`[${requestId}] Network error connecting to Vana backend`);
          return new ChatSDKError('network_error:vana').toResponse();
        }
      }
      
      // Fallback: Return error but allow client to retry with Vercel AI
      return Response.json({
        error: 'vana_unavailable',
        message: 'Vana backend is currently unavailable',
        fallback_to_vercel: true,
        details: error instanceof Error ? error.message : 'Unknown error',
        request_id: requestId
      }, { 
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'Retry-After': '5',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[${requestId}] Unexpected Vana API error:`, {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return Response.json({
      error: 'internal_server_error',
      message: 'An unexpected error occurred',
      request_id: requestId
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/**
 * GET /api/chat/vana/status
 * Check Vana backend availability
 */
export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`[${requestId}] GET /api/chat/vana/status - Health check starting`, {
    baseUrl: VANA_BASE_URL,
    timestamp: new Date().toISOString()
  });
  
  try {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);
    
    const response = await fetch(`${VANA_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Vana-Frontend-HealthCheck/1.0',
        'X-Request-ID': requestId
      },
      signal: abortController.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    console.log(`[${requestId}] Vana health check response:`, {
      status: response.status,
      ok: response.ok,
      responseTime: `${responseTime}ms`
    });

    return Response.json({
      available: response.ok,
      status: response.status,
      url: VANA_BASE_URL,
      response_time: responseTime,
      timestamp: new Date().toISOString(),
      request_id: requestId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-Response-Time': `${responseTime}ms`,
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[${requestId}] Vana health check failed:`, {
      error: error,
      message: error instanceof Error ? error.message : 'Unknown error',
      responseTime: `${responseTime}ms`
    });
    
    return Response.json({
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      url: VANA_BASE_URL,
      response_time: responseTime,
      timestamp: new Date().toISOString(),
      request_id: requestId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}