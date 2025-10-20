/**
 * Performance Monitoring and Optimization System
 * Provides comprehensive performance tracking, analysis, and optimization recommendations
 */

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  entryType: string;
  metadata?: Record<string, any>;
}

interface APIPerformanceMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  cacheHit: boolean;
  timestamp: number;
  size?: number;
}

interface SSEPerformanceMetrics {
  connectionId: string;
  connectionTime: number;
  reconnections: number;
  eventsReceived: number;
  averageLatency: number;
  errorCount: number;
  timestamp: number;
}

interface RenderPerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
  propsChanged: string[];
  timestamp: number;
}

interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: number;
}

interface PerformanceReport {
  overview: {
    totalRequests: number;
    averageResponseTime: number;
    cacheHitRatio: number;
    errorRate: number;
    memoryUsage: number;
    renderScore: number;
  };
  bottlenecks: Array<{
    type: 'api' | 'render' | 'memory' | 'sse';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
    recommendation: string;
    metrics: any;
  }>;
  trends: {
    responseTimetrend: number; // positive = getting slower
    memoryTrend: number; // positive = using more memory
    errorTrend: number; // positive = more errors
  };
  optimizations: Array<{
    type: string;
    description: string;
    estimatedImprovement: string;
    implementation: string;
  }>;
}

