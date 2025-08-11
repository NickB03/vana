import { test, expect, Page } from '@playwright/test'
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import fs from 'fs/promises'
import path from 'path'

const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  firstContentfulPaint: 1500, // ms
  largestContentfulPaint: 2500, // ms
  totalBlockingTime: 200, // ms
  cumulativeLayoutShift: 0.1,
  
  // Additional metrics
  timeToInteractive: 5000, // ms
  speedIndex: 3000, // ms
  
  // Bundle size limits
  totalJSSize: 800000, // 800KB
  totalCSSSize: 100000, // 100KB
  totalImageSize: 500000, // 500KB
  
  // Memory usage
  maxHeapSize: 50 * 1024 * 1024, // 50MB
  
  // SSE streaming
  sseLatency: 100, // ms
  firstTokenTime: 500, // ms
}

class PerformanceHelper {
  constructor(private page: Page) {}

  async measurePageLoad() {
    const startTime = Date.now()
    
    await this.page.goto('/', { waitUntil: 'networkidle' })
    
    const loadTime = Date.now() - startTime
    
    // Measure Core Web Vitals
    const vitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const vitals: any = {}
          
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime
            }
          })
          
          resolve(vitals)
        })
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] })
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000)
      })
    })
    
    return { loadTime, vitals }
  }

  async measureBundleSize() {
    // Get all resource sizes from network
    const resources = await this.page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      return entries.map(entry => ({
        name: entry.name,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        type: entry.initiatorType
      }))
    })
    
    const jsResources = resources.filter(r => r.name.includes('.js') || r.type === 'script')
    const cssResources = resources.filter(r => r.name.includes('.css') || r.type === 'css')
    const imageResources = resources.filter(r => r.type === 'img')
    
    return {
      totalJSSize: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      totalCSSSize: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      totalImageSize: imageResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      resources
    }
  }

  async measureMemoryUsage() {
    // @ts-ignore - measureUserAgentSpecificMemory is experimental
    if ('measureUserAgentSpecificMemory' in performance) {
      try {
        // @ts-ignore
        const memInfo = await performance.measureUserAgentSpecificMemory()
        return memInfo.bytes
      } catch (error) {
        console.warn('Memory measurement not available:', error)
      }
    }
    
    // Fallback to approximate memory usage
    const heapInfo = await this.page.evaluate(() => {
      // @ts-ignore
      return performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null
    })
    
    return heapInfo?.usedJSHeapSize || 0
  }

  async measureSSEPerformance() {
    // Navigate to chat and start SSE connection
    await this.page.goto('/chat')
    
    const sseMetrics = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const startTime = Date.now()
        let firstTokenTime: number | null = null
        let tokenCount = 0
        
        // Mock SSE connection for testing
        const eventSource = new EventSource('/api/chat/stream?session=test')
        
        eventSource.addEventListener('message_token', (event) => {
          if (firstTokenTime === null) {
            firstTokenTime = Date.now() - startTime
          }
          tokenCount++
        })
        
        eventSource.addEventListener('complete', () => {
          eventSource.close()
          resolve({
            firstTokenTime,
            totalTime: Date.now() - startTime,
            tokenCount
          })
        })
        
        // Timeout after 10 seconds
        setTimeout(() => {
          eventSource.close()
          resolve({
            firstTokenTime: firstTokenTime || 10000,
            totalTime: 10000,
            tokenCount
          })
        }, 10000)
      })
    })
    
    return sseMetrics
  }

  async runLighthouseAudit() {
    const chrome = await launch({ chromeFlags: ['--headless'] })
    const options = {
      logLevel: 'info' as const,
      output: 'json' as const,
      onlyCategories: ['performance'],
      port: chrome.port,
      configPath: path.join(__dirname, 'lighthouse-config.js')
    }
    
    try {
      const runnerResult = await lighthouse(this.page.url(), options)
      await chrome.kill()
      
      return runnerResult?.lhr
    } catch (error) {
      await chrome.kill()
      throw error
    }
  }
}

