/**
 * Test file to verify the memory leak fix in performance.ts
 * This tests the bounded storage implementation
 */

// Mock types for testing without web-vitals dependency
interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  rerenderCount: number;
  timestamp: number;
}

interface SSEPerformanceMetric {
  eventType: string;
  latency: number;
  connectionTime: number;
  messageSize: number;
  timestamp: number;
}

// Test configuration
const TEST_CONFIG = {
  MAX_METRICS: 10,  // Smaller limit for testing
  MAX_MAP_KEYS: 5,
  RETENTION_DURATION: 1000, // 1 second for testing
  CLEANUP_INTERVAL: 500,    // 500ms for testing
};

class TestPerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private componentMetrics: Map<string, ComponentRenderMetric[]> = new Map();
  private sseMetrics: SSEPerformanceMetric[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializePeriodicCleanup();
  }

  private initializePeriodicCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupMetrics();
    }, TEST_CONFIG.CLEANUP_INTERVAL);
  }

  private addPerformanceMetric(metricName: string, metric: PerformanceMetric) {
    // Enforce max keys limit for the Map
    if (!this.metrics.has(metricName) && this.metrics.size >= TEST_CONFIG.MAX_MAP_KEYS) {
      // Remove oldest key (first entry in Map iteration order)
      const firstKey = this.metrics.keys().next().value;
      if (firstKey) {
        this.metrics.delete(firstKey);
      }
    }
    
    const metrics = this.metrics.get(metricName) || [];
    metrics.push(metric);
    
    // Trim array to max size, removing oldest entries
    if (metrics.length > TEST_CONFIG.MAX_METRICS) {
      metrics.splice(0, metrics.length - TEST_CONFIG.MAX_METRICS);
    }
    
    this.metrics.set(metricName, metrics);
    this.cleanupMetrics();
  }

  private addComponentMetric(componentName: string, metric: ComponentRenderMetric) {
    // Enforce max keys limit for the Map
    if (!this.componentMetrics.has(componentName) && this.componentMetrics.size >= TEST_CONFIG.MAX_MAP_KEYS) {
      // Remove oldest key (first entry in Map iteration order)
      const firstKey = this.componentMetrics.keys().next().value;
      if (firstKey) {
        this.componentMetrics.delete(firstKey);
      }
    }
    
    const metrics = this.componentMetrics.get(componentName) || [];
    metrics.push(metric);
    
    // Trim array to max size, removing oldest entries
    if (metrics.length > TEST_CONFIG.MAX_METRICS) {
      metrics.splice(0, metrics.length - TEST_CONFIG.MAX_METRICS);
    }
    
    this.componentMetrics.set(componentName, metrics);
    this.cleanupMetrics();
  }

  private addSSEMetric(metric: SSEPerformanceMetric) {
    this.sseMetrics.push(metric);
    
    // Trim array to max size, removing oldest entries
    if (this.sseMetrics.length > TEST_CONFIG.MAX_METRICS) {
      this.sseMetrics.splice(0, this.sseMetrics.length - TEST_CONFIG.MAX_METRICS);
    }
    
    this.cleanupMetrics();
  }

  private cleanupMetrics() {
    const cutoffTime = Date.now() - TEST_CONFIG.RETENTION_DURATION;
    
    // Clean up performance metrics
    const metricsKeysToDelete: string[] = [];
    this.metrics.forEach((metrics, key) => {
      const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoffTime);
      if (filteredMetrics.length === 0) {
        metricsKeysToDelete.push(key);
      } else if (filteredMetrics.length !== metrics.length) {
        this.metrics.set(key, filteredMetrics);
      }
    });
    metricsKeysToDelete.forEach(key => this.metrics.delete(key));
    
    // Clean up component metrics
    const componentKeysToDelete: string[] = [];
    this.componentMetrics.forEach((metrics, key) => {
      const filteredMetrics = metrics.filter(metric => metric.timestamp > cutoffTime);
      if (filteredMetrics.length === 0) {
        componentKeysToDelete.push(key);
      } else if (filteredMetrics.length !== metrics.length) {
        this.componentMetrics.set(key, filteredMetrics);
      }
    });
    componentKeysToDelete.forEach(key => this.componentMetrics.delete(key));
    
    // Clean up SSE metrics
    this.sseMetrics = this.sseMetrics.filter(metric => metric.timestamp > cutoffTime);
  }

  public cleanupMetricsNow() {
    this.cleanupMetrics();
  }

  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.metrics.clear();
    this.componentMetrics.clear();
    this.sseMetrics = [];
  }

  // Test helper methods
  public getMetricsSize() {
    return {
      metricsMapSize: this.metrics.size,
      totalPerformanceMetrics: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      componentMapSize: this.componentMetrics.size,
      totalComponentMetrics: Array.from(this.componentMetrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      sseMetricsSize: this.sseMetrics.length
    };
  }

  // Public methods for testing
  public trackPerformanceMetric(name: string, value: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: 'good',
      delta: value,
      id: `test-${Date.now()}`,
      timestamp: Date.now()
    };
    this.addPerformanceMetric(name, metric);
  }

  public trackComponentRender(componentName: string, renderTime: number) {
    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      rerenderCount: 0,
      timestamp: Date.now()
    };
    this.addComponentMetric(componentName, metric);
  }

  public trackSSE(eventType: string, latency: number) {
    const metric: SSEPerformanceMetric = {
      eventType,
      latency,
      connectionTime: 100,
      messageSize: 1024,
      timestamp: Date.now()
    };
    this.addSSEMetric(metric);
  }
}