interface PerformanceIssue {
  type: 'info' | 'warning' | 'error';
  message: string;
  context?: string;
  metrics?: unknown;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private apiMetrics: APIPerformanceMetrics[] = [];
  private sseMetrics: SSEPerformanceMetrics[] = [];
  private renderMetrics: RenderPerformanceMetrics[] = [];
  private memoryMetrics: MemoryMetrics[] = [];
  private isMonitoring = false;
  private observers: PerformanceObserver[] = [];
  private memoryInterval: number | null = null;
  private issueListeners: Array<(issue: PerformanceIssue) => void> = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring || typeof window === 'undefined') return;

    this.isMonitoring = true;

    // Monitor navigation and resource loading
    this.setupNavigationObserver();
    this.setupResourceObserver();
    this.setupMemoryMonitoring();
    this.setupLongTaskObserver();

    console.log('🔍 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }

    console.log('⏹️ Performance monitoring stopped');
  }

  /**
   * Subscribe to performance issues detected by the monitor.
   * Returns an unsubscribe function.
   */
  subscribe(listener: (issue: PerformanceIssue) => void): () => void {
    this.issueListeners.push(listener);
    return () => {
      this.issueListeners = this.issueListeners.filter((l) => l !== listener);
    };
  }

  private notifyIssue(issue: PerformanceIssue): void {
    this.issueListeners.forEach((listener) => {
      try {
        listener(issue);
      } catch (error) {
        console.warn('Performance monitor listener failed:', error);
      }
    });
  }

  /**
   * Setup navigation timing observer
   */
  private setupNavigationObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordNavigationMetrics(navEntry);
          }
        });
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to setup navigation observer:', error);
    }
  }

  /**
   * Setup resource timing observer
   */
  private setupResourceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordResourceMetrics(resourceEntry);
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to setup resource observer:', error);
    }
  }

  /**
   * Setup long task observer for render performance
   */
  private setupLongTaskObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'longtask') {
            this.recordLongTask(entry);
          }
        });
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to setup long task observer:', error);
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    if (typeof (performance as any).memory === 'undefined') return;

    this.memoryInterval = window.setInterval(() => {
      const memory = (performance as any).memory;
      this.memoryMetrics.push({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        timestamp: Date.now(),
      });

      // Keep only last 100 entries
      if (this.memoryMetrics.length > 100) {
        this.memoryMetrics = this.memoryMetrics.slice(-100);
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Record API performance metrics
   */
  recordAPIMetrics(metrics: APIPerformanceMetrics): void {
    this.apiMetrics.push(metrics);

    // Keep only last 500 entries
    if (this.apiMetrics.length > 500) {
      this.apiMetrics = this.apiMetrics.slice(-500);
    }

    // Check for performance issues
    this.checkAPIPerformance(metrics);
  }

  /**
   * Record SSE performance metrics
   */
  recordSSEMetrics(metrics: SSEPerformanceMetrics): void {
    this.sseMetrics.push(metrics);

    // Keep only last 100 entries
    if (this.sseMetrics.length > 100) {
      this.sseMetrics = this.sseMetrics.slice(-100);
    }
  }

  /**
   * Record render performance metrics
   */
  recordRenderMetrics(metrics: RenderPerformanceMetrics): void {
    this.renderMetrics.push(metrics);

    // Keep only last 200 entries
    if (this.renderMetrics.length > 200) {
      this.renderMetrics = this.renderMetrics.slice(-200);
    }

    // Check for render performance issues
    this.checkRenderPerformance(metrics);
  }

  /**
   * Check API performance and log warnings
   */
  private checkAPIPerformance(metrics: APIPerformanceMetrics): void {
    if (metrics.responseTime > 5000) {
      console.warn(`🐌 Slow API request: ${metrics.endpoint} took ${metrics.responseTime}ms`);
      this.notifyIssue({
        type: 'warning',
        message: `Slow API request detected for ${metrics.endpoint}`,
        context: metrics.endpoint,
        metrics,
      });
    }

    if (metrics.statusCode >= 400) {
      console.warn(`❌ API error: ${metrics.endpoint} returned ${metrics.statusCode}`);
      this.notifyIssue({
        type: metrics.statusCode >= 500 ? 'error' : 'warning',
        message: `API error detected for ${metrics.endpoint}`,
        context: metrics.endpoint,
        metrics,
      });
    }
  }

  /**
   * Check render performance and log warnings
   */
  private checkRenderPerformance(metrics: RenderPerformanceMetrics): void {
    if (metrics.renderTime > 16) { // More than one frame at 60fps
      console.warn(`🐌 Slow render: ${metrics.componentName} took ${metrics.renderTime}ms`);
      this.notifyIssue({
        type: 'warning',
        message: `Slow render detected for ${metrics.componentName}`,
        context: metrics.componentName,
        metrics,
      });
    }

    if (metrics.renderCount > 10) {
      console.warn(`🔄 Frequent renders: ${metrics.componentName} rendered ${metrics.renderCount} times recently`);
      this.notifyIssue({
        type: 'warning',
        message: `Frequent renders detected for ${metrics.componentName}`,
        context: metrics.componentName,
        metrics,
      });
    }
  }

  /**
   * Record navigation metrics
   */
  private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
    const metrics = {
      name: 'navigation',
      startTime: entry.startTime,
      duration: entry.loadEventEnd - entry.startTime,
      entryType: 'navigation',
      metadata: {
        domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
        domComplete: entry.domComplete - entry.domInteractive,
        firstPaint: entry.loadEventStart - entry.fetchStart,
        redirectTime: entry.redirectEnd - entry.redirectStart,
        dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
        connectTime: entry.connectEnd - entry.connectStart,
        requestTime: entry.responseEnd - entry.requestStart,
      },
    };

    // Log slow page loads
    if (metrics.duration > 3000) {
      console.warn(`🐌 Slow page load: ${metrics.duration}ms`);
    }
  }

  /**
   * Record resource metrics
   */
  private recordResourceMetrics(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.requestStart;

    // Track API calls
    if (entry.name.includes('/api/')) {
      const url = new URL(entry.name);
      this.recordAPIMetrics({
        endpoint: url.pathname,
        method: 'GET', // Default, would need to track actual method
        responseTime: duration,
        statusCode: 200, // Default, would need to track actual status
        cacheHit: entry.transferSize === 0,
        timestamp: Date.now(),
        size: entry.transferSize,
      });
    }

    // Log slow resources
    if (duration > 2000) {
      console.warn(`🐌 Slow resource: ${entry.name} took ${duration}ms`);
    }
  }

  /**
   * Record long task
   */
  private recordLongTask(entry: PerformanceEntry): void {
    console.warn(`⚠️ Long task detected: ${entry.duration}ms`);

    this.recordRenderMetrics({
      componentName: 'long-task',
      renderTime: entry.duration,
      renderCount: 1,
      propsChanged: [],
      timestamp: Date.now(),
    });
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const lastHour = now - 3600000; // 1 hour ago

    // Filter recent metrics
    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp > lastHour);
    const recentRenderMetrics = this.renderMetrics.filter(m => m.timestamp > lastHour);
    const recentMemoryMetrics = this.memoryMetrics.filter(m => m.timestamp > lastHour);

    // Calculate overview metrics
    const overview = this.calculateOverviewMetrics(recentAPIMetrics, recentRenderMetrics, recentMemoryMetrics);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(recentAPIMetrics, recentRenderMetrics, recentMemoryMetrics);

    // Calculate trends
    const trends = this.calculateTrends();

    // Generate optimization recommendations
    const optimizations = this.generateOptimizations(bottlenecks, overview);

    return {
      overview,
      bottlenecks,
      trends,
      optimizations,
    };
  }

  /**
   * Calculate overview metrics
   */
  private calculateOverviewMetrics(
    apiMetrics: APIPerformanceMetrics[],
    renderMetrics: RenderPerformanceMetrics[],
    memoryMetrics: MemoryMetrics[]
  ) {
    const totalRequests = apiMetrics.length;
    const averageResponseTime = totalRequests > 0
      ? apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
      : 0;

    const cacheHits = apiMetrics.filter(m => m.cacheHit).length;
    const cacheHitRatio = totalRequests > 0 ? cacheHits / totalRequests : 0;

    const errors = apiMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = totalRequests > 0 ? errors / totalRequests : 0;

    const currentMemory = memoryMetrics.length > 0
      ? memoryMetrics[memoryMetrics.length - 1].usedJSHeapSize
      : 0;

    const slowRenders = renderMetrics.filter(m => m.renderTime > 16).length;
    const renderScore = renderMetrics.length > 0
      ? Math.max(0, 100 - (slowRenders / renderMetrics.length) * 100)
      : 100;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      cacheHitRatio: Math.round(cacheHitRatio * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      memoryUsage: Math.round(currentMemory / 1024 / 1024), // MB
      renderScore: Math.round(renderScore),
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    apiMetrics: APIPerformanceMetrics[],
    renderMetrics: RenderPerformanceMetrics[],
    memoryMetrics: MemoryMetrics[]
  ) {
    const bottlenecks: PerformanceReport['bottlenecks'] = [];

    // API bottlenecks
    const slowAPIs = apiMetrics.filter(m => m.responseTime > 2000);
    if (slowAPIs.length > 0) {
      const slowestAPI = slowAPIs.reduce((prev, current) =>
        current.responseTime > prev.responseTime ? current : prev
      );

      bottlenecks.push({
        type: 'api',
        severity: slowestAPI.responseTime > 5000 ? 'critical' : 'high',
        description: `Slow API endpoint: ${slowestAPI.endpoint}`,
        impact: `Average response time: ${slowestAPI.responseTime}ms`,
        recommendation: 'Consider adding caching, optimizing queries, or using pagination',
        metrics: slowestAPI,
      });
    }

    // Render bottlenecks
    const componentsWithSlowRenders = new Map<string, RenderPerformanceMetrics[]>();
    renderMetrics.forEach(m => {
      if (m.renderTime > 16) {
        if (!componentsWithSlowRenders.has(m.componentName)) {
          componentsWithSlowRenders.set(m.componentName, []);
        }
        componentsWithSlowRenders.get(m.componentName)!.push(m);
      }
    });

    componentsWithSlowRenders.forEach((metrics, componentName) => {
      if (metrics.length > 3) {
        const averageTime = metrics.reduce((sum, m) => sum + m.renderTime, 0) / metrics.length;

        bottlenecks.push({
          type: 'render',
          severity: averageTime > 50 ? 'critical' : metrics.length > 10 ? 'high' : 'medium',
          description: `Slow rendering component: ${componentName}`,
          impact: `Average render time: ${Math.round(averageTime)}ms, ${metrics.length} slow renders`,
          recommendation: 'Consider memoization, virtualization, or code splitting',
          metrics: { componentName, averageTime, count: metrics.length },
        });
      }
    });

    // Memory bottlenecks
    if (memoryMetrics.length > 10) {
      const memoryGrowth = memoryMetrics[memoryMetrics.length - 1].usedJSHeapSize - memoryMetrics[0].usedJSHeapSize;
      const growthRate = memoryGrowth / memoryMetrics.length;

      if (growthRate > 1024 * 1024) { // Growing more than 1MB per sample
        bottlenecks.push({
          type: 'memory',
          severity: 'high',
          description: 'Memory leak detected',
          impact: `Memory growing at ${Math.round(growthRate / 1024)}KB per sample`,
          recommendation: 'Check for event listener leaks, unmounted component references, or large object accumulation',
          metrics: { growthRate, totalGrowth: memoryGrowth },
        });
      }
    }

    return bottlenecks;
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const twoHoursAgo = now - 7200000;

    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp > oneHourAgo);
    const olderAPIMetrics = this.apiMetrics.filter(m => m.timestamp > twoHoursAgo && m.timestamp <= oneHourAgo);

    const recentAvgResponseTime = recentAPIMetrics.length > 0
      ? recentAPIMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentAPIMetrics.length
      : 0;

    const olderAvgResponseTime = olderAPIMetrics.length > 0
      ? olderAPIMetrics.reduce((sum, m) => sum + m.responseTime, 0) / olderAPIMetrics.length
      : 0;

    const responseTimetrend = olderAvgResponseTime > 0
      ? (recentAvgResponseTime - olderAvgResponseTime) / olderAvgResponseTime
      : 0;

    // Memory trend
    const recentMemory = this.memoryMetrics.slice(-10);
    const olderMemory = this.memoryMetrics.slice(-20, -10);

    const recentAvgMemory = recentMemory.length > 0
      ? recentMemory.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / recentMemory.length
      : 0;

    const olderAvgMemory = olderMemory.length > 0
      ? olderMemory.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / olderMemory.length
      : 0;

    const memoryTrend = olderAvgMemory > 0
      ? (recentAvgMemory - olderAvgMemory) / olderAvgMemory
      : 0;

    // Error trend
    const recentErrors = recentAPIMetrics.filter(m => m.statusCode >= 400).length;
    const olderErrors = olderAPIMetrics.filter(m => m.statusCode >= 400).length;

    const recentErrorRate = recentAPIMetrics.length > 0 ? recentErrors / recentAPIMetrics.length : 0;
    const olderErrorRate = olderAPIMetrics.length > 0 ? olderErrors / olderAPIMetrics.length : 0;

    const errorTrend = olderErrorRate > 0
      ? (recentErrorRate - olderErrorRate) / olderErrorRate
      : 0;

    return {
      responseTimetrend,
      memoryTrend,
      errorTrend,
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizations(bottlenecks: PerformanceReport['bottlenecks'], overview: PerformanceReport['overview']) {
    const optimizations: PerformanceReport['optimizations'] = [];

    // Cache optimization
    if (overview.cacheHitRatio < 0.7) {
      optimizations.push({
        type: 'caching',
        description: 'Improve API response caching',
        estimatedImprovement: '20-40% response time reduction',
        implementation: 'Implement request deduplication and longer cache TTLs for static data',
      });
    }

    // Render optimization
    if (overview.renderScore < 80) {
      optimizations.push({
        type: 'rendering',
        description: 'Optimize component rendering',
        estimatedImprovement: '15-30% smoother interactions',
        implementation: 'Add React.memo, useMemo, and useCallback to prevent unnecessary re-renders',
      });
    }

    // Memory optimization
    if (overview.memoryUsage > 100) {
      optimizations.push({
        type: 'memory',
        description: 'Reduce memory usage',
        estimatedImprovement: '20-50% memory reduction',
        implementation: 'Implement lazy loading, cleanup event listeners, and limit cached data',
      });
    }

    // API batching
    const apiBottlenecks = bottlenecks.filter(b => b.type === 'api');
    if (apiBottlenecks.length > 2) {
      optimizations.push({
        type: 'batching',
        description: 'Implement request batching',
        estimatedImprovement: '30-60% reduction in API calls',
        implementation: 'Batch multiple API requests and use GraphQL or custom batch endpoints',
      });
    }

    return optimizations;
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.apiMetrics = [];
    this.sseMetrics = [];
    this.renderMetrics = [];
    this.memoryMetrics = [];
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    return {
      apiMetrics: this.apiMetrics.length,
      sseMetrics: this.sseMetrics.length,
      renderMetrics: this.renderMetrics.length,
      memoryMetrics: this.memoryMetrics.length,
      isMonitoring: this.isMonitoring,
    };
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Auto-start monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  performanceMonitor.startMonitoring();
}

// Export types
export type {
  PerformanceReport,
  APIPerformanceMetrics,
  SSEPerformanceMetrics,
  RenderPerformanceMetrics,
  MemoryMetrics,
  PerformanceIssue,
};