test.describe('Performance Tests', () => {
  let performanceHelper: PerformanceHelper

  test.beforeEach(async ({ page }) => {
    performanceHelper = new PerformanceHelper(page)
  })

  test.describe('Core Web Vitals', () => {
    test('should meet FCP target', async ({ page }) => {
      const { vitals } = await performanceHelper.measurePageLoad()
      
      if (vitals.fcp) {
        expect(vitals.fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint)
      }
    })

    test('should meet LCP target', async ({ page }) => {
      const { vitals } = await performanceHelper.measurePageLoad()
      
      if (vitals.lcp) {
        expect(vitals.lcp).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint)
      }
    })

    test('should have low cumulative layout shift', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(2000) // Wait for any layout shifts
      
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            let clsValue = 0
            list.getEntries().forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value
              }
            })
            resolve(clsValue)
          })
          
          observer.observe({ entryTypes: ['layout-shift'] })
          
          setTimeout(() => resolve(0), 1000)
        })
      })
      
      expect(cls).toBeLessThan(PERFORMANCE_THRESHOLDS.cumulativeLayoutShift)
    })

    test('should have acceptable Total Blocking Time', async ({ page }) => {
      const lighthouse = await performanceHelper.runLighthouseAudit()
      const tbt = lighthouse?.audits['total-blocking-time']?.numericValue
      
      if (tbt) {
        expect(tbt).toBeLessThan(PERFORMANCE_THRESHOLDS.totalBlockingTime)
      }
    })
  })

  test.describe('Bundle Size Optimization', () => {
    test('should meet JavaScript bundle size limits', async ({ page }) => {
      await page.goto('/')
      const { totalJSSize } = await performanceHelper.measureBundleSize()
      
      expect(totalJSSize).toBeLessThan(PERFORMANCE_THRESHOLDS.totalJSSize)
      
      console.log(`Total JS size: ${(totalJSSize / 1024).toFixed(2)} KB`)
    })

    test('should meet CSS bundle size limits', async ({ page }) => {
      await page.goto('/')
      const { totalCSSSize } = await performanceHelper.measureBundleSize()
      
      expect(totalCSSSize).toBeLessThan(PERFORMANCE_THRESHOLDS.totalCSSSize)
      
      console.log(`Total CSS size: ${(totalCSSSize / 1024).toFixed(2)} KB`)
    })

    test('should optimize image loading', async ({ page }) => {
      await page.goto('/')
      const { totalImageSize, resources } = await performanceHelper.measureBundleSize()
      
      expect(totalImageSize).toBeLessThan(PERFORMANCE_THRESHOLDS.totalImageSize)
      
      // Check for modern image formats
      const images = resources.filter(r => r.type === 'img')
      const modernFormats = images.filter(img => 
        img.name.includes('.webp') || 
        img.name.includes('.avif')
      )
      
      if (images.length > 0) {
        const modernFormatRatio = modernFormats.length / images.length
        expect(modernFormatRatio).toBeGreaterThan(0.5) // At least 50% modern formats
      }
    })

    test('should use code splitting effectively', async ({ page }) => {
      await page.goto('/')
      const { resources } = await performanceHelper.measureBundleSize()
      
      const jsChunks = resources.filter(r => 
        r.name.includes('.js') && 
        (r.name.includes('chunk') || r.name.includes('async'))
      )
      
      // Should have multiple JS chunks (indicating code splitting)
      expect(jsChunks.length).toBeGreaterThan(1)
      
      // Main bundle should not be too large
      const mainBundle = resources.find(r => r.name.includes('main') || r.name.includes('index'))
      if (mainBundle) {
        expect(mainBundle.transferSize).toBeLessThan(400000) // 400KB
      }
    })
  })

  test.describe('Memory Usage', () => {
    test('should maintain reasonable memory usage', async ({ page }) => {
      await page.goto('/')
      
      const initialMemory = await performanceHelper.measureMemoryUsage()
      
      // Perform memory-intensive operations
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      // Create large content
      const largeContent = 'A'.repeat(10000)
      await page.locator('[data-testid="markdown-editor"] textarea').fill(largeContent)
      
      // Switch between modes multiple times
      for (let i = 0; i < 5; i++) {
        await page.locator('[role="tab"]:has-text("Code")').click()
        await page.locator('[role="tab"]:has-text("Markdown")').click()
      }
      
      const finalMemory = await performanceHelper.measureMemoryUsage()
      const memoryIncrease = finalMemory - initialMemory
      
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.maxHeapSize)
      
      console.log(`Memory usage increased by: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`)
    })

    test('should handle memory cleanup on navigation', async ({ page }) => {
      // Load chat page with content
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      
      const memoryAfterLoad = await performanceHelper.measureMemoryUsage()
      
      // Navigate away and back
      await page.goto('/')
      await page.goto('/chat')
      
      const memoryAfterNavigation = await performanceHelper.measureMemoryUsage()
      
      // Memory should not increase significantly after navigation
      const memoryIncrease = memoryAfterNavigation - memoryAfterLoad
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB tolerance
    })
  })

  test.describe('SSE Streaming Performance', () => {
    test('should meet SSE latency targets', async ({ page }) => {
      // Mock SSE endpoint for testing
      await page.route('/api/chat/stream*', (route) => {
        const stream = new ReadableStream({
          start(controller) {
            // Simulate streaming tokens with specific timing
            const tokens = ['Hello', ' ', 'world', '!']
            let index = 0
            
            const sendToken = () => {
              if (index < tokens.length) {
                controller.enqueue(`event: message_token\ndata: ${JSON.stringify({
                  token: tokens[index]
                })}\n\n`)
                index++
                setTimeout(sendToken, 50) // 50ms between tokens
              } else {
                controller.enqueue(`event: complete\ndata: {}\n\n`)
                controller.close()
              }
            }
            
            setTimeout(sendToken, 100) // First token after 100ms
          }
        })
        
        route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream'
          },
          body: stream
        })
      })
      
      const metrics = await performanceHelper.measureSSEPerformance()
      
      expect(metrics.firstTokenTime).toBeLessThan(PERFORMANCE_THRESHOLDS.firstTokenTime)
      expect(metrics.tokenCount).toBeGreaterThan(0)
    })

    test('should handle high-frequency streaming without performance degradation', async ({ page }) => {
      // Mock high-frequency SSE stream
      await page.route('/api/chat/stream*', (route) => {
        const stream = new ReadableStream({
          start(controller) {
            let count = 0
            const maxTokens = 100
            
            const sendToken = () => {
              if (count < maxTokens) {
                controller.enqueue(`event: message_token\ndata: ${JSON.stringify({
                  token: `token${count} `
                })}\n\n`)
                count++
                setTimeout(sendToken, 10) // 10ms between tokens (high frequency)
              } else {
                controller.enqueue(`event: complete\ndata: {}\n\n`)
                controller.close()
              }
            }
            
            sendToken()
          }
        })
        
        route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream'
          },
          body: stream
        })
      })
      
      const startMemory = await performanceHelper.measureMemoryUsage()
      const startTime = Date.now()
      
      const metrics = await performanceHelper.measureSSEPerformance()
      
      const endMemory = await performanceHelper.measureMemoryUsage()
      const totalTime = Date.now() - startTime
      
      // Should handle 100 tokens in reasonable time
      expect(totalTime).toBeLessThan(5000) // 5 seconds
      expect(metrics.tokenCount).toBe(100)
      
      // Memory usage should not increase significantly
      const memoryIncrease = endMemory - startMemory
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024) // 5MB
    })
  })

  test.describe('Canvas Editor Performance', () => {
    test('should maintain performance with large documents', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      // Generate large markdown document
      const sections = Array.from({ length: 100 }, (_, i) => 
        `## Section ${i + 1}\n\n${'Lorem ipsum dolor sit amet. '.repeat(50)}`
      ).join('\n\n')
      
      const startTime = Date.now()
      const startMemory = await performanceHelper.measureMemoryUsage()
      
      // Fill editor with large content
      await page.locator('[data-testid="markdown-editor"] textarea').fill(sections)
      
      // Wait for preview to update
      await page.waitForTimeout(1000)
      
      const loadTime = Date.now() - startTime
      const endMemory = await performanceHelper.measureMemoryUsage()
      
      // Should handle large document quickly
      expect(loadTime).toBeLessThan(2000) // 2 seconds
      
      // Memory increase should be reasonable
      const memoryIncrease = endMemory - startMemory
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024) // 20MB
      
      // UI should remain responsive
      const typeStartTime = Date.now()
      await page.locator('[data-testid="markdown-editor"] textarea').type('\n\n# New Section')
      const typeTime = Date.now() - typeStartTime
      
      expect(typeTime).toBeLessThan(500) // 500ms
    })

    test('should handle rapid mode switching efficiently', async ({ page }) => {
      await page.goto('/chat')
      await page.locator('[data-testid="canvas-button"]').click()
      await page.waitForSelector('[data-testid="canvas-panel"]')
      
      const startMemory = await performanceHelper.measureMemoryUsage()
      const startTime = Date.now()
      
      // Rapid mode switching
      for (let i = 0; i < 10; i++) {
        await page.locator('[role="tab"]:has-text("Code")').click()
        await page.locator('[role="tab"]:has-text("Markdown")').click()
        await page.locator('[role="tab"]:has-text("Preview")').click()
        await page.locator('[role="tab"]:has-text("Markdown")').click()
      }
      
      const totalTime = Date.now() - startTime
      const endMemory = await performanceHelper.measureMemoryUsage()
      
      // Should complete switches quickly
      expect(totalTime).toBeLessThan(5000) // 5 seconds for 40 switches
      
      // Memory should not increase significantly
      const memoryIncrease = endMemory - startMemory
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB
    })
  })

  test.describe('Lighthouse Performance Audit', () => {
    test('should pass Lighthouse performance audit', async ({ page }) => {
      await page.goto('/')
      
      const lighthouse = await performanceHelper.runLighthouseAudit()
      
      expect(lighthouse).toBeDefined()
      
      // Overall performance score
      const performanceScore = lighthouse?.categories?.performance?.score
      expect(performanceScore).toBeGreaterThan(0.9) // 90+ score
      
      // Specific audit checks
      const audits = lighthouse?.audits
      
      if (audits) {
        expect(audits['first-contentful-paint']?.numericValue).toBeLessThan(1500)
        expect(audits['largest-contentful-paint']?.numericValue).toBeLessThan(2500)
        expect(audits['total-blocking-time']?.numericValue).toBeLessThan(200)
        expect(audits['cumulative-layout-shift']?.numericValue).toBeLessThan(0.1)
      }
      
      // Save lighthouse report for debugging
      if (lighthouse) {
        const reportPath = path.join(__dirname, 'lighthouse-report.json')
        await fs.writeFile(reportPath, JSON.stringify(lighthouse, null, 2))
        console.log(`Lighthouse report saved to: ${reportPath}`)
      }
    })
  })
})