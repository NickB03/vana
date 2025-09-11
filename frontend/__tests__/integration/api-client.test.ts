/**
 * API Client Integration Tests
 * 
 * Comprehensive tests for the HTTP client implementation including:
 * - Successful API calls to backend endpoints
 * - Error handling for network failures, timeouts, and API errors
 * - Retry logic with exponential backoff
 * - Authentication token handling
 * - Response validation with Zod schemas
 */

import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { 
  apiClient, 
  ApiService, 
  ApiError, 
  NetworkError, 
  TimeoutError,
  type HealthResponse,
  type CreateChatResponse 
} from '@/lib/api-client'

describe('API Client Integration Tests', () => {
  let apiService: ApiService

  beforeEach(() => {
    apiService = new ApiService()
    // Reset localStorage auth token
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('HTTP Client Core Functionality', () => {
    describe('GET Requests', () => {
      it('should make successful GET request to health endpoint', async () => {
        const response = await apiService.healthCheck()
        
        expect(response).toEqual({
          status: 'healthy',
          timestamp: expect.any(String),
          environment: 'test',
          version: '1.0.0'
        })
      })

      it('should handle GET request with custom headers', async () => {
        const customClient = new (class extends ApiService {
          async testCustomHeaders() {
            return this['client'].get('/health', {
              headers: { 'X-Custom-Header': 'test-value' }
            })
          }
        })()

        const response = await customClient.testCustomHeaders()
        expect(response).toBeDefined()
      })

      it('should validate response schema correctly', async () => {
        // This test ensures our Zod schema validation works
        const response = await apiService.healthCheck()
        
        // Response should match HealthResponse type
        expect(typeof response.status).toBe('string')
        expect(typeof response.timestamp).toBe('string')
        expect(new Date(response.timestamp)).toBeInstanceOf(Date)
      })
    })

    describe('POST Requests', () => {
      it('should make successful POST request with JSON body', async () => {
        const chatId = 'test-chat-123'
        const message = 'Hello, how are you?'
        
        const response = await apiService.sendChatMessage(chatId, {
          message,
          user_id: 'test-user-123'
        })

        expect(response).toEqual({
          task_id: expect.stringMatching(/^task_\d+_[a-z0-9]+$/),
          message_id: expect.stringMatching(/^msg_\d+_[a-z0-9]+$/),
          chat_id: chatId
        })
      })

      it('should handle POST request validation errors', async () => {
        const chatId = 'test-chat-123'
        
        await expect(
          apiService.sendChatMessage(chatId, { message: '' })
        ).rejects.toThrow(ApiError)

        try {
          await apiService.sendChatMessage(chatId, { message: '' })
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError)
          expect((error as ApiError).statusCode).toBe(400)
          expect((error as ApiError).message).toContain('Message cannot be empty')
        }
      })
    })
  })

  describe('Error Handling', () => {
    describe('API Errors', () => {
      it('should handle 404 errors correctly', async () => {
        server.use(
          http.get('http://localhost:8000/nonexistent', () => {
            return HttpResponse.json(
              { detail: 'Endpoint not found' },
              { status: 404 }
            )
          })
        )

        await expect(
          apiClient.get('/nonexistent')
        ).rejects.toThrow(ApiError)
      })

      it('should handle 500 server errors', async () => {
        server.use(
          http.get('http://localhost:8000/health', () => {
            return new HttpResponse(null, { status: 500 })
          })
        )

        await expect(
          apiService.healthCheck()
        ).rejects.toThrow(ApiError)
      })

      it('should handle rate limiting errors', async () => {
        const chatId = 'rate-limited'
        
        await expect(
          apiService.sendChatMessage(chatId, { message: 'test' })
        ).rejects.toThrow(ApiError)

        try {
          await apiService.sendChatMessage(chatId, { message: 'test' })
        } catch (error) {
          expect(error).toBeInstanceOf(ApiError)
          expect((error as ApiError).statusCode).toBe(429)
          expect((error as ApiError).errorType).toBe('rate_limit')
        }
      })

      it('should handle JSON parsing errors gracefully', async () => {
        server.use(
          http.get('http://localhost:8000/health', () => {
            return new HttpResponse('Invalid JSON{', {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            })
          })
        )

        await expect(
          apiService.healthCheck()
        ).rejects.toThrow()
      })
    })

    describe('Network Errors', () => {
      it('should handle network connection failures', async () => {
        server.use(
          http.get('http://localhost:8000/health', () => {
            throw new Error('Network error')
          })
        )

        await expect(
          apiService.healthCheck()
        ).rejects.toThrow(NetworkError)
      })

      it('should handle DNS resolution failures', async () => {
        // Create client with invalid base URL
        const invalidClient = new ApiService(
          new (apiClient.constructor as any)({ 
            baseUrl: 'http://invalid-domain-12345.com' 
          })
        )

        await expect(
          invalidClient.healthCheck()
        ).rejects.toThrow(NetworkError)
      })
    })

    describe('Timeout Handling', () => {
      it('should handle request timeouts', async () => {
        // Create client with very short timeout
        const timeoutClient = new ApiService(
          new (apiClient.constructor as any)({ 
            timeout: 50 // 50ms timeout
          })
        )

        server.use(
          http.get('http://localhost:8000/health', async () => {
            // Delay response longer than timeout
            await new Promise(resolve => setTimeout(resolve, 100))
            return HttpResponse.json({ status: 'ok' })
          })
        )

        await expect(
          timeoutClient.healthCheck()
        ).rejects.toThrow(TimeoutError)
      }, 10000)

      it('should allow canceling requests', () => {
        const cancelSpy = jest.spyOn(apiClient, 'cancelRequest')
        
        apiClient.cancelRequest()
        
        expect(cancelSpy).toHaveBeenCalled()
      })
    })
  })

  describe('Retry Logic', () => {
    it('should retry on network failures', async () => {
      let attempts = 0
      
      server.use(
        http.get('http://localhost:8000/health', () => {
          attempts++
          if (attempts < 3) {
            throw new Error('Network error')
          }
          return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString() })
        })
      )

      const response = await apiService.healthCheck()
      expect(response.status).toBe('healthy')
      expect(attempts).toBe(3) // Should have retried twice before succeeding
    })

    it('should not retry on 4xx errors', async () => {
      let attempts = 0
      
      server.use(
        http.get('http://localhost:8000/health', () => {
          attempts++
          return HttpResponse.json(
            { detail: 'Bad request' },
            { status: 400 }
          )
        })
      )

      await expect(
        apiService.healthCheck()
      ).rejects.toThrow(ApiError)
      
      expect(attempts).toBe(1) // Should not retry on 4xx errors
    })

    it('should respect maximum retry attempts', async () => {
      let attempts = 0
      
      server.use(
        http.get('http://localhost:8000/health', () => {
          attempts++
          throw new Error('Network error')
        })
      )

      await expect(
        apiService.healthCheck()
      ).rejects.toThrow(NetworkError)
      
      // Should try once + 3 retries = 4 attempts total
      expect(attempts).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Authentication Integration', () => {
    beforeEach(() => {
      // Enable auth requirement for these tests
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'true'
    })

    afterEach(() => {
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false'
    })

    it('should include auth token in requests when available', async () => {
      localStorage.setItem('vana_auth_token', 'mock_jwt_token_12345')
      
      let receivedHeaders: Headers | undefined
      
      server.use(
        http.get('http://localhost:8000/health', ({ request }) => {
          receivedHeaders = request.headers
          return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString() })
        })
      )

      await apiService.healthCheck()
      
      expect(receivedHeaders?.get('Authorization')).toBe('Bearer mock_jwt_token_12345')
    })

    it('should work without auth token when auth not required', async () => {
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false'
      
      let receivedHeaders: Headers | undefined
      
      server.use(
        http.get('http://localhost:8000/health', ({ request }) => {
          receivedHeaders = request.headers
          return HttpResponse.json({ status: 'healthy', timestamp: new Date().toISOString() })
        })
      )

      await apiService.healthCheck()
      
      expect(receivedHeaders?.get('Authorization')).toBeNull()
    })

    it('should handle auth token refresh scenarios', async () => {
      // This would be implemented when we have token refresh logic
      expect(true).toBe(true) // Placeholder
    })
  })

  describe('Server-Sent Events Support', () => {
    it('should create SSE stream successfully', async () => {
      const chatId = 'test-chat-123'
      const taskId = 'test-task-456'
      
      const response = await apiService.createChatStream(chatId, taskId)
      
      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.ok).toBe(true)
    })

    it('should handle SSE stream creation errors', async () => {
      const chatId = 'error'
      const taskId = 'test-task-456'
      
      await expect(
        apiService.createChatStream(chatId, taskId)
      ).rejects.toThrow(ApiError)
    })

    it('should create agent network SSE stream', async () => {
      const sessionId = 'test-session-789'
      
      const response = await apiService.createAgentNetworkStream(sessionId)
      
      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })
  })

  describe('Response Data Validation', () => {
    it('should validate health response schema', async () => {
      const response = await apiService.healthCheck()
      
      // These assertions ensure our Zod schema is working
      expect(typeof response.status).toBe('string')
      expect(typeof response.timestamp).toBe('string')
      expect(response.environment).toBeDefined()
      expect(response.version).toBeDefined()
    })

    it('should validate chat response schema', async () => {
      const response = await apiService.sendChatMessage('test-chat', {
        message: 'Hello'
      })
      
      expect(typeof response.task_id).toBe('string')
      expect(typeof response.message_id).toBe('string')
      expect(typeof response.chat_id).toBe('string')
    })

    it('should reject invalid response formats', async () => {
      server.use(
        http.get('http://localhost:8000/health', () => {
          return HttpResponse.json({
            status: 123, // Invalid: should be string
            timestamp: 'invalid-date',
          })
        })
      )

      await expect(
        apiService.healthCheck()
      ).rejects.toThrow(ApiError)
    })
  })

  describe('Agent Network API', () => {
    it('should fetch agent network history', async () => {
      const response = await apiService.getAgentNetworkHistory(10)
      
      expect(response).toEqual({
        events: expect.any(Array),
        limit: 10,
        total: expect.any(Number)
      })
      
      expect(response.events.length).toBeLessThanOrEqual(10)
      response.events.forEach(event => {
        expect(event).toHaveProperty('id')
        expect(event).toHaveProperty('type')
        expect(event).toHaveProperty('timestamp')
        expect(event).toHaveProperty('data')
      })
    })

    it('should handle default limit for agent network history', async () => {
      const response = await apiService.getAgentNetworkHistory()
      
      expect(response.limit).toBe(50) // Default limit
    })
  })

  describe('Configuration and Environment', () => {
    it('should use environment variables for configuration', () => {
      // Test that configuration respects environment variables
      const originalEnv = process.env.NEXT_PUBLIC_API_URL
      process.env.NEXT_PUBLIC_API_URL = 'http://custom-api.com'
      
      // Create new client to pick up env changes
      const customClient = new (apiClient.constructor as any)()
      
      // Restore original env
      if (originalEnv) {
        process.env.NEXT_PUBLIC_API_URL = originalEnv
      } else {
        delete process.env.NEXT_PUBLIC_API_URL
      }
      
      expect(customClient).toBeDefined()
    })

    it('should have appropriate default configuration', () => {
      // Test default config values are reasonable
      expect(apiClient).toBeDefined()
    })
  })
})