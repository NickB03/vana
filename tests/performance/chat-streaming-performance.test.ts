/**
 * Performance Tests for Chat Streaming and State Management
 * Tests streaming performance, memory usage, and concurrent operations
 */

import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  streamingLatency: number;
  stateUpdateTime: number;
  gcPressure: number;
}

class PerformanceTestHelper {
  constructor(private page: Page) {}

  async measureRenderTime(operation: () => Promise<void>): Promise<number> {
    const startTime = Date.now();

    // Start performance marking
    await this.page.evaluate(() => {
      performance.mark('operation-start');
    });

    await operation();

    await this.page.evaluate(() => {
      performance.mark('operation-end');
      performance.measure('operation-duration', 'operation-start', 'operation-end');
    });

    const duration = await this.page.evaluate(() => {
      const measure = performance.getEntriesByName('operation-duration')[0];
      return measure.duration;
    });

    return duration;
  }

  async measureMemoryUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      // @ts-ignore - performance.memory is available in Chrome
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
  }

  async measureStreamingLatency(messageId: string): Promise<number> {
    const startTime = Date.now();

    // Wait for first token to appear
    await this.page.waitForFunction(
      (msgId) => {
        const messageElement = document.querySelector(`[data-message-id="${msgId}"] [data-testid="message-content"]`);
        return messageElement && messageElement.textContent && messageElement.textContent.length > 0;
      },
      messageId
    );

    return Date.now() - startTime;
  }

  async simulateHighLoad(operations: number = 10): Promise<void> {
    const promises = [];

    for (let i = 0; i < operations; i++) {
      promises.push(
        this.page.evaluate(() => {
          // Simulate CPU-intensive work
          const start = Date.now();
          while (Date.now() - start < 10) {
            Math.random() * Math.random();
          }
        })
      );
    }

    await Promise.all(promises);
  }

  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    return await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const memory = (performance as any).memory;

      return {
        renderTime: navigation.loadEventEnd - navigation.loadEventStart,
        memoryUsage: memory?.usedJSHeapSize || 0,
        streamingLatency: 0, // Will be measured separately
        stateUpdateTime: 0, // Will be measured separately
        gcPressure: memory ? (memory.totalJSHeapSize - memory.usedJSHeapSize) / memory.totalJSHeapSize : 0
      };
    });
  }

  async createLargeConversation(messageCount: number): Promise<void> {
    for (let i = 0; i < messageCount; i++) {
      await this.page.fill('[data-testid="chat-input"]', `Message ${i + 1}: This is a test message with some content`);
      await this.page.click('[data-testid="send-button"]');

      // Wait for response but don't wait for full completion to speed up test
      await this.page.waitForSelector(`[data-testid="assistant-message"]:nth-child(${(i + 1) * 2})`);

      // Small delay to prevent overwhelming the system
      if (i % 5 === 0) {
        await this.page.waitForTimeout(100);
      }
    }
  }
}

