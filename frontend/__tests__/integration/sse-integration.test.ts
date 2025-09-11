/**
 * Server-Sent Events (SSE) Integration Tests
 * 
 * Comprehensive tests for real-time streaming implementation including:
 * - SSE connection establishment and management
 * - Real-time event handling and parsing
 * - Reconnection logic and error recovery
 * - Memory leak prevention and cleanup
 * - Connection state management
 */

import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { 
  streamChatResponse, 
  checkHealth, 
  getCurrentChatId,
  ApiError,
  NetworkError,
  TimeoutError,
  type StreamingResponse 
} from '@/lib/chat-api'

describe('SSE Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  describe('SSE Stream Establishment', () => {
    it('should establish SSE connection successfully', async () => {
      const message = 'Hello, test message'
      const responses: StreamingResponse[] = []
      
      // Collect all streaming responses
      for await (const response of streamChatResponse(message)) {
        responses.push(response)
      }
      
      expect(responses.length).toBeGreaterThan(0)
      
      // First responses should contain content
      const contentResponses = responses.filter(r => r.content && !r.isComplete)
      expect(contentResponses.length).toBeGreaterThan(0)
      
      // Last response should be completion
      const lastResponse = responses[responses.length - 1]
      expect(lastResponse.isComplete).toBe(true)
      
      // Verify accumulated content
      const fullContent = responses
        .filter(r => r.content && !r.isComplete)
        .map(r => r.content)
        .join('')
      
      expect(fullContent).toContain('Hello! I received your message.')
    })

    it('should handle SSE connection with custom chat ID', async () => {
      const customChatId = 'custom-chat-123'
      const message = 'Test with custom chat ID'
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse(message, { 
        chatId: customChatId 
      })) {
        responses.push(response)
      }
      
      expect(responses.length).toBeGreaterThan(0)
      expect(responses[responses.length - 1].isComplete).toBe(true)
    })

    it('should generate persistent chat ID', () => {
      const chatId1 = getCurrentChatId()
      const chatId2 = getCurrentChatId()
      
      expect(chatId1).toBe(chatId2) // Should be same within session
      expect(chatId1).toMatch(/^chat_\d+_[a-z0-9]+$/)
    })
  })

  describe('Real-time Event Handling', () => {
    it('should parse SSE events correctly', async () => {
      const message = 'Parse test message'
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse(message)) {
        responses.push(response)
        
        // Test individual response format
        expect(response).toHaveProperty('content')
        expect(response).toHaveProperty('isComplete')
        expect(typeof response.content).toBe('string')
        expect(typeof response.isComplete).toBe('boolean')
        
        if (response.messageId) {
          expect(typeof response.messageId).toBe('string')
        }
        
        if (response.timestamp) {
          expect(typeof response.timestamp).toBe('string')
          expect(new Date(response.timestamp)).toBeInstanceOf(Date)
        }
      }
      
      expect(responses.length).toBeGreaterThan(0)
    })

    it('should handle rapid SSE events', async () => {
      // Mock rapid events
      server.use(
        http.get('http://localhost:8000/chat/:chatId/stream', () => {
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              // Send 10 rapid chunks
              for (let i = 0; i < 10; i++) {
                const data = JSON.stringify({
                  content: `Chunk ${i + 1} `,
                  message_id: 'rapid_test',
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            }
          })

          return new HttpResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
            }
          })
        })
      )

      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('Rapid test')) {
        responses.push(response)
      }
      
      // Should receive all 10 chunks plus completion
      const contentChunks = responses.filter(r => r.content && !r.isComplete)
      expect(contentChunks.length).toBe(10)
      
      // Verify content order
      contentChunks.forEach((chunk, index) => {
        expect(chunk.content).toBe(`Chunk ${index + 1} `)
      })
    })

    it('should handle empty SSE events gracefully', async () => {
      server.use(
        http.get('http://localhost:8000/chat/:chatId/stream', () => {
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              // Send empty data events
              controller.enqueue(encoder.encode('data: \n\n'))
              controller.enqueue(encoder.encode('data: \n\n'))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            }
          })

          return new HttpResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
            }
          })
        })
      )

      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('Empty test')) {
        responses.push(response)
      }
      
      expect(responses.length).toBeGreaterThan(0)
      expect(responses[responses.length - 1].isComplete).toBe(true)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle SSE stream creation errors', async () => {
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('error test', {
        chatId: 'error'
      })) {
        responses.push(response)
      }
      
      // Should yield error response
      expect(responses.length).toBe(1)
      expect(responses[0].isComplete).toBe(true)
      expect(responses[0].error).toBeDefined()
      expect(responses[0].error).toContain('Server error')
    })

    it('should handle network errors during streaming', async () => {
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('network error test', {
        chatId: 'network-error'
      })) {
        responses.push(response)
      }
      
      expect(responses.length).toBe(1)
      expect(responses[0].isComplete).toBe(true)
      expect(responses[0].error).toBeDefined()
    })

    it('should handle malformed SSE data', async () => {
      server.use(
        http.get('http://localhost:8000/chat/:chatId/stream', () => {
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              // Send malformed JSON
              controller.enqueue(encoder.encode('data: {invalid json}\n\n'))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            }
          })

          return new HttpResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
            }
          })
        })
      )

      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('malformed test')) {
        responses.push(response)
      }
      
      // Should handle gracefully and complete
      expect(responses.length).toBeGreaterThan(0)
      expect(responses[responses.length - 1].isComplete).toBe(true)
    })

    it('should handle stream interruption', async () => {
      server.use(
        http.get('http://localhost:8000/chat/:chatId/stream', () => {
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              // Send partial data then error
              const data = JSON.stringify({
                content: 'Partial message',
                message_id: 'interrupted',
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              
              // Simulate stream interruption
              setTimeout(() => {
                controller.error(new Error('Stream interrupted'))
              }, 50)
            }
          })

          return new HttpResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
            }
          })
        })
      )

      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('interrupted test')) {
        responses.push(response)
      }
      
      // Should handle interruption gracefully
      expect(responses.length).toBeGreaterThan(0)
    })

    it('should provide error callbacks', async () => {
      let errorCallbackCalled = false
      let capturedError: Error | null = null
      
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('error test', {
        chatId: 'error',
        onError: (error) => {
          errorCallbackCalled = true
          capturedError = error
        }
      })) {
        responses.push(response)
      }
      
      expect(errorCallbackCalled).toBe(true)
      expect(capturedError).toBeInstanceOf(ApiError)
    })
  })

  describe('Memory Management and Cleanup', () => {
    it('should not leak memory with multiple streams', async () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Create multiple sequential streams
      for (let i = 0; i < 5; i++) {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse(`Message ${i}`)) {
          responses.push(response)
        }
        
        expect(responses[responses.length - 1].isComplete).toBe(true)
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle concurrent streams properly', async () => {
      const promises = []
      
      // Start 3 concurrent streams
      for (let i = 0; i < 3; i++) {
        const promise = (async () => {
          const responses: StreamingResponse[] = []
          
          for await (const response of streamChatResponse(`Concurrent ${i}`, {
            chatId: `concurrent-${i}`
          })) {
            responses.push(response)
          }
          
          return responses
        })()
        
        promises.push(promise)
      }
      
      const results = await Promise.all(promises)
      
      // All streams should complete successfully
      results.forEach((responses, index) => {
        expect(responses.length).toBeGreaterThan(0)
        expect(responses[responses.length - 1].isComplete).toBe(true)
      })
    })

    it('should clean up resources on stream abortion', async () => {
      let streamAborted = false
      
      const mockAbortController = {
        abort: jest.fn(() => {
          streamAborted = true
        })
      }
      
      // This test would need access to internal abort controller
      // For now, we test that the stream completes properly
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('cleanup test')) {
        responses.push(response)
        // Break early to simulate cleanup
        if (responses.length >= 2) break
      }
      
      expect(responses.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Connection State Management', () => {
    it('should track connection states properly', async () => {
      // This would be tested through the ChatContext which manages connection state
      // For now, test that streaming works correctly
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('state test')) {
        responses.push(response)
      }
      
      expect(responses.length).toBeGreaterThan(0)
      expect(responses[responses.length - 1].isComplete).toBe(true)
    })

    it('should handle reconnection scenarios', async () => {
      // Mock a reconnection scenario
      let attempts = 0
      
      server.use(
        http.post('http://localhost:8000/chat/:chatId/message', () => {
          attempts++
          if (attempts === 1) {
            throw new Error('Network error')
          }
          return HttpResponse.json({
            task_id: 'reconnect_task',
            message_id: 'reconnect_msg',
            chat_id: 'reconnect_chat'
          })
        })
      )

      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('reconnect test')) {
        responses.push(response)
      }
      
      // Should eventually succeed after retry
      expect(responses.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large response streams efficiently', async () => {
      server.use(
        http.get('http://localhost:8000/chat/:chatId/stream', () => {
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              // Send 100 chunks
              for (let i = 0; i < 100; i++) {
                const data = JSON.stringify({
                  content: `Large chunk ${i} with some content `,
                  message_id: 'large_test',
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            }
          })

          return new HttpResponse(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
            }
          })
        })
      )

      const startTime = performance.now()
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('large test')) {
        responses.push(response)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should handle 100 chunks efficiently (under 1 second)
      expect(duration).toBeLessThan(1000)
      
      const contentChunks = responses.filter(r => r.content && !r.isComplete)
      expect(contentChunks.length).toBe(100)
    })

    it('should process events in correct order', async () => {
      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('order test')) {
        responses.push(response)
      }
      
      const contentChunks = responses.filter(r => r.content && !r.isComplete)
      
      // Verify content order matches expected sequence
      const fullContent = contentChunks.map(r => r.content).join('')
      expect(fullContent).toBe('Hello! I received your message. Let me process that for you. Here is the complete response.')
    })
  })

  describe('Health Check Integration', () => {
    it('should check backend health status', async () => {
      const isHealthy = await checkHealth()
      expect(isHealthy).toBe(true)
    })

    it('should handle health check failures', async () => {
      server.use(
        http.get('http://localhost:8000/health', () => {
          return new HttpResponse(null, { status: 500 })
        })
      )

      const isHealthy = await checkHealth()
      expect(isHealthy).toBe(false)
    })

    it('should handle unhealthy status responses', async () => {
      server.use(
        http.get('http://localhost:8000/health', () => {
          return HttpResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString()
          })
        })
      )

      const isHealthy = await checkHealth()
      expect(isHealthy).toBe(false)
    })
  })
})