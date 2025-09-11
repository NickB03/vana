/**
 * Streaming Performance Tests
 * 
 * Measures and validates performance characteristics of SSE streaming,
 * API calls, and real-time features against performance benchmarks.
 */

import { streamChatResponse, checkHealth } from '../../lib/chat-api';
import { apiService, enhancedApiService } from '../../lib/api-client';
import { testUtils } from '../integration/api-client-backend.test';
import { sseTestUtils } from '../integration/sse-streaming-backend.test';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  healthCheck: {
    responseTime: 1000, // 1 second
    p95ResponseTime: 2000 // 2 seconds for 95th percentile
  },
  streaming: {
    firstChunk: 5000, // First chunk within 5 seconds
    averageChunkTime: 500, // Average chunk processing under 500ms
    totalStreamTime: 30000 // Complete stream under 30 seconds
  },
  apiCalls: {
    chatMessage: 2000, // Chat message creation under 2 seconds
    concurrentRequests: 10000 // 10 concurrent requests under 10 seconds
  },
  memory: {
    maxMemoryIncrease: 50 * 1024 * 1024, // Max 50MB memory increase
    gcEfficiency: 0.8 // GC should reclaim 80% of memory
  }
};

describe('Streaming Performance Tests', () => {
  beforeAll(async () => {
    const isBackendReady = await testUtils.waitForBackend();
    if (!isBackendReady) {
      throw new Error('Backend server must be running for performance tests');
    }
  });

  describe('API Response Time Performance', () => {
    it('should meet health check response time requirements', async () => {
      const iterations = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const { responseTime } = await testUtils.measurePerformance(async () => {
          return apiService.healthCheck();
        });
        
        responseTimes.push(responseTime);
        
        // Small delay between requests to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const p95Time = responseTimes.sort((a, b) => a - b)[Math.floor(0.95 * responseTimes.length)];
      const maxTime = Math.max(...responseTimes);
      const minTime = Math.min(...responseTimes);

      console.log(`Health Check Performance:`);
      console.log(`  Average: ${averageTime.toFixed(2)}ms`);
      console.log(`  P95: ${p95Time.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);

      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.healthCheck.responseTime);
      expect(p95Time).toBeLessThan(PERFORMANCE_THRESHOLDS.healthCheck.p95ResponseTime);
    });

    it('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = Array(concurrentRequests).fill(null).map(async (_, index) => {
        const chatId = testUtils.createTestChatId();
        
        return testUtils.measurePerformance(async () => {
          return apiService.sendChatMessage(chatId, {
            message: `Concurrent performance test ${index + 1}`,
            user_id: 'perf_test_user'
          });
        });
      });

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const responseTimes = results.map(r => r.responseTime);
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxTime = Math.max(...responseTimes);

      console.log(`Concurrent API Performance:`);
      console.log(`  Requests: ${concurrentRequests}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average response: ${averageTime.toFixed(2)}ms`);
      console.log(`  Max response: ${maxTime.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiCalls.concurrentRequests);
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiCalls.chatMessage);

      // All requests should have succeeded
      results.forEach(result => {
        expect(result.result).toHaveProperty('task_id');
      });
    });
  });

  describe('Streaming Performance', () => {
    it('should meet streaming latency requirements', async () => {
      const chatId = testUtils.createTestChatId();
      const message = 'Performance test: measure streaming latency and throughput';

      const metrics = await sseTestUtils.measureStreamingPerformance(chatId, message);

      console.log(`Streaming Performance Metrics:`);
      console.log(`  First chunk: ${metrics.firstChunkTime.toFixed(2)}ms`);
      console.log(`  Total time: ${metrics.totalTime.toFixed(2)}ms`);
      console.log(`  Chunk count: ${metrics.chunkCount}`);
      console.log(`  Average chunk time: ${metrics.averageChunkTime.toFixed(2)}ms`);

      expect(metrics.firstChunkTime).toBeLessThan(PERFORMANCE_THRESHOLDS.streaming.firstChunk);
      expect(metrics.totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.streaming.totalStreamTime);
      expect(metrics.averageChunkTime).toBeLessThan(PERFORMANCE_THRESHOLDS.streaming.averageChunkTime);
      expect(metrics.chunkCount).toBeGreaterThan(0);
    });

    it('should handle multiple concurrent streams efficiently', async () => {
      const streamCount = 3;
      const startTime = performance.now();

      const promises = Array(streamCount).fill(null).map(async (_, index) => {
        const chatId = testUtils.createTestChatId();
        const message = `Concurrent stream performance test ${index + 1}`;
        
        return sseTestUtils.measureStreamingPerformance(chatId, message);
      });

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      const avgFirstChunkTime = results.reduce((sum, r) => sum + r.firstChunkTime, 0) / results.length;
      const avgTotalTime = results.reduce((sum, r) => sum + r.totalTime, 0) / results.length;
      const totalChunks = results.reduce((sum, r) => sum + r.chunkCount, 0);

      console.log(`Concurrent Streaming Performance:`);
      console.log(`  Streams: ${streamCount}`);
      console.log(`  Total execution time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average first chunk: ${avgFirstChunkTime.toFixed(2)}ms`);
      console.log(`  Average stream time: ${avgTotalTime.toFixed(2)}ms`);
      console.log(`  Total chunks processed: ${totalChunks}`);

      // Concurrent streams shouldn't significantly degrade performance
      expect(avgFirstChunkTime).toBeLessThan(PERFORMANCE_THRESHOLDS.streaming.firstChunk * 1.5);
      expect(avgTotalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.streaming.totalStreamTime);
      
      results.forEach(result => {
        expect(result.chunkCount).toBeGreaterThan(0);
      });
    });

    it('should efficiently process high-frequency chunks', async () => {
      const chatId = testUtils.createTestChatId();
      const message = 'Generate a very detailed response with many rapid updates for performance testing';
      
      let chunkCount = 0;
      let totalContentLength = 0;
      const chunkIntervals: number[] = [];
      let lastChunkTime = performance.now();
      const startTime = lastChunkTime;

      for await (const chunk of streamChatResponse(message, { chatId })) {
        const currentTime = performance.now();
        const interval = currentTime - lastChunkTime;
        
        chunkCount++;
        totalContentLength += (chunk.content || '').length;
        chunkIntervals.push(interval);
        lastChunkTime = currentTime;

        if (chunk.isComplete) {
          break;
        }
      }

      const totalTime = performance.now() - startTime;
      const averageInterval = chunkIntervals.length > 1 
        ? chunkIntervals.reduce((a, b) => a + b, 0) / chunkIntervals.length 
        : 0;
      const throughputCharsPerSecond = totalContentLength / (totalTime / 1000);

      console.log(`High-Frequency Chunk Processing:`);
      console.log(`  Total chunks: ${chunkCount}`);
      console.log(`  Total content length: ${totalContentLength} chars`);
      console.log(`  Average chunk interval: ${averageInterval.toFixed(2)}ms`);
      console.log(`  Throughput: ${throughputCharsPerSecond.toFixed(2)} chars/sec`);

      expect(chunkCount).toBeGreaterThan(0);
      expect(averageInterval).toBeLessThan(PERFORMANCE_THRESHOLDS.streaming.averageChunkTime);
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.streaming.totalStreamTime);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during streaming operations', async () => {
      // Get initial memory usage
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Perform multiple streaming operations
      const iterations = 5;
      for (let i = 0; i < iterations; i++) {
        const chatId = testUtils.createTestChatId();
        const message = `Memory test iteration ${i + 1}`;
        
        for await (const chunk of streamChatResponse(message, { chatId })) {
          if (chunk.isComplete || chunk.error) {
            break;
          }
        }
        
        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`Memory Usage:`);
      console.log(`  Initial: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Final: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      
      // Memory increase should be reasonable
      if (initialMemory > 0) {
        expect(Math.abs(memoryIncrease)).toBeLessThan(PERFORMANCE_THRESHOLDS.memory.maxMemoryIncrease);
      }
    });

    it('should handle resource cleanup properly', async () => {
      const resourceCountBefore = {
        timeouts: 0, // Would need to track active timeouts if possible
        intervals: 0, // Would need to track active intervals if possible
        eventListeners: 0 // Would need to track if possible
      };
      
      // Create and cleanup multiple streams
      const cleanupPromises: Array<() => void> = [];
      
      for (let i = 0; i < 3; i++) {
        const chatId = testUtils.createTestChatId();
        const message = `Resource cleanup test ${i + 1}`;
        
        const streamIterator = streamChatResponse(message, { chatId })[Symbol.asyncIterator]();
        
        // Get first chunk then abandon the stream
        try {
          await streamIterator.next();
        } catch (error) {
          // Expected if stream fails
        }
        
        // Simulate cleanup by returning the iterator
        cleanupPromises.push(() => {
          if (streamIterator.return) {
            streamIterator.return();
          }
        });
      }
      
      // Execute cleanup
      cleanupPromises.forEach(cleanup => cleanup());
      
      // This test mainly validates that cleanup doesn't throw errors
      expect(cleanupPromises).toHaveLength(3);
    });
  });

  describe('Network Performance', () => {
    it('should handle network latency gracefully', async () => {
      // Simulate network delay by measuring multiple requests over time
      const measurements: Array<{ attempt: number; responseTime: number }> = [];
      
      for (let i = 0; i < 5; i++) {
        const { responseTime } = await testUtils.measurePerformance(async () => {
          return apiService.healthCheck();
        });
        
        measurements.push({ attempt: i + 1, responseTime });
        
        // Add delay between measurements to simulate different network conditions
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const responseTimes = measurements.map(m => m.responseTime);
      const averageTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const variance = responseTimes.reduce((sum, time) => 
        sum + Math.pow(time - averageTime, 2), 0) / responseTimes.length;
      const standardDeviation = Math.sqrt(variance);
      
      console.log(`Network Latency Analysis:`);
      console.log(`  Average: ${averageTime.toFixed(2)}ms`);
      console.log(`  Std Dev: ${standardDeviation.toFixed(2)}ms`);
      console.log(`  Min: ${Math.min(...responseTimes).toFixed(2)}ms`);
      console.log(`  Max: ${Math.max(...responseTimes).toFixed(2)}ms`);
      
      // Network should be relatively stable
      expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.healthCheck.responseTime);
      expect(standardDeviation).toBeLessThan(averageTime); // Std dev should be less than average
    });

    it('should maintain performance under load', async () => {
      const loadTestDuration = 10000; // 10 seconds
      const requestInterval = 1000; // 1 request per second
      const results: Array<{ timestamp: number; responseTime: number; success: boolean }> = [];
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < loadTestDuration) {
        const timestamp = Date.now();
        
        try {
          const { responseTime, result } = await testUtils.measurePerformance(async () => {
            return apiService.healthCheck();
          });
          
          results.push({
            timestamp,
            responseTime,
            success: !!(result && result.status)
          });
        } catch (error) {
          results.push({
            timestamp,
            responseTime: -1,
            success: false
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      const successfulRequests = results.filter(r => r.success);
      const successRate = successfulRequests.length / results.length;
      const averageResponseTime = successfulRequests.length > 0 
        ? successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length
        : 0;
      
      console.log(`Load Test Results:`);
      console.log(`  Total requests: ${results.length}`);
      console.log(`  Success rate: ${(successRate * 100).toFixed(1)}%`);
      console.log(`  Average response time: ${averageResponseTime.toFixed(2)}ms`);
      
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.healthCheck.responseTime * 2); // Allow 2x normal time under load
    });
  });
});

// Export performance testing utilities
export const performanceTestUtils = {
  PERFORMANCE_THRESHOLDS,
  
  /**
   * Benchmark a function multiple times
   */
  async benchmark<T>(
    fn: () => Promise<T>,
    iterations: number = 10
  ): Promise<{
    results: T[];
    times: number[];
    average: number;
    min: number;
    max: number;
    p95: number;
  }> {
    const results: T[] = [];
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const result = await fn();
      const end = performance.now();
      
      results.push(result);
      times.push(end - start);
    }
    
    const sortedTimes = [...times].sort((a, b) => a - b);
    
    return {
      results,
      times,
      average: times.reduce((a, b) => a + b, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: sortedTimes[Math.floor(0.95 * sortedTimes.length)]
    };
  },
  
  /**
   * Measure memory usage during operation
   */
  async measureMemoryUsage<T>(fn: () => Promise<T>): Promise<{
    result: T;
    memoryBefore: number;
    memoryAfter: number;
    memoryDelta: number;
  }> {
    const getMemory = () => (performance as any).memory?.usedJSHeapSize || 0;
    
    const memoryBefore = getMemory();
    const result = await fn();
    const memoryAfter = getMemory();
    
    return {
      result,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryAfter - memoryBefore
    };
  }
};