test.describe('Chat Streaming Performance', () => {
  let helper: PerformanceTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new PerformanceTestHelper(page);
    await page.goto('/chat');
  });

  test('Streaming latency under normal conditions', async ({ page }) => {
    // Send a message that should generate a reasonable response
    await page.fill('[data-testid="chat-input"]', 'Write a short explanation of React components');
    await page.click('[data-testid="send-button"]');

    // Get the assistant message ID
    await page.waitForSelector('[data-testid="assistant-message"]:last-child');
    const assistantMessage = page.locator('[data-testid="assistant-message"]:last-child');
    const messageId = await assistantMessage.getAttribute('data-message-id') || '';

    // Click regenerate and measure streaming latency
    const latency = await helper.measureStreamingLatency(messageId);

    expect(latency).toBeLessThan(2000); // First token should appear within 2 seconds
  });

  test('Streaming performance with large messages', async ({ page }) => {
    // Request a long response
    await page.fill('[data-testid="chat-input"]', 'Write a detailed 1000-word essay about the history of web development');
    await page.click('[data-testid="send-button"]');

    const startTime = Date.now();

    // Wait for streaming to start
    await page.waitForSelector('[data-testid="streaming-indicator"]');

    const streamStartTime = Date.now() - startTime;
    expect(streamStartTime).toBeLessThan(3000); // Should start streaming within 3 seconds

    // Wait for streaming to complete
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden', timeout: 60000 });

    const totalStreamTime = Date.now() - startTime;

    // Check that streaming maintained reasonable speed (assume ~50 words/second minimum)
    const assistantMessage = page.locator('[data-testid="assistant-message"]:last-child [data-testid="message-content"]');
    const content = await assistantMessage.textContent() || '';
    const wordCount = content.split(/\s+/).length;

    const wordsPerSecond = wordCount / (totalStreamTime / 1000);
    expect(wordsPerSecond).toBeGreaterThan(20); // At least 20 words per second
  });

  test('Concurrent regeneration performance', async ({ page }) => {
    // Create a conversation with multiple messages
    await helper.createLargeConversation(5);

    // Get all assistant message IDs
    const assistantMessages = page.locator('[data-testid="assistant-message"]');
    const messageIds: string[] = [];

    const count = await assistantMessages.count();
    for (let i = 0; i < count; i++) {
      const messageId = await assistantMessages.nth(i).getAttribute('data-message-id');
      if (messageId) messageIds.push(messageId);
    }

    // Try to regenerate multiple messages rapidly
    const startTime = Date.now();

    for (const messageId of messageIds.slice(0, 3)) { // Test with first 3 messages
      await page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
      await page.waitForTimeout(100); // Small delay between clicks
    }

    // Wait for all streaming to complete
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden', timeout: 30000 });

    const totalTime = Date.now() - startTime;

    // Should handle concurrent operations efficiently
    expect(totalTime).toBeLessThan(20000); // 20 seconds max for 3 regenerations
  });

  test('Memory usage with large conversations', async ({ page }) => {
    const initialMemory = await helper.measureMemoryUsage();

    // Create a large conversation
    await helper.createLargeConversation(50);

    const afterCreationMemory = await helper.measureMemoryUsage();
    const memoryIncrease = afterCreationMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB for 50 messages)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

    // Test regeneration performance in large conversation
    const lastAssistantMessage = page.locator('[data-testid="assistant-message"]:last-child');
    const messageId = await lastAssistantMessage.getAttribute('data-message-id') || '';

    const regenerateTime = await helper.measureRenderTime(async () => {
      await page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
      await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });
    });

    // Regeneration should still be fast even with large conversation
    expect(regenerateTime).toBeLessThan(10000); // 10 seconds max
  });

  test('State update performance during streaming', async ({ page }) => {
    await page.fill('[data-testid="chat-input"]', 'Explain the concept of virtual DOM in detail');
    await page.click('[data-testid="send-button"]');

    const assistantMessage = page.locator('[data-testid="assistant-message"]:last-child');
    const messageId = await assistantMessage.getAttribute('data-message-id') || '';

    // Start streaming
    await page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);

    // Measure how quickly the UI updates during streaming
    let updateTimes: number[] = [];

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();

      // Wait for content to change
      await page.waitForFunction(
        (msgId, previousLength) => {
          const element = document.querySelector(`[data-message-id="${msgId}"] [data-testid="message-content"]`);
          return element && element.textContent && element.textContent.length > previousLength;
        },
        messageId,
        i * 10
      );

      const updateTime = Date.now() - startTime;
      updateTimes.push(updateTime);

      // Small delay between checks
      await page.waitForTimeout(100);
    }

    // Average update time should be reasonable
    const avgUpdateTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length;
    expect(avgUpdateTime).toBeLessThan(200); // 200ms average update time
  });

  test('Render performance with 100+ messages', async ({ page }) => {
    // Create a very large conversation
    await helper.createLargeConversation(100);

    // Measure scroll performance
    const scrollTime = await helper.measureRenderTime(async () => {
      await page.keyboard.press('Home'); // Scroll to top
      await page.waitForTimeout(100);
      await page.keyboard.press('End');  // Scroll to bottom
    });

    expect(scrollTime).toBeLessThan(1000); // Should scroll quickly

    // Measure action button performance
    const actionTime = await helper.measureRenderTime(async () => {
      const lastMessage = page.locator('[data-testid="assistant-message"]:last-child');
      const messageId = await lastMessage.getAttribute('data-message-id') || '';

      await page.click(`[data-message-id="${messageId}"] [data-testid="upvote-button"]`);
    });

    expect(actionTime).toBeLessThan(500); // Action should be instant

    // Test filter/search performance if available
    const searchTime = await helper.measureRenderTime(async () => {
      const searchBox = page.locator('[data-testid="search-input"]');
      if (await searchBox.isVisible()) {
        await searchBox.fill('React');
        await page.waitForTimeout(100);
      }
    });

    if (searchTime > 0) {
      expect(searchTime).toBeLessThan(2000); // Search should be fast
    }
  });

  test('Network request optimization', async ({ page, context }) => {
    // Monitor network requests
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });

    // Perform various actions
    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child');
    const messageId = await page.locator('[data-testid="assistant-message"]:last-child').getAttribute('data-message-id') || '';

    // Regenerate
    await page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

    // Give feedback
    await page.click(`[data-message-id="${messageId}"] [data-testid="upvote-button"]`);

    // Analyze requests
    const chatRequests = requests.filter(r => r.url.includes('/chat/'));

    // Should not have excessive requests
    expect(chatRequests.length).toBeLessThan(10);

    // No duplicate requests within short timeframe
    const duplicates = chatRequests.filter((req, index) => {
      const previous = chatRequests[index - 1];
      return previous &&
             req.url === previous.url &&
             req.method === previous.method &&
             (req.timestamp - previous.timestamp) < 1000; // Within 1 second
    });

    expect(duplicates.length).toBe(0);
  });

  test('CPU usage during intensive operations', async ({ page }) => {
    // This test measures CPU impact during chat operations

    // Create baseline CPU measurement
    const baselineStart = Date.now();
    await helper.simulateHighLoad(5);
    const baselineTime = Date.now() - baselineStart;

    // Perform chat operations
    await page.fill('[data-testid="chat-input"]', 'Generate a complex code example with explanations');
    await page.click('[data-testid="send-button"]');

    // Simulate high CPU load during streaming
    const streamingStart = Date.now();
    await page.waitForSelector('[data-testid="streaming-indicator"]');

    // Simulate background CPU work
    await helper.simulateHighLoad(10);

    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });
    const streamingTime = Date.now() - streamingStart;

    // CPU impact shouldn't be significantly worse during streaming
    // (This is a rough heuristic test)
    const performanceRatio = streamingTime / baselineTime;
    expect(performanceRatio).toBeLessThan(5); // No more than 5x slower
  });

  test('WebSocket/SSE connection performance', async ({ page }) => {
    // Monitor SSE connections
    const sseConnections: any[] = [];

    page.on('response', response => {
      if (response.headers()['content-type']?.includes('text/event-stream')) {
        sseConnections.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      }
    });

    // Perform actions that use SSE
    await page.fill('[data-testid="chat-input"]', 'Test SSE performance');
    await page.click('[data-testid="send-button"]');

    // Wait for streaming
    await page.waitForSelector('[data-testid="streaming-indicator"]');
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

    // Check SSE connection efficiency
    expect(sseConnections.length).toBeLessThan(5); // Should not create excessive connections

    // All SSE connections should be successful
    const failedConnections = sseConnections.filter(conn => conn.status >= 400);
    expect(failedConnections.length).toBe(0);
  });

  test('Garbage collection pressure', async ({ page }) => {
    const initialMetrics = await helper.collectPerformanceMetrics();

    // Perform memory-intensive operations
    for (let i = 0; i < 20; i++) {
      await page.fill('[data-testid="chat-input"]', `Memory test ${i}`);
      await page.click('[data-testid="send-button"]');

      // Wait for response
      await page.waitForSelector(`[data-testid="assistant-message"]:nth-child(${(i + 1) * 2})`);

      // Regenerate some messages to create memory pressure
      if (i % 5 === 0 && i > 0) {
        const messageId = await page.locator('[data-testid="assistant-message"]:last-child').getAttribute('data-message-id') || '';
        await page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
        await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });
      }
    }

    const finalMetrics = await helper.collectPerformanceMetrics();

    // Memory usage should not grow excessively
    const memoryGrowth = finalMetrics.memoryUsage - initialMetrics.memoryUsage;
    expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth

    // GC pressure should remain reasonable
    expect(finalMetrics.gcPressure).toBeLessThan(0.5); // Less than 50% GC pressure
  });

  test('Real-time performance monitoring', async ({ page }) => {
    // Set up performance observer
    await page.addInitScript(() => {
      (window as any).performanceEntries = [];

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' || entry.entryType === 'mark') {
            (window as any).performanceEntries.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
              entryType: entry.entryType
            });
          }
        }
      });

      observer.observe({ entryTypes: ['measure', 'mark'] });
    });

    // Perform various chat actions with performance marking
    await page.evaluate(() => {
      performance.mark('chat-session-start');
    });

    // Send message
    await page.fill('[data-testid="chat-input"]', 'Performance monitoring test');
    await page.click('[data-testid="send-button"]');

    await page.waitForSelector('[data-testid="assistant-message"]:last-child');
    const messageId = await page.locator('[data-testid="assistant-message"]:last-child').getAttribute('data-message-id') || '';

    // Mark regeneration
    await page.evaluate(() => {
      performance.mark('regeneration-start');
    });

    await page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
    await page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

    await page.evaluate(() => {
      performance.mark('regeneration-end');
      performance.measure('regeneration-duration', 'regeneration-start', 'regeneration-end');
    });

    // Collect performance entries
    const entries = await page.evaluate(() => (window as any).performanceEntries);

    // Verify performance measurements were recorded
    expect(entries.length).toBeGreaterThan(0);

    const regenerationMeasure = entries.find((entry: any) => entry.name === 'regeneration-duration');
    expect(regenerationMeasure).toBeTruthy();
    expect(regenerationMeasure.duration).toBeLessThan(15000); // 15 seconds max
  });
});