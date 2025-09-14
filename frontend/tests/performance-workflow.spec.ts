import { test, expect } from '@playwright/test';

/**
 * Performance Testing for User Workflow
 * 
 * This test suite measures performance metrics throughout
 * the complete user workflow to ensure optimal UX.
 */

const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,        // Page should load within 3 seconds
  firstContentfulPaint: 1500,  // FCP within 1.5 seconds
  largestContentfulPaint: 2500, // LCP within 2.5 seconds
  cumulativeLayoutShift: 0.1,   // CLS should be less than 0.1
  firstInputDelay: 100,         // FID within 100ms
  streamingResponse: 5000,      // First response chunk within 5 seconds
  agentCardAppear: 2000,        // Agent card should appear within 2 seconds
  messageRender: 500            // Individual messages should render quickly
};

test.describe('Performance Workflow Tests', () => {
  let performanceMetrics: any = {};

  test.beforeEach(async ({ page }) => {
    // Start performance monitoring
    await page.goto('about:blank');
    
    // Enable performance metrics collection
    await page.addInitScript(() => {
      window.performanceMetrics = {
        navigationStart: performance.now(),
        marks: new Map(),
        measures: new Map()
      };
      
      // Mark navigation start
      performance.mark('navigation-start');
    });
  });

  test('Complete workflow performance metrics', async ({ page }) => {
    // Measure page load performance
    const navigationStartTime = Date.now();
    
    await page.goto('http://localhost:3000/chat');
    await page.waitForLoadState('domcontentloaded');
    
    const domContentLoadedTime = Date.now() - navigationStartTime;
    expect(domContentLoadedTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    
    // Wait for full page load
    await page.waitForLoadState('networkidle');
    const fullLoadTime = Date.now() - navigationStartTime;
    
    // Measure Web Vitals
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        
        // CLS measurement
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({type: 'layout-shift', buffered: true});
        
        // LCP measurement
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({type: 'largest-contentful-paint', buffered: true});
        
        // FCP measurement
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          }
        }).observe({type: 'paint', buffered: true});
        
        // Give measurements time to collect
        setTimeout(() => resolve(vitals), 1000);
      });
    });
    
    console.log('Web Vitals:', webVitals);
    console.log('Page Load Times:', { domContentLoadedTime, fullLoadTime });
    
    if (webVitals.fcp) {
      expect(webVitals.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
    }
    if (webVitals.lcp) {
      expect(webVitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
    }
    if (webVitals.cls !== undefined) {
      expect(webVitals.cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cumulativeLayoutShift);
    }
    
    // Test chat input responsiveness
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();
    
    const inputStartTime = Date.now();
    await chatInput.focus();
    const inputFocusTime = Date.now() - inputStartTime;
    
    expect(inputFocusTime).toBeLessThan(PERFORMANCE_THRESHOLDS.firstInputDelay);
    
    // Test message submission performance
    const messageSubmitStartTime = Date.now();
    await chatInput.fill('Performance test message');
    await chatInput.press('Enter');
    
    // Wait for user message to appear
    await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
    const messageRenderTime = Date.now() - messageSubmitStartTime;
    
    expect(messageRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageRender);
    
    // Test research plan loading performance
    const researchPlanStartTime = Date.now();
    await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
    const researchPlanTime = Date.now() - researchPlanStartTime;
    
    console.log('Research Plan Load Time:', researchPlanTime);
    
    // Test agent card appearance performance
    await page.locator('[data-testid="approve-button"]').click();
    
    const agentCardStartTime = Date.now();
    const agentCard = page.locator('[data-testid="agent-status-card"]');
    
    if (await agentCard.isVisible({ timeout: PERFORMANCE_THRESHOLDS.agentCardAppear })) {
      const agentCardTime = Date.now() - agentCardStartTime;
      expect(agentCardTime).toBeLessThan(PERFORMANCE_THRESHOLDS.agentCardAppear);
      console.log('Agent Card Appearance Time:', agentCardTime);
    }
    
    // Test streaming response performance
    const streamingStartTime = Date.now();
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ 
      timeout: PERFORMANCE_THRESHOLDS.streamingResponse 
    });
    const firstChunkTime = Date.now() - streamingStartTime;
    
    expect(firstChunkTime).toBeLessThan(PERFORMANCE_THRESHOLDS.streamingResponse);
    console.log('First Response Chunk Time:', firstChunkTime);
    
    performanceMetrics = {
      pageLoad: fullLoadTime,
      messageRender: messageRenderTime,
      researchPlan: researchPlanTime,
      firstChunk: firstChunkTime,
      webVitals
    };
  });

  test('Memory usage monitoring', async ({ page }) => {
    await page.goto('http://localhost:3000/chat');
    await page.waitForLoadState('networkidle');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    if (initialMemory) {
      console.log('Initial Memory Usage:', initialMemory);
    }
    
    // Simulate workflow and measure memory
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    for (let i = 1; i <= 3; i++) {
      await chatInput.fill(`Memory test message ${i}`);
      await chatInput.press('Enter');
      
      await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
      
      // Check memory after each message
      const currentMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize
        } : null;
      });
      
      if (currentMemory && initialMemory) {
        const memoryIncrease = currentMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        console.log(`Memory increase after message ${i}:`, memoryIncrease, 'bytes');
        
        // Memory shouldn't increase dramatically with each message
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      }
    }
  });

  test('Network performance optimization', async ({ page }) => {
    const networkRequests: any[] = [];
    
    // Monitor network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        startTime: Date.now()
      });
    });
    
    page.on('response', response => {
      const request = networkRequests.find(req => req.url === response.url());
      if (request) {
        request.endTime = Date.now();
        request.duration = request.endTime - request.startTime;
        request.status = response.status();
        request.size = response.headers()['content-length'] || 0;
      }
    });
    
    await page.goto('http://localhost:3000/chat');
    await page.waitForLoadState('networkidle');
    
    // Analyze initial load requests
    const initialRequests = [...networkRequests];
    console.log('Initial Load Requests:', initialRequests.length);
    
    // Check for efficient resource loading
    const jsRequests = initialRequests.filter(req => req.url.includes('.js'));
    const cssRequests = initialRequests.filter(req => req.url.includes('.css'));
    
    console.log('JavaScript Requests:', jsRequests.length);
    console.log('CSS Requests:', cssRequests.length);
    
    // Start workflow and monitor API calls
    networkRequests.length = 0; // Clear previous requests
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Network performance test');
    await chatInput.press('Enter');
    
    await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
    
    // Wait a bit to capture research plan API calls
    await page.waitForTimeout(5000);
    
    const apiRequests = networkRequests.filter(req => 
      req.url.includes('/api/') || req.url.includes('localhost:8000')
    );
    
    console.log('API Requests during workflow:', apiRequests);
    
    // Check API response times
    apiRequests.forEach(req => {
      if (req.duration) {
        expect(req.duration).toBeLessThan(10000); // 10 second timeout
        console.log(`API ${req.method} ${req.url}: ${req.duration}ms`);
      }
    });
    
    // Check for failed requests
    const failedRequests = networkRequests.filter(req => req.status >= 400);
    expect(failedRequests.length).toBe(0);
  });

  test('Concurrent user simulation', async ({ browser }) => {
    // Simulate multiple users interacting simultaneously
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    // All users navigate to chat simultaneously
    const startTime = Date.now();
    await Promise.all(
      pages.map(page => page.goto('http://localhost:3000/chat'))
    );
    
    // Wait for all pages to load
    await Promise.all(
      pages.map(page => page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 }))
    );
    
    const loadTime = Date.now() - startTime;
    console.log('Concurrent load time for 3 users:', loadTime);
    
    // All users submit messages simultaneously
    const messageStartTime = Date.now();
    await Promise.all(
      pages.map((page, index) => {
        const input = page.locator('[data-testid="chat-input"]');
        return input.fill(`Concurrent test message from user ${index + 1}`)
          .then(() => input.press('Enter'));
      })
    );
    
    // Wait for all messages to appear
    await Promise.all(
      pages.map(page => 
        expect(page.locator('[data-testid="user-message"]').last()).toBeVisible()
      )
    );
    
    const messageTime = Date.now() - messageStartTime;
    console.log('Concurrent message submission time:', messageTime);
    
    // Performance shouldn't degrade significantly with concurrent users
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad * 1.5);
    expect(messageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageRender * 2);
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('Long session performance', async ({ page }) => {
    await page.goto('http://localhost:3000/chat');
    await page.waitForLoadState('networkidle');
    
    const sessionStartTime = Date.now();
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Simulate a longer conversation
    for (let i = 1; i <= 5; i++) {
      const messageStartTime = Date.now();
      
      await chatInput.fill(`Long session message ${i}`);
      await chatInput.press('Enter');
      
      await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
      
      const messageTime = Date.now() - messageStartTime;
      console.log(`Message ${i} render time:`, messageTime);
      
      // Performance shouldn't degrade over time
      expect(messageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.messageRender * 2);
      
      // Check memory periodically
      if (i % 2 === 0) {
        const memory = await page.evaluate(() => {
          return (performance as any).memory ? 
            (performance as any).memory.usedJSHeapSize : null;
        });
        
        if (memory) {
          console.log(`Memory usage after ${i} messages:`, memory);
        }
      }
    }
    
    const totalSessionTime = Date.now() - sessionStartTime;
    console.log('Total session time for 5 messages:', totalSessionTime);
    
    // Check final DOM size
    const domSize = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });
    
    console.log('Final DOM element count:', domSize);
    expect(domSize).toBeLessThan(10000); // Reasonable DOM size limit
  });

  test.afterEach(async () => {
    // Log collected performance metrics
    if (Object.keys(performanceMetrics).length > 0) {
      console.log('\n=== Performance Test Results ===');
      console.log(JSON.stringify(performanceMetrics, null, 2));
      console.log('================================\n');
    }
  });
});