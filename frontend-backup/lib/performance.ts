/**
 * Performance Monitoring and Optimization Utilities for Vana Frontend
 * Implements Core Web Vitals tracking and performance optimization strategies
 */

// Types for performance monitoring
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  rerenderCount: number;
  timestamp: number;
}

export interface SSEPerformanceMetric {
  eventType: string;
  latency: number;
  connectionTime: number;
  messageSize: number;
  timestamp: number;
}

// Core Web Vitals thresholds
export const PERFORMANCE_THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 },   // First Input Delay
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  TTI: { good: 3000, poor: 5000 }, // Time to Interactive
} as const;

// Performance storage configuration
export const PERFORMANCE_CONFIG = {
  MAX_METRICS: 1000,           // Maximum number of metrics per type
  MAX_MAP_KEYS: 100,           // Maximum number of keys in metrics Maps
  RETENTION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  CLEANUP_INTERVAL: 5 * 60 * 1000,          // 5 minutes in milliseconds
} as const;

// Performance monitoring class
class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private componentMetrics: Map<string, ComponentRenderMetric[]> = new Map();
  private sseMetrics: SSEPerformanceMetric[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.initializeNavigationTiming();
      this.initializeResourceTiming();
      this.initializePeriodicCleanup();
    }
  }
  
  /**
   * Initialize periodic cleanup of old metrics
   */
  private initializePeriodicCleanup() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupMetrics();
    }, PERFORMANCE_CONFIG.CLEANUP_INTERVAL);
  }
  
  /**
   * Add performance metric with bounded storage
   */
  private addPerformanceMetric(metricName: string, metric: PerformanceMetric) {
    // Enforce max keys limit for the Map
    if (!this.metrics.has(metricName) && this.metrics.size >= PERFORMANCE_CONFIG.MAX_MAP_KEYS) {
      // Remove oldest key (first entry in Map iteration order)
      const firstKey = this.metrics.keys().next().value;
      if (firstKey) {
        this.metrics.delete(firstKey);
      }
    }
    
    const metrics = this.metrics.get(metricName) || [];
    metrics.push(metric);
    
    // Trim array to max size, removing oldest entries
    if (metrics.length > PERFORMANCE_CONFIG.MAX_METRICS) {
      metrics.splice(0, metrics.length - PERFORMANCE_CONFIG.MAX_METRICS);
    }
    
    this.metrics.set(metricName, metrics);
    
    // Cleanup old entries after adding
    this.cleanupMetrics();
  }
  
  /**
   * Add component metric with bounded storage
   */
  private addComponentMetric(componentName: string, metric: ComponentRenderMetric) {
    // Enforce max keys limit for the Map
    if (!this.componentMetrics.has(componentName) && this.componentMetrics.size >= PERFORMANCE_CONFIG.MAX_MAP_KEYS) {
      // Remove oldest key (first entry in Map iteration order)
      const firstKey = this.componentMetrics.keys().next().value;
      if (firstKey) {
        this.componentMetrics.delete(firstKey);
      }
    }
    
    const metrics = this.componentMetrics.get(componentName) || [];
    metrics.push(metric);
    
    // Trim array to max size, removing oldest entries
    if (metrics.length > PERFORMANCE_CONFIG.MAX_METRICS) {
      metrics.splice(0, metrics.length - PERFORMANCE_CONFIG.MAX_METRICS);
    }
    
    this.componentMetrics.set(componentName, metrics);
    
    // Cleanup old entries after adding
    this.cleanupMetrics();
  }
  
  /**
   * Add SSE metric with bounded storage
   */
  private addSSEMetric(metric: SSEPerformanceMetric) {
    this.sseMetrics.push(metric);
    
    // Trim array to max size, removing oldest entries
    if (this.sseMetrics.length > PERFORMANCE_CONFIG.MAX_METRICS) {
      this.sseMetrics.splice(0, this.sseMetrics.length - PERFORMANCE_CONFIG.MAX_METRICS);
    }
    
    // Cleanup old entries after adding
    this.cleanupMetrics();
  }
  
  /**
   * Clean up metrics older than retention duration
   */
  private cleanupMetrics() {
    const cutoffTime = Date.now() - PERFORMANCE_CONFIG.RETENTION_DURATION;
    
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
  
  /**
   * Manually trigger cleanup (public method for testing or explicit cleanup)
   */
  public cleanupMetricsNow() {
    this.cleanupMetrics();
  }
  
  /**
   * Destroy the performance monitor and clean up resources
   */
  public destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.metrics.clear();
    this.componentMetrics.clear();
    this.sseMetrics = [];
  }
  
  /**
   * Initialize Web Vitals monitoring using the web-vitals library
   */
  private async initializeWebVitals() {
    try {
      // Dynamic import with type assertion for web-vitals
      const webVitals = await import('web-vitals') as any;
      const { getCLS, getFID, getFCP, getLCP, getTTFB } = webVitals;
      
      // Track Core Web Vitals
      getCLS(this.handleWebVital.bind(this));
      getFID(this.handleWebVital.bind(this));
      getFCP(this.handleWebVital.bind(this));
      getLCP(this.handleWebVital.bind(this));
      getTTFB(this.handleWebVital.bind(this));
      
    } catch (error) {
      console.warn('Web Vitals library not available:', error);
      // Fallback to manual measurement
      this.measureManualWebVitals();
    }
  }
  
  /**
   * Handle Web Vitals metrics
   */
  private handleWebVital(metric: any) {
    const rating = this.getRating(metric.name, metric.value);
    
    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating,
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
    };
    
    // Store metric with bounded storage
    this.addPerformanceMetric(metric.name, performanceMetric);
    
    // Send to analytics
    this.sendToAnalytics('core_web_vital', performanceMetric);
    
    // Log performance issues
    if (rating === 'poor') {
      console.warn(`Poor ${metric.name} performance: ${metric.value}ms`);
    }
  }
  
  /**
   * Get performance rating based on thresholds
   */
  private getRating(metricName: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const threshold = PERFORMANCE_THRESHOLDS[metricName as keyof typeof PERFORMANCE_THRESHOLDS];
    if (!threshold) return 'good';
    
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }
  
  /**
   * Manual Web Vitals measurement for fallback
   */
  private measureManualWebVitals() {
    // Measure FCP manually
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.handleWebVital({
          name: 'FCP',
          value: fcpEntry.startTime,
          delta: fcpEntry.startTime,
          id: 'manual-fcp',
        });
      }
    });
    
    try {
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Paint timing not supported');
    }
    
    // Measure LCP manually
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        this.handleWebVital({
          name: 'LCP',
          value: lastEntry.startTime,
          delta: lastEntry.startTime,
          id: 'manual-lcp',
        });
      }
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (error) {
      console.warn('LCP timing not supported');
    }
  }
  
  /**
   * Initialize Navigation Timing monitoring
   */
  private initializeNavigationTiming() {
    if ('navigation' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // Calculate TTFB
      const ttfb = navigation.responseStart - navigation.requestStart;
      this.handleWebVital({
        name: 'TTFB',
        value: ttfb,
        delta: ttfb,
        id: 'navigation-ttfb',
      });
      
      // Calculate TTI (simplified) - using fetchStart as fallback for navigationStart
      const tti = navigation.domInteractive - (navigation.fetchStart || 0);
      this.handleWebVital({
        name: 'TTI',
        value: tti,
        delta: tti,
        id: 'navigation-tti',
      });
    }
  }
  
  /**
   * Initialize Resource Timing monitoring
   */
  private initializeResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Track slow resources
          if (resourceEntry.duration > 1000) {
            console.warn(`Slow resource: ${resourceEntry.name} (${resourceEntry.duration}ms)`);
            this.sendToAnalytics('slow_resource', {
              url: resourceEntry.name,
              duration: resourceEntry.duration,
              size: resourceEntry.transferSize,
              timestamp: Date.now(),
            });
          }
        }
      });
    });
    
    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource timing not supported');
    }
  }
  
  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number, isRerender = false) {
    const metrics = this.componentMetrics.get(componentName) || [];
    const existingMetric = metrics[metrics.length - 1];
    
    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      rerenderCount: isRerender ? (existingMetric?.rerenderCount || 0) + 1 : 0,
      timestamp: Date.now(),
    };
    
    // Store with bounded storage
    this.addComponentMetric(componentName, metric);
    
    // Log slow renders
    if (renderTime > 16) {
      console.warn(`Slow component render: ${componentName} (${renderTime}ms)`);
    }
    
    this.sendToAnalytics('component_render', metric);
  }
  
  /**
   * Track SSE performance metrics
   */
  trackSSEPerformance(
    eventType: string,
    latency: number,
    connectionTime: number,
    messageSize: number
  ) {
    const metric: SSEPerformanceMetric = {
      eventType,
      latency,
      connectionTime,
      messageSize,
      timestamp: Date.now(),
    };
    
    // Store with bounded storage
    this.addSSEMetric(metric);
    
    // Log slow SSE events
    if (latency > 1000) {
      console.warn(`Slow SSE event: ${eventType} (${latency}ms latency)`);
    }
    
    this.sendToAnalytics('sse_performance', metric);
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      webVitals: Object.fromEntries(this.metrics),
      componentRenders: Object.fromEntries(this.componentMetrics),
      sseMetrics: this.sseMetrics,
      bundleSize: this.getBundleSize(),
      memoryUsage: this.getMemoryUsage(),
    };
    
    return summary;
  }
  
  /**
   * Get bundle size information
   */
  private getBundleSize() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.includes('.js'));
    const cssResources = resources.filter(r => r.name.includes('.css'));
    
    return {
      totalJS: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      totalCSS: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      resourceCount: resources.length,
    };
  }
  
  /**
   * Get memory usage information
   */
  private getMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }
  
  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(eventType: string, data: any) {
    // In production, send to your analytics service
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Example: gtag('event', eventType, data);
      // Example: amplitude.track(eventType, data);
      
      // For now, log to console in development
      console.log(`Analytics: ${eventType}`, data);
    }
  }
  
  /**
   * Create performance report
   */
  createPerformanceReport() {
    const summary = this.getPerformanceSummary();
    
    const report = {
      timestamp: new Date().toISOString(),
      coreWebVitals: {
        FCP: this.getLatestMetric('FCP'),
        LCP: this.getLatestMetric('LCP'),
        FID: this.getLatestMetric('FID'),
        CLS: this.getLatestMetric('CLS'),
        TTFB: this.getLatestMetric('TTFB'),
        TTI: this.getLatestMetric('TTI'),
      },
      performanceScore: this.calculatePerformanceScore(),
      slowComponents: this.getSlowComponents(),
      recommendations: this.getPerformanceRecommendations(),
      ...summary,
    };
    
    return report;
  }
  
  /**
   * Get latest metric value
   */
  private getLatestMetric(metricName: string): PerformanceMetric | null {
    const metrics = this.metrics.get(metricName);
    return metrics ? metrics[metrics.length - 1] : null;
  }
  
  /**
   * Calculate overall performance score
   */
  private calculatePerformanceScore(): number {
    const metrics = ['FCP', 'LCP', 'FID', 'CLS'];
    let totalScore = 0;
    let validMetrics = 0;
    
    metrics.forEach(metricName => {
      const metric = this.getLatestMetric(metricName);
      if (metric) {
        const score = metric.rating === 'good' ? 100 : 
                     metric.rating === 'needs-improvement' ? 50 : 0;
        totalScore += score;
        validMetrics++;
      }
    });
    
    return validMetrics > 0 ? Math.round(totalScore / validMetrics) : 0;
  }
  
  /**
   * Get slow components
   */
  private getSlowComponents(): ComponentRenderMetric[] {
    const allMetrics: ComponentRenderMetric[] = [];
    this.componentMetrics.forEach(metrics => {
      allMetrics.push(...metrics);
    });
    
    return allMetrics
      .filter(metric => metric.renderTime > 16)
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, 10);
  }
  
  /**
   * Get performance recommendations
   */
  private getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const fcp = this.getLatestMetric('FCP');
    if (fcp && fcp.rating === 'poor') {
      recommendations.push('Optimize First Contentful Paint by reducing CSS blocking and critical resource size');
    }
    
    const lcp = this.getLatestMetric('LCP');
    if (lcp && lcp.rating === 'poor') {
      recommendations.push('Improve Largest Contentful Paint by optimizing images and server response times');
    }
    
    const cls = this.getLatestMetric('CLS');
    if (cls && cls.rating === 'poor') {
      recommendations.push('Reduce Cumulative Layout Shift by setting explicit dimensions for images and ads');
    }
    
    const slowComponents = this.getSlowComponents();
    if (slowComponents.length > 0) {
      recommendations.push(`Optimize slow components: ${slowComponents.map(c => c.componentName).join(', ')}`);
    }
    
    return recommendations;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// React component performance tracking hook
export function usePerformanceTracker(componentName: string) {
  const trackRender = (renderTime: number, isRerender = false) => {
    performanceMonitor.trackComponentRender(componentName, renderTime, isRerender);
  };
  
  return { trackRender };
}

// Performance utilities
export const performanceUtils = {
  // Debounce function for performance
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T => {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    }) as T;
  },
  
  // Throttle function for performance
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  },
  
  // Memoization for expensive calculations with bounded cache
  memoize: <T extends (...args: any[]) => any>(func: T, maxCacheSize: number = 100): T => {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      // Enforce cache size limit by removing oldest entry
      if (cache.size >= maxCacheSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }
      
      const result = func.apply(null, args);
      cache.set(key, result);
      return result;
    }) as T;
  },
  
  // Measure async function performance
  measureAsync: async <T>(
    name: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await asyncFn();
      const duration = performance.now() - start;
      performanceMonitor.trackComponentRender(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Performance measurement failed for ${name}:`, error);
      performanceMonitor.trackComponentRender(`${name}-error`, duration);
      throw error;
    }
  },
};