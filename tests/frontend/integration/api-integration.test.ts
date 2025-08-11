import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { VanaAPIClient } from '@/lib/api'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { TestWrapper } from '../../utils/test-wrapper'

// Mock server for API responses
const server = setupServer(
  // Session creation
  http.post('/api/sessions', async ({ request }) => {
    const formData = await request.formData()
    const prompt = formData.get('prompt') as string
    
    return HttpResponse.json({
      id: 'session-123',
      title: prompt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: prompt,
          timestamp: Date.now()
        }
      ],
      origin: 'homepage'
    })
  }),

  // SSE endpoint
  http.get('/api/chat/stream', ({ request }) => {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session')
    
    // Return SSE stream
    return new HttpResponse(
      new ReadableStream({
        start(controller) {
          // Simulate message tokens
          const tokens = ['Hello', ' ', 'there', '!', ' ', 'How', ' ', 'can', ' ', 'I', ' ', 'help', ' ', 'you', '?']
          let index = 0
          
          const sendToken = () => {
            if (index < tokens.length) {
              controller.enqueue(`event: message_token\ndata: ${JSON.stringify({
                token: tokens[index],
                messageId: 'msg-2'
              })}\n\n`)
              index++
              setTimeout(sendToken, 50)
            } else {
              // Send completion
              controller.enqueue(`event: complete\ndata: ${JSON.stringify({
                success: true,
                messageId: 'msg-2'
              })}\n\n`)
              controller.close()
            }
          }
          
          // Start with agent message
          controller.enqueue(`event: message_start\ndata: ${JSON.stringify({
            id: 'msg-2',
            role: 'assistant',
            agentName: 'Vana Agent'
          })}\n\n`)
          
          setTimeout(sendToken, 100)
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    )
  }),

  // Canvas save
  http.post('/api/canvas/save', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      success: true,
      versionId: 'version-123'
    })
  }),

  // File upload
  http.post('/api/upload', async ({ request }) => {
    const formData = await request.formData()
    const files = formData.getAll('files')
    
    return HttpResponse.json({
      files: files.map((file: any, index) => ({
        id: `file-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: `https://storage.example.com/${file.name}`
      }))
    })
  }),

  // Authentication
  http.post('/api/auth/token', async ({ request }) => {
    const { idToken } = await request.json()
    
    if (idToken === 'valid-token') {
      return HttpResponse.json({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      })
    }
    
    return HttpResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  })
)

