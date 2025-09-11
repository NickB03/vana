/**
 * Backend Mock Handlers for Testing
 * 
 * Provides fallback mock handlers when backend is not available
 * or for isolated unit testing scenarios.
 */

import { http, HttpResponse } from 'msw';

const BACKEND_URL = 'http://localhost:8000';

// Mock data
const mockUser = {
  user_id: 'mock-user-123',
  username: 'testuser',
  email: 'test@example.com',
  full_name: 'Test User',
  created_at: new Date().toISOString(),
  subscription_tier: 'free' as const,
  preferences: {}
};

const mockAuthToken = {
  access_token: 'mock-jwt-token-for-testing',
  token_type: 'bearer',
  expires_in: 3600
};

// Backend integration mock handlers
export const backendHandlers = [
  // Health check
  http.get(`${BACKEND_URL}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'vana',
      version: '1.0.0',
      environment: {
        current: 'test',
        source: 'NODE_ENV',
        migration_complete: true
      },
      system_metrics: {
        memory: {
          total: 17179869184,
          available: 7157628928,
          percent: 58.3,
          used: 8416477184
        },
        disk: {
          total: 245107195904,
          free: 41255813120,
          percent: 4.6
        },
        cpu_percent: 5.0,
        load_average: [1.67, 11.02, 10.02]
      },
      dependencies: {
        google_api_configured: true,
        session_storage: true,
        cloud_logging: true
      },
      response_time_ms: 50
    });
  }),

  // Authentication endpoints
  http.post(`${BACKEND_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        ...mockAuthToken,
        user: mockUser
      });
    }
    
    return new HttpResponse(null, {
      status: 401,
      statusText: 'Invalid credentials'
    });
  }),

  http.post(`${BACKEND_URL}/auth/register`, async ({ request }) => {
    const body = await request.json() as any;
    
    if (body.email && body.password && body.full_name) {
      return HttpResponse.json({
        message: 'User registered successfully',
        user: {
          ...mockUser,
          email: body.email,
          full_name: body.full_name
        }
      });
    }
    
    return new HttpResponse(null, {
      status: 400,
      statusText: 'Invalid registration data'
    });
  }),

  http.get(`${BACKEND_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.includes('mock-jwt-token')) {
      return HttpResponse.json(mockUser);
    }
    
    return new HttpResponse(null, {
      status: 401,
      statusText: 'Unauthorized'
    });
  }),

  http.post(`${BACKEND_URL}/auth/logout`, () => {
    return HttpResponse.json({ message: 'Logged out successfully' });
  }),

  // Chat endpoints
  http.post(`${BACKEND_URL}/chat/:chatId/message`, async ({ params, request }) => {
    const body = await request.json() as any;
    const chatId = params.chatId;
    
    if (body.message) {
      return HttpResponse.json({
        task_id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chat_id: chatId
      });
    }
    
    return new HttpResponse(null, {
      status: 400,
      statusText: 'Message is required'
    });
  }),

  // SSE streaming endpoint (mock)
  http.get(`${BACKEND_URL}/chat/:chatId/stream`, ({ params, request }) => {
    const url = new URL(request.url);
    const taskId = url.searchParams.get('task_id');
    
    if (!taskId) {
      return new HttpResponse(null, {
        status: 400,
        statusText: 'Task ID required'
      });
    }
    
    // Create a mock SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const chunks = [
          'data: {"content": "Mock streaming response chunk 1", "message_id": "' + taskId + '"}\n\n',
          'data: {"content": " - this is a test response", "message_id": "' + taskId + '"}\n\n',
          'data: {"content": " with multiple chunks for testing.", "message_id": "' + taskId + '"}\n\n',
          'data: [DONE]\n\n'
        ];
        
        let index = 0;
        const interval = setInterval(() => {
          if (index < chunks.length) {
            controller.enqueue(encoder.encode(chunks[index]));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 100); // Send chunks every 100ms
      }
    });
    
    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  }),

  // Agent network endpoints
  http.get(`${BACKEND_URL}/agent_network_sse/:sessionId`, ({ params }) => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const events = [
          'data: {"event": "agent_spawned", "agent_id": "agent1", "type": "researcher"}\n\n',
          'data: {"event": "task_started", "task_id": "task1", "agent_id": "agent1"}\n\n',
          'data: {"event": "task_completed", "task_id": "task1", "result": "mock result"}\n\n'
        ];
        
        let index = 0;
        const interval = setInterval(() => {
          if (index < events.length) {
            controller.enqueue(encoder.encode(events[index]));
            index++;
          } else {
            clearInterval(interval);
            controller.close();
          }
        }, 200);
      }
    });
    
    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });
  }),

  http.get(`${BACKEND_URL}/agent_network_history`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    
    return HttpResponse.json({
      events: Array(Math.min(limit, 10)).fill(null).map((_, i) => ({
        id: `event_${i}`,
        event: 'mock_event',
        timestamp: new Date().toISOString(),
        data: { mock: true }
      })),
      limit,
      total: 10
    });
  }),

  // Error endpoints for testing
  http.get(`${BACKEND_URL}/api/nonexistent`, () => {
    return new HttpResponse(null, {
      status: 404,
      statusText: 'Not Found'
    });
  }),

  // Fallback handler for unmatched requests
  http.all(`${BACKEND_URL}/*`, ({ request }) => {
    console.warn(`Unhandled request: ${request.method} ${request.url}`);
    return new HttpResponse(null, {
      status: 501,
      statusText: 'Mock handler not implemented'
    });
  })
];

// Conditional handlers that use real backend when available
export const createConditionalHandlers = (useRealBackend: boolean = false) => {
  if (useRealBackend) {
    // Return minimal handlers that don't interfere with real backend
    return [
      // Only handle clearly non-existent endpoints for error testing
      http.get(`${BACKEND_URL}/api/definitely-not-found`, () => {
        return new HttpResponse(null, {
          status: 404,
          statusText: 'Not Found'
        });
      })
    ];
  }
  
  return backendHandlers;
};

// Test utilities for backend integration
export const backendTestUtils = {
  mockUser,
  mockAuthToken,
  
  /**
   * Check if real backend is available
   */
  async isBackendAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_URL}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  },
  
  /**
   * Setup MSW with appropriate handlers
   */
  async setupMSW(): Promise<{ useRealBackend: boolean }> {
    const useRealBackend = await this.isBackendAvailable();
    
    if (useRealBackend) {
      console.log('🌐 Using real backend for integration tests');
    } else {
      console.log('🎭 Using mock backend handlers for tests');
    }
    
    return { useRealBackend };
  }
};
