/**
 * MSW Request Handlers for Backend API Mocking
 * 
 * Provides comprehensive mock responses for all backend endpoints
 */

import { http, HttpResponse } from 'msw'

// Mock API base URL
const API_BASE = 'http://localhost:8000'

export const handlers = [
  // Health Check Endpoint
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: 'test',
      version: '1.0.0'
    })
  }),

  // Health Check Error Simulation
  http.get(`${API_BASE}/health-error`, () => {
    return new HttpResponse(null, { status: 500 })
  }),

  // Chat Message Creation
  http.post(`${API_BASE}/chat/:chatId/message`, async ({ request, params }) => {
    const { chatId } = params
    const body = await request.json() as { message: string; user_id?: string }
    
    if (!body.message || body.message.trim() === '') {
      return HttpResponse.json(
        { detail: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      task_id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chat_id: chatId
    })
  }),

  // Chat Message Creation - Rate Limit Error
  http.post(`${API_BASE}/chat/rate-limited/message`, () => {
    return HttpResponse.json(
      { detail: 'Rate limit exceeded', error_type: 'rate_limit' },
      { status: 429 }
    )
  }),

  // SSE Stream Endpoint - Success
  http.get(`${API_BASE}/chat/:chatId/stream`, ({ request, params }) => {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('task_id')
    
    if (!taskId) {
      return new HttpResponse(null, { status: 400 })
    }

    // Create a mock SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send initial message chunks
        const messages = [
          'Hello! I received your message.',
          ' Let me process that for you.',
          ' Here is the complete response.',
        ]
        
        let index = 0
        const sendChunk = () => {
          if (index < messages.length) {
            const data = JSON.stringify({
              content: messages[index],
              message_id: 'test_msg_123',
              timestamp: new Date().toISOString()
            })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            index++
            setTimeout(sendChunk, 100) // 100ms delay between chunks
          } else {
            // Send completion signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
          }
        }
        
        setTimeout(sendChunk, 50) // Initial delay
      }
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  }),

  // SSE Stream Endpoint - Error
  http.get(`${API_BASE}/chat/error/stream`, () => {
    return HttpResponse.json(
      { detail: 'Stream initialization failed' },
      { status: 500 }
    )
  }),

  // SSE Stream Endpoint - Network Error Simulation
  http.get(`${API_BASE}/chat/network-error/stream`, () => {
    // Simulate network error by rejecting after delay
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network error')), 100)
    })
  }),

  // Agent Network SSE Stream
  http.get(`${API_BASE}/agent_network_sse/:sessionId`, ({ params }) => {
    const { sessionId } = params
    
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        const events = [
          { type: 'agent_created', data: { agent_id: 'agent_1', type: 'researcher' } },
          { type: 'task_assigned', data: { agent_id: 'agent_1', task: 'Search for information' } },
          { type: 'task_completed', data: { agent_id: 'agent_1', result: 'Found relevant data' } },
        ]
        
        let index = 0
        const sendEvent = () => {
          if (index < events.length) {
            const event = events[index]
            const data = JSON.stringify(event.data)
            controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`))
            index++
            setTimeout(sendEvent, 200)
          } else {
            controller.close()
          }
        }
        
        setTimeout(sendEvent, 100)
      }
    })

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  }),

  // Agent Network History
  http.get(`${API_BASE}/agent_network_history`, ({ request }) => {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    
    const events = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      id: `event_${i + 1}`,
      type: 'agent_action',
      timestamp: new Date(Date.now() - i * 60000).toISOString(),
      data: {
        agent_id: `agent_${i + 1}`,
        action: 'processing',
        status: 'completed'
      }
    }))
    
    return HttpResponse.json({
      events,
      limit,
      total: events.length
    })
  }),

  // Authentication Login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock_jwt_token_12345',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: 'user_123',
          email: 'test@example.com',
          name: 'Test User'
        }
      })
    }
    
    return HttpResponse.json(
      { detail: 'Invalid credentials' },
      { status: 401 }
    )
  }),

  // Authentication Token Refresh
  http.post(`${API_BASE}/auth/refresh`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer mock_jwt_token')) {
      return HttpResponse.json({
        access_token: 'mock_refreshed_jwt_token_67890',
        token_type: 'bearer',
        expires_in: 3600
      })
    }
    
    return HttpResponse.json(
      { detail: 'Invalid token' },
      { status: 401 }
    )
  }),

  // Protected Route Example
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer mock_jwt_token')) {
      return HttpResponse.json(
        { detail: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return HttpResponse.json({
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['user']
    })
  }),

  // Network Timeout Simulation
  http.get(`${API_BASE}/timeout`, () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    })
  }),

  // Server Error Simulation
  http.get(`${API_BASE}/server-error`, () => {
    return new HttpResponse(null, { status: 500 })
  }),

  // Catch-all for unhandled requests
  http.all(`${API_BASE}/*`, () => {
    return HttpResponse.json(
      { detail: 'Endpoint not found' },
      { status: 404 }
    )
  }),
]