describe('API Integration Tests', () => {
  let apiClient: VanaAPIClient

  beforeEach(() => {
    server.listen({ onUnhandledRequest: 'error' })
    apiClient = new VanaAPIClient(process.env.VITE_API_URL || 'http://localhost:3000')
  })

  afterEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
  })

  afterAll(() => {
    server.close()
  })

  describe('Session Management', () => {
    it('should create session with prompt', async () => {
      const session = await apiClient.createSession('Test prompt')
      
      expect(session).toMatchObject({
        id: 'session-123',
        title: 'Test prompt',
        messages: [
          {
            role: 'user',
            content: 'Test prompt'
          }
        ]
      })
    })

    it('should create session with files', async () => {
      const file = new File(['content'], 'test.md', { type: 'text/markdown' })
      const session = await apiClient.createSession('Review this file', [file])
      
      expect(session).toBeDefined()
      expect(session.messages[0].files).toBeDefined()
    })

    it('should handle session creation errors', async () => {
      server.use(
        http.post('/api/sessions', () => {
          return HttpResponse.json(
            { error: 'Session creation failed' },
            { status: 500 }
          )
        })
      )

      await expect(apiClient.createSession('Test')).rejects.toThrow('Session creation failed')
    })
  })

  describe('SSE Streaming', () => {
    it('should establish SSE connection and receive tokens', async () => {
      const tokens: string[] = []
      const eventSource = apiClient.streamChat('session-123')
      
      const messageTokenHandler = (event: MessageEvent) => {
        const data = JSON.parse(event.data)
        tokens.push(data.token)
      }
      
      eventSource.addEventListener('message_token', messageTokenHandler)
      
      // Wait for stream to complete
      await new Promise<void>((resolve) => {
        eventSource.addEventListener('complete', () => {
          eventSource.close()
          resolve()
        })
      })
      
      expect(tokens).toEqual(['Hello', ' ', 'there', '!', ' ', 'How', ' ', 'can', ' ', 'I', ' ', 'help', ' ', 'you', '?'])
    })

    it('should handle SSE connection errors', async () => {
      server.use(
        http.get('/api/chat/stream', () => {
          return HttpResponse.json(
            { error: 'Stream unavailable' },
            { status: 503 }
          )
        })
      )

      const eventSource = apiClient.streamChat('session-123')
      
      const errorHandler = vi.fn()
      eventSource.addEventListener('error', errorHandler)
      
      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalled()
      })
      
      eventSource.close()
    })

    it('should handle canvas events from stream', async () => {
      server.use(
        http.get('/api/chat/stream', () => {
          return new HttpResponse(
            new ReadableStream({
              start(controller) {
                controller.enqueue(`event: canvas_open\ndata: ${JSON.stringify({
                  canvasType: 'markdown',
                  content: '# Hello World',
                  title: 'Test Document'
                })}\n\n`)
                
                controller.enqueue(`event: complete\ndata: ${JSON.stringify({
                  success: true
                })}\n\n`)
                
                controller.close()
              }
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream'
              }
            }
          )
        })
      )

      const eventSource = apiClient.streamChat('session-123')
      const canvasEvents: any[] = []
      
      eventSource.addEventListener('canvas_open', (event) => {
        canvasEvents.push(JSON.parse(event.data))
      })
      
      await new Promise<void>((resolve) => {
        eventSource.addEventListener('complete', () => {
          eventSource.close()
          resolve()
        })
      })
      
      expect(canvasEvents).toHaveLength(1)
      expect(canvasEvents[0]).toMatchObject({
        canvasType: 'markdown',
        content: '# Hello World',
        title: 'Test Document'
      })
    })
  })

  describe('Canvas Operations', () => {
    beforeEach(() => {
      apiClient.setToken('access-token-123')
    })

    it('should save canvas content', async () => {
      const result = await apiClient.saveCanvas({
        sessionId: 'session-123',
        type: 'markdown',
        content: '# Test Content'
      })
      
      expect(result).toMatchObject({
        success: true,
        versionId: 'version-123'
      })
    })

    it('should handle canvas save errors', async () => {
      server.use(
        http.post('/api/canvas/save', () => {
          return HttpResponse.json(
            { error: 'Save failed' },
            { status: 500 }
          )
        })
      )

      await expect(apiClient.saveCanvas({
        sessionId: 'session-123',
        type: 'markdown',
        content: '# Test'
      })).rejects.toThrow('Save failed')
    })

    it('should load canvas versions', async () => {
      server.use(
        http.get('/api/canvas/versions', () => {
          return HttpResponse.json([
            {
              id: 'v1',
              content: '# Version 1',
              timestamp: Date.now() - 3600000,
              author: 'user'
            },
            {
              id: 'v2',
              content: '# Version 2',
              timestamp: Date.now(),
              author: 'agent'
            }
          ])
        })
      )

      const versions = await apiClient.loadCanvasVersions('session-123')
      
      expect(versions).toHaveLength(2)
      expect(versions[0].content).toBe('# Version 1')
      expect(versions[1].content).toBe('# Version 2')
    })
  })

  describe('File Operations', () => {
    it('should upload files', async () => {
      const files = [
        new File(['markdown content'], 'test.md', { type: 'text/markdown' }),
        new File(['pdf content'], 'test.pdf', { type: 'application/pdf' })
      ]
      
      const result = await apiClient.uploadFiles(files)
      
      expect(result.files).toHaveLength(2)
      expect(result.files[0]).toMatchObject({
        name: 'test.md',
        type: 'text/markdown'
      })
      expect(result.files[1]).toMatchObject({
        name: 'test.pdf',
        type: 'application/pdf'
      })
    })

    it('should handle file upload size limits', async () => {
      server.use(
        http.post('/api/upload', () => {
          return HttpResponse.json(
            { error: 'File too large' },
            { status: 413 }
          )
        })
      )

      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt')
      
      await expect(apiClient.uploadFiles([largeFile])).rejects.toThrow('File too large')
    })

    it('should validate file types', async () => {
      server.use(
        http.post('/api/upload', () => {
          return HttpResponse.json(
            { error: 'File type not supported' },
            { status: 400 }
          )
        })
      )

      const invalidFile = new File(['content'], 'test.exe', { type: 'application/exe' })
      
      await expect(apiClient.uploadFiles([invalidFile])).rejects.toThrow('File type not supported')
    })
  })

  describe('Authentication', () => {
    it('should authenticate with valid token', async () => {
      const result = await apiClient.authenticate('valid-token')
      
      expect(result).toMatchObject({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: {
          email: 'test@example.com',
          name: 'Test User'
        }
      })
    })

    it('should handle authentication errors', async () => {
      await expect(apiClient.authenticate('invalid-token')).rejects.toThrow('Invalid token')
    })

    it('should refresh expired tokens', async () => {
      server.use(
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json({
            accessToken: 'new-access-token-123',
            refreshToken: 'new-refresh-token-123'
          })
        })
      )

      const result = await apiClient.refreshToken('refresh-token-123')
      
      expect(result.accessToken).toBe('new-access-token-123')
    })

    it('should handle token refresh failures', async () => {
      server.use(
        http.post('/api/auth/refresh', () => {
          return HttpResponse.json(
            { error: 'Refresh token expired' },
            { status: 401 }
          )
        })
      )

      await expect(apiClient.refreshToken('expired-refresh-token')).rejects.toThrow('Refresh token expired')
    })
  })

  describe('Error Recovery', () => {
    it('should retry failed requests', async () => {
      let attempts = 0
      server.use(
        http.post('/api/sessions', () => {
          attempts++
          if (attempts < 3) {
            return HttpResponse.json(
              { error: 'Temporary error' },
              { status: 500 }
            )
          }
          
          return HttpResponse.json({
            id: 'session-retry-success',
            title: 'Retry successful'
          })
        })
      )

      const result = await apiClient.createSessionWithRetry('Test retry')
      
      expect(result.id).toBe('session-retry-success')
      expect(attempts).toBe(3)
    })

    it('should implement exponential backoff', async () => {
      const delays: number[] = []
      let attempts = 0
      
      server.use(
        http.post('/api/sessions', () => {
          attempts++
          delays.push(Date.now())
          
          return HttpResponse.json(
            { error: 'Always fails' },
            { status: 500 }
          )
        })
      )

      await expect(apiClient.createSessionWithRetry('Test backoff')).rejects.toThrow()
      
      expect(attempts).toBe(4) // Initial + 3 retries
      
      // Check exponential backoff (approximate timing)
      if (delays.length >= 3) {
        const delay1 = delays[1] - delays[0]
        const delay2 = delays[2] - delays[1]
        expect(delay2).toBeGreaterThan(delay1)
      }
    })

    it('should handle network errors gracefully', async () => {
      server.use(
        http.post('/api/sessions', () => {
          throw new Error('Network error')
        })
      )

      await expect(apiClient.createSession('Network test')).rejects.toThrow('Network error')
    })
  })

  describe('Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      server.use(
        http.post('/api/sessions', () => {
          return HttpResponse.json(
            { error: 'Rate limit exceeded', retryAfter: 60 },
            { 
              status: 429,
              headers: {
                'Retry-After': '60'
              }
            }
          )
        })
      )

      const error = await apiClient.createSession('Rate limit test').catch(e => e)
      
      expect(error.message).toContain('Rate limit exceeded')
      expect(error.retryAfter).toBe(60)
    })

    it('should respect rate limit headers', async () => {
      let requestCount = 0
      
      server.use(
        http.post('/api/sessions', ({ request }) => {
          requestCount++
          
          if (requestCount > 5) {
            return HttpResponse.json(
              { error: 'Rate limit exceeded' },
              { status: 429 }
            )
          }
          
          return HttpResponse.json({
            id: `session-${requestCount}`,
            title: 'Success'
          })
        })
      )

      // Make requests within limit
      for (let i = 0; i < 5; i++) {
        const result = await apiClient.createSession(`Request ${i + 1}`)
        expect(result.id).toBe(`session-${i + 1}`)
      }
      
      // Should fail on 6th request
      await expect(apiClient.createSession('Over limit')).rejects.toThrow('Rate limit exceeded')
    })
  })
})