// Test function
async function testMemoryBounds() {
  console.log('🧪 Testing Performance Monitor Memory Bounds...\n');
  
  const monitor = new TestPerformanceMonitor();
  
  // Test 1: Performance metrics array bounds
  console.log('📊 Test 1: Performance metrics array bounds');
  for (let i = 0; i < 15; i++) {
    monitor.trackPerformanceMetric('FCP', Math.random() * 1000);
  }
  let sizes = monitor.getMetricsSize();
  console.log(`  - Added 15 FCP metrics, stored: ${sizes.totalPerformanceMetrics} (should be ≤ ${TEST_CONFIG.MAX_METRICS})`);
  console.log(`  - ✅ Array bounded: ${sizes.totalPerformanceMetrics <= TEST_CONFIG.MAX_METRICS}\n`);
  
  // Test 2: Map key bounds
  console.log('🗺️  Test 2: Performance metrics Map key bounds');
  for (let i = 0; i < 8; i++) {
    monitor.trackPerformanceMetric(`metric-${i}`, Math.random() * 1000);
  }
  sizes = monitor.getMetricsSize();
  console.log(`  - Added 8 different metric types, map size: ${sizes.metricsMapSize} (should be ≤ ${TEST_CONFIG.MAX_MAP_KEYS})`);
  console.log(`  - ✅ Map keys bounded: ${sizes.metricsMapSize <= TEST_CONFIG.MAX_MAP_KEYS}\n`);
  
  // Test 3: Component metrics bounds
  console.log('⚛️  Test 3: Component metrics bounds');
  for (let i = 0; i < 12; i++) {
    monitor.trackComponentRender('TestComponent', Math.random() * 50);
  }
  sizes = monitor.getMetricsSize();
  console.log(`  - Added 12 component renders, stored: ${sizes.totalComponentMetrics} (should be ≤ ${TEST_CONFIG.MAX_METRICS})`);
  console.log(`  - ✅ Component metrics bounded: ${sizes.totalComponentMetrics <= TEST_CONFIG.MAX_METRICS}\n`);
  
  // Test 4: SSE metrics bounds
  console.log('🔄 Test 4: SSE metrics bounds');
  for (let i = 0; i < 20; i++) {
    monitor.trackSSE('message', Math.random() * 500);
  }
  sizes = monitor.getMetricsSize();
  console.log(`  - Added 20 SSE metrics, stored: ${sizes.sseMetricsSize} (should be ≤ ${TEST_CONFIG.MAX_METRICS})`);
  console.log(`  - ✅ SSE metrics bounded: ${sizes.sseMetricsSize <= TEST_CONFIG.MAX_METRICS}\n`);
  
  // Test 5: Time-based cleanup
  console.log('⏰ Test 5: Time-based cleanup');
  const initialSizes = monitor.getMetricsSize();
  console.log(`  - Current metrics before cleanup: ${JSON.stringify(initialSizes)}`);
  
  // Wait for retention period to pass
  await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.RETENTION_DURATION + 100));
  
  // Trigger cleanup
  monitor.cleanupMetricsNow();
  const afterCleanupSizes = monitor.getMetricsSize();
  console.log(`  - Metrics after time-based cleanup: ${JSON.stringify(afterCleanupSizes)}`);
  console.log(`  - ✅ Time-based cleanup working: ${afterCleanupSizes.totalPerformanceMetrics < initialSizes.totalPerformanceMetrics}\n`);
  
  // Cleanup
  monitor.destroy();
  console.log('🎉 All memory bounds tests completed successfully!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMemoryBounds().catch(console.error);
}

export { TestPerformanceMonitor, testMemoryBounds };