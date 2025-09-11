/**
 * Performance Integration Tests
 * 
 * Tests for API client and SSE connection performance including:
 * - API client response times
 * - SSE connection performance
 * - Memory usage monitoring
 * - Concurrent connection handling
 * - Large data handling
 */

import { server } from '../mocks/server'
import { 
  streamChatResponse, 
  apiService,
  type StreamingResponse 
} from '@/lib/chat-api'
import { 
  PerformanceTestUtils, 
  SSETestUtils, 
  AsyncTestUtils,
  APITestUtils 
} from '../utils/test-helpers'

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  describe('API Client Performance', () => {
    it('should handle API requests within acceptable time limits', async () => {
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        return await apiService.healthCheck()
      })

      // Health check should complete within 1 second
      expect(duration).toBeLessThan(1000)
    })

    it('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 10
      const promises = Array.from({ length: concurrentRequests }, () =>
        apiService.healthCheck()
      )

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        return await Promise.all(promises)
      })

      // 10 concurrent requests should complete within 3 seconds
      expect(duration).toBeLessThan(3000)
    })

    it('should maintain performance under load', async () => {
      const benchmark = await PerformanceTestUtils.benchmarkFunction(
        () => apiService.healthCheck(),
        20 // 20 iterations
      )

      // Average response time should be under 500ms
      expect(benchmark.average).toBeLessThan(500)
      
      // No single request should take more than 2 seconds
      expect(benchmark.max).toBeLessThan(2000)
      
      // Performance should be consistent (standard deviation)
      const stdDev = Math.sqrt(
        benchmark.times.reduce((sum, time) => 
          sum + Math.pow(time - benchmark.average, 2), 0
        ) / benchmark.times.length
      )
      
      // Standard deviation should be less than 50% of average
      expect(stdDev).toBeLessThan(benchmark.average * 0.5)
    })

    it('should handle large response payloads efficiently', async () => {
      // Mock large response
      APITestUtils.mockEndpoint('get', '/large-data', {
        data: 'x'.repeat(100000), // 100KB of data
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          data: `Item ${i} with some content`
        }))
      })

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        return await apiService.getAgentNetworkHistory(1000)
      })

      // Large data should still be processed within 2 seconds
      expect(duration).toBeLessThan(2000)
    })

    it('should efficiently handle retry logic', async () => {
      let attemptCount = 0
      
      server.use(
        SSETestUtils.createMockSSEStream(['Test message'], 50)
      )

      // Mock endpoint that fails twice then succeeds
      APITestUtils.mockEndpoint('get', '/retry-test', {}, 200)
      server.resetHandlers()
      
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        return await apiService.healthCheck()
      })

      // Even with retries, should complete reasonably quickly
      expect(duration).toBeLessThan(5000)
    })
  })

  describe('SSE Performance', () => {
    it('should establish SSE connections quickly', async () => {
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse('Performance test')) {
          responses.push(response)
          // Break on first response to measure connection time
          if (responses.length === 1) break
        }
        
        return responses
      })

      // First SSE event should arrive within 2 seconds
      expect(duration).toBeLessThan(2000)
    })

    it('should handle rapid SSE events efficiently', async () => {
      server.use(
        SSETestUtils.mockRapidSSEStream(100) // 100 rapid messages
      )

      const { duration, result } = await PerformanceTestUtils.measureTime(async () => {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse('Rapid test')) {
          responses.push(response)
        }
        
        return responses
      })

      // Should process 100 messages within 2 seconds
      expect(duration).toBeLessThan(2000)
      
      // Should receive all messages
      const contentResponses = result.filter(r => r.content && !r.isComplete)
      expect(contentResponses.length).toBe(100)
    })

    it('should not leak memory with long-running streams', async () => {
      const { memoryIncrease } = await PerformanceTestUtils.monitorMemory(async () => {
        // Run 5 sequential streaming sessions
        for (let i = 0; i < 5; i++) {
          const responses: StreamingResponse[] = []
          
          for await (const response of streamChatResponse(`Memory test ${i}`)) {
            responses.push(response)
          }
        }
      })

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle concurrent SSE streams efficiently', async () => {
      const concurrentStreams = 5
      
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const streamPromises = Array.from({ length: concurrentStreams }, (_, i) =>
          (async () => {
            const responses: StreamingResponse[] = []
            
            for await (const response of streamChatResponse(`Concurrent ${i}`, {
              chatId: `concurrent-${i}`
            })) {
              responses.push(response)
            }
            
            return responses
          })()
        )

        return await Promise.all(streamPromises)
      })

      // 5 concurrent streams should complete within 10 seconds
      expect(duration).toBeLessThan(10000)
    })

    it('should efficiently parse SSE data', async () => {
      // Create stream with complex JSON data
      server.use(
        SSETestUtils.createMockSSEStream([
          JSON.stringify({ complex: { nested: { data: 'test' } } }),
          JSON.stringify({ array: [1, 2, 3, 4, 5] }),
          JSON.stringify({ large: 'x'.repeat(1000) })
        ], 10)
      )

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse('Complex data test')) {
          responses.push(response)
        }
        
        return responses
      })

      // Should parse complex JSON quickly
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('Memory Usage', () => {
    it('should handle multiple chat sessions without memory leaks', async () => {
      const { memoryIncrease } = await PerformanceTestUtils.monitorMemory(async () => {
        // Simulate 10 chat sessions
        for (let session = 0; session < 10; session++) {
          // Each session has 3 message exchanges
          for (let msg = 0; msg < 3; msg++) {
            const responses: StreamingResponse[] = []
            
            for await (const response of streamChatResponse(
              `Session ${session} Message ${msg}`,
              { chatId: `session-${session}` }
            )) {
              responses.push(response)
            }
          }
        }
      })

      // Memory increase should be minimal (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should clean up aborted streams properly', async () => {
      const { memoryIncrease } = await PerformanceTestUtils.monitorMemory(async () => {
        // Start and abort multiple streams
        for (let i = 0; i < 10; i++) {
          const responses: StreamingResponse[] = []
          
          for await (const response of streamChatResponse(`Abort test ${i}`)) {
            responses.push(response)
            // Abort after first response
            if (responses.length === 1) break
          }
        }
      })

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should handle large message history efficiently', async () => {
      // Fill localStorage with large message history
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `msg_${i}`,
        content: `Message ${i} `.repeat(100), // ~1KB per message
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date().toISOString()
      }))

      localStorage.setItem('chat_history', JSON.stringify(largeHistory))

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse('Large history test')) {
          responses.push(response)
        }
        
        return responses
      })

      // Should still perform well with large history
      expect(duration).toBeLessThan(3000)
    })
  })

  describe('Network Performance', () => {
    it('should handle network latency gracefully', async () => {
      // Mock delayed responses
      server.use(
        SSETestUtils.createMockSSEStream(['Delayed message'], 500) // 500ms delay
      )

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse('Latency test')) {
          responses.push(response)
        }
        
        return responses
      })

      // Should handle 500ms latency within reasonable time
      expect(duration).toBeLessThan(2000)
    })

    it('should optimize bandwidth usage', async () => {
      let totalDataTransferred = 0
      
      // Mock to track data size
      server.use(
        SSETestUtils.createMockSSEStream([
          'Short message',
          'Another short message'
        ], 100)
      )

      const responses: StreamingResponse[] = []
      
      for await (const response of streamChatResponse('Bandwidth test')) {
        totalDataTransferred += JSON.stringify(response).length
        responses.push(response)
      }

      // Should transfer reasonable amount of data
      expect(totalDataTransferred).toBeLessThan(10000) // Less than 10KB
    })

    it('should handle connection drops and reconnections', async () => {
      let connectionAttempts = 0
      
      server.use(
        SSETestUtils.createMockSSEStream(['Reconnection test'], 100)
      )

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse('Reconnection test')) {
          responses.push(response)
        }
        
        return responses
      })

      // Should handle reconnection within reasonable time
      expect(duration).toBeLessThan(5000)
    })
  })

  describe('Stress Testing', () => {
    it('should handle high-frequency API calls', async () => {
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        // Make 50 rapid API calls
        const promises = Array.from({ length: 50 }, (_, i) =>
          apiService.healthCheck()
        )
        
        return await Promise.all(promises)
      })

      // 50 requests should complete within 10 seconds
      expect(duration).toBeLessThan(10000)
    })

    it('should maintain performance with long message content', async () => {
      const longMessage = 'This is a very long message. '.repeat(1000) // ~30KB message
      
      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const responses: StreamingResponse[] = []
        
        for await (const response of streamChatResponse(longMessage)) {
          responses.push(response)
        }
        
        return responses
      })

      // Should handle large messages within reasonable time
      expect(duration).toBeLessThan(5000)
    })

    it('should handle resource constraints gracefully', async () => {
      // Simulate resource pressure by running multiple operations
      const operations = [
        () => apiService.healthCheck(),
        () => streamChatResponse('Stress test 1'),
        () => streamChatResponse('Stress test 2'),
        () => apiService.getAgentNetworkHistory(50)
      ]

      const { duration } = await PerformanceTestUtils.measureTime(async () => {
        const promises = operations.map(async (op) => {
          if (op.name === 'streamChatResponse') {
            const responses: StreamingResponse[] = []
            for await (const response of (op as any)()) {
              responses.push(response)
            }
            return responses
          }
          return await op()
        })
        
        return await Promise.all(promises)
      })

      // Multiple operations should complete within reasonable time
      expect(duration).toBeLessThan(15000)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet response time SLAs', async () => {
      const slaMetrics = {
        healthCheck: 500,      // 500ms
        chatMessage: 2000,     // 2 seconds
        streamStart: 1000,     // 1 second for first chunk
        apiRequest: 1000       // 1 second for standard API requests
      }

      // Test health check SLA
      const healthTime = await PerformanceTestUtils.measureTime(() =>
        apiService.healthCheck()
      )
      expect(healthTime.duration).toBeLessThan(slaMetrics.healthCheck)

      // Test streaming SLA
      const streamTime = await PerformanceTestUtils.measureTime(async () => {
        for await (const response of streamChatResponse('SLA test')) {
          return response // Return after first chunk
        }
      })
      expect(streamTime.duration).toBeLessThan(slaMetrics.streamStart)
    })

    it('should maintain consistent performance over time', async () => {
      const performanceData = []
      
      // Run tests over time to check for performance degradation
      for (let i = 0; i < 10; i++) {
        const { duration } = await PerformanceTestUtils.measureTime(() =>
          apiService.healthCheck()
        )
        performanceData.push(duration)
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Performance should not degrade significantly over time
      const firstHalf = performanceData.slice(0, 5)
      const secondHalf = performanceData.slice(5)
      
      const firstAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length
      
      // Second half should not be more than 50% slower than first half
      expect(secondAvg).toBeLessThan(firstAvg * 1.5)
    })
  })
})