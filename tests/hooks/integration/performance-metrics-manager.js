#!/usr/bin/env node

/**
 * Performance Metrics Manager for Hook System
 * 
 * Collects, stores, and analyzes performance metrics for hook operations
 * across sessions to identify trends, bottlenecks, and optimization opportunities.
 * 
 * Features:
 * - Real-time performance data collection
 * - Historical trend analysis
 * - Bottleneck detection and alerting
 * - Performance regression detection
 * - Memory usage tracking
 * - Hook execution profiling
 * - Cross-session performance comparison
 */

const { MemoryPersistenceManager } = require('./memory-persistence-manager');

class PerformanceMetricsManager {
  constructor(memoryManager, options = {}) {
    this.memoryManager = memoryManager;
    this.options = {
      namespace: 'performance-metrics',
      metricsRetention: options.metricsRetention || 30 * 24 * 60 * 60 * 1000, // 30 days
      enableRealTimeAlerts: options.enableRealTimeAlerts !== false,
      enableTrendAnalysis: options.enableTrendAnalysis !== false,
      alertThresholds: {
        executionTime: options.executionTimeThreshold || 5000, // 5 seconds
        memoryUsage: options.memoryThreshold || 100 * 1024 * 1024, // 100MB
        errorRate: options.errorRateThreshold || 0.1, // 10%
        ...options.alertThresholds
      },
      aggregationIntervals: {
        minute: 60 * 1000,
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000
      },
      ...options
    };
    
    this.activeMetrics = new Map(); // Real-time metrics tracking
    this.alertHistory = [];
    this.isInitialized = false;
    
    // Performance baselines for comparison
    this.baselines = {
      hookExecution: {
        'pre-task': 300,
        'post-edit': 150,
        'post-task': 800,
        'session-end': 1200
      },
      memoryUsage: 50 * 1024 * 1024, // 50MB baseline
      fileOperations: {
        read: 10,
        write: 50,
        backup: 100
      }
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('📊 Initializing Performance Metrics Manager...');
    
    // Store initialization marker
    await this.memoryManager.store('metrics:initialized', {
      timestamp: Date.now(),
      version: '1.0.0',
      features: ['real_time_tracking', 'trend_analysis', 'bottleneck_detection'],
      baselines: this.baselines
    }, {
      namespace: this.options.namespace,
      tags: ['system', 'initialization'],
      ttl: this.options.metricsRetention
    });
    
    // Load existing baselines
    await this.loadPerformanceBaselines();
    
    // Start real-time monitoring
    this.startRealTimeMonitoring();
    
    this.isInitialized = true;
    console.log('✅ Performance Metrics Manager ready');
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  async recordHookExecution(hookType, executionMetrics) {
    try {
      const timestamp = Date.now();
      const metricEntry = {
        hookType,
        timestamp,
        executionTime: executionMetrics.executionTime,
        memoryUsage: executionMetrics.memoryUsage || this.getCurrentMemoryUsage(),
        success: executionMetrics.success !== false,
        error: executionMetrics.error || null,
        context: executionMetrics.context || {},
        sessionId: executionMetrics.sessionId || 'unknown',
        agentId: executionMetrics.agentId || null,
        filePath: executionMetrics.filePath || null,
        operationType: executionMetrics.operationType || 'unknown'
      };
      
      // Store individual metric
      const metricKey = `hook:${hookType}:${timestamp}`;
      await this.memoryManager.store(metricKey, metricEntry, {
        namespace: this.options.namespace,
        tags: ['hook-execution', hookType, metricEntry.success ? 'success' : 'failure'],
        ttl: this.options.metricsRetention
      });
      
      // Update real-time tracking
      this.updateRealTimeMetrics(hookType, metricEntry);
      
      // Check for performance alerts
      if (this.options.enableRealTimeAlerts) {
        await this.checkPerformanceAlerts(hookType, metricEntry);
      }
      
      // Update aggregated metrics would be implemented here
      // await this.updateAggregatedMetrics(hookType, metricEntry);
      
      return metricEntry;

    } catch (error) {
      console.warn('Failed to record hook execution metrics:', error.message);
      return null;
    }
  }

  async recordFileOperation(operation, filePath, metrics) {
    try {
      const timestamp = Date.now();
      const metricEntry = {
        operation, // read, write, backup, restore
        filePath,
        timestamp,
        duration: metrics.duration,
        fileSize: metrics.fileSize || 0,
        success: metrics.success !== false,
        error: metrics.error || null,
        compressionRatio: metrics.compressionRatio || null,
        memoryDelta: metrics.memoryDelta || 0
      };
      
      const metricKey = `file:${operation}:${timestamp}`;
      await this.memoryManager.store(metricKey, metricEntry, {
        namespace: this.options.namespace,
        tags: ['file-operation', operation, metricEntry.success ? 'success' : 'failure'],
        ttl: this.options.metricsRetention
      });
      
      // Check for file operation performance issues would be implemented here
      // await this.checkFileOperationAlerts(operation, metricEntry);
      
      return metricEntry;

    } catch (error) {
      console.warn('Failed to record file operation metrics:', error.message);
      return null;
    }
  }

  async recordMemorySnapshot(context = {}) {
    try {
      const memoryUsage = process.memoryUsage();
      const timestamp = Date.now();
      
      const snapshot = {
        timestamp,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        context,
        sessionId: context.sessionId || 'unknown'
      };
      
      const snapshotKey = `memory:snapshot:${timestamp}`;
      await this.memoryManager.store(snapshotKey, snapshot, {
        namespace: this.options.namespace,
        tags: ['memory-snapshot', 'monitoring'],
        ttl: this.options.metricsRetention
      });
      
      // Check for memory alerts
      if (memoryUsage.heapUsed > this.options.alertThresholds.memoryUsage) {
        await this.triggerMemoryAlert(snapshot);
      }
      
      return snapshot;

    } catch (error) {
      console.warn('Failed to record memory snapshot:', error.message);
      return null;
    }
  }

  // ============================================================================
  // REAL-TIME MONITORING
  // ============================================================================

  startRealTimeMonitoring() {
    // Monitor every minute
    this.monitoringInterval = setInterval(async () => {
      await this.collectRealTimeMetrics();
    }, 60 * 1000);
    
    // Aggregate metrics every hour
    this.aggregationInterval = setInterval(async () => {
      await this.performHourlyAggregation();
    }, this.options.aggregationIntervals.hour);
  }

  async collectRealTimeMetrics() {
    try {
      // Record memory snapshot
      await this.recordMemorySnapshot({ source: 'real_time_monitoring' });
      
      // Update active metrics summary
      await this.updateActiveMetricsSummary();
      
    } catch (error) {
      console.warn('Real-time metrics collection failed:', error.message);
    }
  }

  updateRealTimeMetrics(hookType, metricEntry) {
    if (!this.activeMetrics.has(hookType)) {
      this.activeMetrics.set(hookType, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        lastExecution: null,
        maxTime: 0,
        minTime: Infinity
      });
    }
    
    const metrics = this.activeMetrics.get(hookType);
    metrics.count++;
    metrics.totalTime += metricEntry.executionTime;
    metrics.avgTime = metrics.totalTime / metrics.count;
    metrics.lastExecution = metricEntry.timestamp;
    metrics.maxTime = Math.max(metrics.maxTime, metricEntry.executionTime);
    metrics.minTime = Math.min(metrics.minTime, metricEntry.executionTime);
    
    if (!metricEntry.success) {
      metrics.errors++;
    }
  }

  async updateActiveMetricsSummary() {
    try {
      const summary = {
        timestamp: Date.now(),
        hooks: Object.fromEntries(this.activeMetrics),
        totalExecutions: Array.from(this.activeMetrics.values()).reduce((sum, m) => sum + m.count, 0),
        totalErrors: Array.from(this.activeMetrics.values()).reduce((sum, m) => sum + m.errors, 0),
        memoryUsage: this.getCurrentMemoryUsage()
      };
      
      await this.memoryManager.store('metrics:real_time_summary', summary, {
        namespace: this.options.namespace,
        tags: ['real-time', 'summary'],
        ttl: this.options.aggregationIntervals.hour
      });

    } catch (error) {
      console.warn('Failed to update active metrics summary:', error.message);
    }
  }

  // ============================================================================
  // PERFORMANCE ANALYSIS
  // ============================================================================

  async analyzePerformanceTrends(hookType, days = 7) {
    try {
      const trends = [];
      const now = Date.now();
      
      for (let i = 0; i < days; i++) {
        const dayStart = now - (i * 24 * 60 * 60 * 1000);
        const dayEnd = dayStart + (24 * 60 * 60 * 1000);
        
        const dayMetrics = await this.getMetricsInTimeRange(hookType, dayStart, dayEnd);
        
        if (dayMetrics.length > 0) {
          const dayAnalysis = this.analyzeMetricsArray(dayMetrics);
          dayAnalysis.date = new Date(dayStart).toISOString().split('T')[0];
          trends.push(dayAnalysis);
        }
      }
      
      // Detect trends
      const trendAnalysis = this.detectPerformanceTrends(trends);
      
      // Store trend analysis
      await this.memoryManager.store(`trends:${hookType}:${days}d`, {
        hookType,
        period: `${days} days`,
        trends,
        analysis: trendAnalysis,
        generatedAt: Date.now()
      }, {
        namespace: this.options.namespace,
        tags: ['trends', 'analysis', hookType],
        ttl: 7 * 24 * 60 * 60 * 1000
      });
      
      return { trends, analysis: trendAnalysis };

    } catch (error) {
      console.warn('Performance trend analysis failed:', error.message);
      return { trends: [], analysis: {} };
    }
  }

  async detectBottlenecks() {
    try {
      const bottlenecks = [];
      
      // Analyze each hook type
      for (const hookType of ['pre-task', 'post-edit', 'post-task', 'session-end']) {
        const recentMetrics = await this.getRecentMetrics(hookType, 100);
        
        if (recentMetrics.length > 10) {
          const analysis = this.analyzeMetricsArray(recentMetrics);
          const baseline = this.baselines.hookExecution[hookType] || 1000;
          
          if (analysis.avgExecutionTime > baseline * 2) {
            bottlenecks.push({
              type: 'hook_execution',
              hookType,
              severity: 'high',
              avgTime: analysis.avgExecutionTime,
              baseline,
              deviation: (analysis.avgExecutionTime / baseline - 1) * 100,
              affectedOperations: recentMetrics.length,
              recommendation: this.getBottleneckRecommendation(hookType, analysis)
            });
          }
        }
      }
      
      // Analyze memory usage
      const memorySnapshots = await this.getRecentMemorySnapshots(50);
      if (memorySnapshots.length > 10) {
        const memoryAnalysis = this.analyzeMemoryUsage(memorySnapshots);
        
        if (memoryAnalysis.trend === 'increasing' && memoryAnalysis.avgUsage > this.baselines.memoryUsage * 2) {
          bottlenecks.push({
            type: 'memory_usage',
            severity: 'medium',
            avgUsage: memoryAnalysis.avgUsage,
            baseline: this.baselines.memoryUsage,
            trend: memoryAnalysis.trend,
            recommendation: 'Consider implementing memory cleanup or reducing cache sizes'
          });
        }
      }
      
      // Store bottleneck analysis
      await this.memoryManager.store('analysis:bottlenecks', {
        detectedAt: Date.now(),
        bottlenecks,
        summary: {
          total: bottlenecks.length,
          high: bottlenecks.filter(b => b.severity === 'high').length,
          medium: bottlenecks.filter(b => b.severity === 'medium').length,
          low: bottlenecks.filter(b => b.severity === 'low').length
        }
      }, {
        namespace: this.options.namespace,
        tags: ['analysis', 'bottlenecks'],
        ttl: 24 * 60 * 60 * 1000
      });
      
      return bottlenecks;

    } catch (error) {
      console.warn('Bottleneck detection failed:', error.message);
      return [];
    }
  }

  // ============================================================================
  // ALERTING SYSTEM
  // ============================================================================

  async checkPerformanceAlerts(hookType, metricEntry) {
    const alerts = [];
    
    // Execution time alert
    const threshold = this.options.alertThresholds.executionTime;
    if (metricEntry.executionTime > threshold) {
      alerts.push({
        type: 'execution_time',
        severity: metricEntry.executionTime > threshold * 2 ? 'high' : 'medium',
        hookType,
        message: `Hook execution time (${metricEntry.executionTime}ms) exceeded threshold (${threshold}ms)`,
        value: metricEntry.executionTime,
        threshold,
        timestamp: metricEntry.timestamp
      });
    }
    
    // Error alert
    if (!metricEntry.success) {
      alerts.push({
        type: 'execution_error',
        severity: 'high',
        hookType,
        message: `Hook execution failed: ${metricEntry.error}`,
        error: metricEntry.error,
        timestamp: metricEntry.timestamp
      });
    }
    
    // Process alerts
    for (const alert of alerts) {
      await this.processAlert(alert);
    }
    
    return alerts;
  }

  async processAlert(alert) {
    try {
      // Add to alert history
      this.alertHistory.push(alert);
      
      // Keep only recent alerts in memory
      if (this.alertHistory.length > 100) {
        this.alertHistory = this.alertHistory.slice(-50);
      }
      
      // Store alert
      const alertKey = `alert:${alert.type}:${alert.timestamp}`;
      await this.memoryManager.store(alertKey, alert, {
        namespace: this.options.namespace,
        tags: ['alert', alert.type, alert.severity],
        ttl: 7 * 24 * 60 * 60 * 1000
      });
      
      // Log critical alerts
      if (alert.severity === 'high') {
        console.warn(`🚨 Performance Alert: ${alert.message}`);
      }

    } catch (error) {
      console.warn('Failed to process performance alert:', error.message);
    }
  }

  async triggerMemoryAlert(snapshot) {
    const alert = {
      type: 'memory_usage',
      severity: snapshot.heapUsed > this.options.alertThresholds.memoryUsage * 2 ? 'high' : 'medium',
      message: `Memory usage (${this.formatBytes(snapshot.heapUsed)}) exceeded threshold`,
      value: snapshot.heapUsed,
      threshold: this.options.alertThresholds.memoryUsage,
      timestamp: snapshot.timestamp,
      context: snapshot.context
    };
    
    await this.processAlert(alert);
  }

  // ============================================================================
  // DATA ANALYSIS HELPERS
  // ============================================================================

  analyzeMetricsArray(metrics) {
    if (metrics.length === 0) return {};
    
    const executionTimes = metrics.map(m => m.executionTime).filter(t => typeof t === 'number');
    const memoryUsages = metrics.map(m => m.memoryUsage).filter(m => typeof m === 'number');
    const errors = metrics.filter(m => !m.success);
    
    return {
      count: metrics.length,
      avgExecutionTime: this.average(executionTimes),
      medianExecutionTime: this.median(executionTimes),
      p95ExecutionTime: this.percentile(executionTimes, 95),
      maxExecutionTime: Math.max(...executionTimes),
      minExecutionTime: Math.min(...executionTimes),
      avgMemoryUsage: this.average(memoryUsages),
      errorRate: errors.length / metrics.length,
      errors: errors.length,
      timeRange: {
        start: Math.min(...metrics.map(m => m.timestamp)),
        end: Math.max(...metrics.map(m => m.timestamp))
      }
    };
  }

  detectPerformanceTrends(trends) {
    if (trends.length < 3) return { trend: 'insufficient_data' };
    
    const avgTimes = trends.map(t => t.avgExecutionTime).filter(t => !isNaN(t));
    const errorRates = trends.map(t => t.errorRate).filter(r => !isNaN(r));
    
    return {
      executionTimeTrend: this.calculateTrend(avgTimes),
      errorRateTrend: this.calculateTrend(errorRates),
      overallAssessment: this.assessOverallTrend(avgTimes, errorRates),
      dataPoints: trends.length,
      confidence: trends.length >= 7 ? 'high' : trends.length >= 5 ? 'medium' : 'low'
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;
    
    if (Math.abs(change) < 0.1) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  assessOverallTrend(avgTimes, errorRates) {
    const timeTrend = this.calculateTrend(avgTimes);
    const errorTrend = this.calculateTrend(errorRates);
    
    if (timeTrend === 'increasing' || errorTrend === 'increasing') {
      return 'degrading';
    } else if (timeTrend === 'decreasing' && errorTrend === 'decreasing') {
      return 'improving';
    } else {
      return 'stable';
    }
  }

  analyzeMemoryUsage(snapshots) {
    const memoryValues = snapshots.map(s => s.heapUsed);
    const trend = this.calculateTrend(memoryValues);
    
    return {
      avgUsage: this.average(memoryValues),
      maxUsage: Math.max(...memoryValues),
      minUsage: Math.min(...memoryValues),
      trend,
      snapshots: snapshots.length
    };
  }

  getBottleneckRecommendation(hookType, analysis) {
    const recommendations = {
      'pre-task': 'Consider optimizing agent assignment logic or reducing coordination overhead',
      'post-edit': 'Review file processing and memory management in edit hooks',
      'post-task': 'Optimize performance analysis and metrics collection',
      'session-end': 'Streamline cleanup processes and reduce data persistence overhead'
    };
    
    return recommendations[hookType] || 'Review hook implementation for optimization opportunities';
  }

  // ============================================================================
  // DATA RETRIEVAL
  // ============================================================================

  async getMetricsInTimeRange(hookType, startTime, endTime) {
    try {
      const searchResults = await this.memoryManager.search(`hook:${hookType}:*`, {
        namespace: this.options.namespace,
        limit: 1000
      });
      
      const metrics = [];
      for (const result of searchResults.results) {
        const metric = await this.memoryManager.retrieve(result.key, {
          namespace: this.options.namespace
        });
        
        if (metric && metric.value.timestamp >= startTime && metric.value.timestamp <= endTime) {
          metrics.push(metric.value);
        }
      }
      
      return metrics.sort((a, b) => a.timestamp - b.timestamp);

    } catch (error) {
      console.warn('Failed to get metrics in time range:', error.message);
      return [];
    }
  }

  async getRecentMetrics(hookType, limit = 50) {
    const endTime = Date.now();
    const startTime = endTime - (24 * 60 * 60 * 1000); // Last 24 hours
    
    const metrics = await this.getMetricsInTimeRange(hookType, startTime, endTime);
    return metrics.slice(-limit);
  }

  async getRecentMemorySnapshots(limit = 50) {
    try {
      const searchResults = await this.memoryManager.search('memory:snapshot:*', {
        namespace: this.options.namespace,
        limit
      });
      
      const snapshots = [];
      for (const result of searchResults.results) {
        const snapshot = await this.memoryManager.retrieve(result.key, {
          namespace: this.options.namespace
        });
        
        if (snapshot) {
          snapshots.push(snapshot.value);
        }
      }
      
      return snapshots.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);

    } catch (error) {
      console.warn('Failed to get recent memory snapshots:', error.message);
      return [];
    }
  }

  async loadPerformanceBaselines() {
    try {
      const storedBaselines = await this.memoryManager.retrieve('baselines:performance', {
        namespace: this.options.namespace
      });
      
      if (storedBaselines) {
        this.baselines = { ...this.baselines, ...storedBaselines.value };
        console.log('📊 Loaded custom performance baselines');
      }

    } catch (error) {
      console.warn('Failed to load performance baselines:', error.message);
    }
  }

  async updatePerformanceBaselines(newBaselines) {
    try {
      this.baselines = { ...this.baselines, ...newBaselines };
      
      await this.memoryManager.store('baselines:performance', this.baselines, {
        namespace: this.options.namespace,
        tags: ['baselines', 'configuration'],
        ttl: 30 * 24 * 60 * 60 * 1000
      });
      
      console.log('📊 Updated performance baselines');

    } catch (error) {
      console.warn('Failed to update performance baselines:', error.message);
    }
  }

  // ============================================================================
  // AGGREGATION AND REPORTING
  // ============================================================================

  async performHourlyAggregation() {
    try {
      const now = Date.now();
      const hourStart = now - (60 * 60 * 1000);
      
      for (const hookType of ['pre-task', 'post-edit', 'post-task', 'session-end']) {
        const hourlyMetrics = await this.getMetricsInTimeRange(hookType, hourStart, now);
        
        if (hourlyMetrics.length > 0) {
          const aggregation = {
            ...this.analyzeMetricsArray(hourlyMetrics),
            hookType,
            aggregationPeriod: 'hourly',
            periodStart: hourStart,
            periodEnd: now
          };
          
          const aggregationKey = `aggregation:hourly:${hookType}:${hourStart}`;
          await this.memoryManager.store(aggregationKey, aggregation, {
            namespace: this.options.namespace,
            tags: ['aggregation', 'hourly', hookType],
            ttl: 7 * 24 * 60 * 60 * 1000
          });
        }
      }

    } catch (error) {
      console.warn('Hourly aggregation failed:', error.message);
    }
  }

  async generatePerformanceReport(days = 7) {
    try {
      const report = {
        generated: Date.now(),
        period: `${days} days`,
        summary: {},
        trends: {},
        bottlenecks: await this.detectBottlenecks(),
        alerts: this.alertHistory.slice(-20),
        recommendations: []
      };
      
      // Analyze each hook type
      for (const hookType of ['pre-task', 'post-edit', 'post-task', 'session-end']) {
        const trendAnalysis = await this.analyzePerformanceTrends(hookType, days);
        report.trends[hookType] = trendAnalysis;
        
        const recentMetrics = await this.getRecentMetrics(hookType, 100);
        report.summary[hookType] = this.analyzeMetricsArray(recentMetrics);
      }
      
      // Generate recommendations
      report.recommendations = this.generatePerformanceRecommendations(report);
      
      // Store report
      await this.memoryManager.store(`report:performance:${days}d`, report, {
        namespace: this.options.namespace,
        tags: ['report', 'performance'],
        ttl: 30 * 24 * 60 * 60 * 1000
      });
      
      return report;

    } catch (error) {
      console.warn('Failed to generate performance report:', error.message);
      return null;
    }
  }

  generatePerformanceRecommendations(report) {
    const recommendations = [];
    
    // Check for overall performance degradation
    const degradingTrends = Object.values(report.trends)
      .filter(t => t.analysis?.overallAssessment === 'degrading');
    
    if (degradingTrends.length > 0) {
      recommendations.push({
        type: 'performance_degradation',
        priority: 'high',
        message: `${degradingTrends.length} hook types showing performance degradation`,
        action: 'Review recent changes and optimize slow operations'
      });
    }
    
    // Check for high error rates
    const highErrorRates = Object.entries(report.summary)
      .filter(([, summary]) => summary.errorRate > 0.05);
    
    if (highErrorRates.length > 0) {
      recommendations.push({
        type: 'high_error_rate',
        priority: 'high',
        message: `High error rates detected in ${highErrorRates.map(([type]) => type).join(', ')}`,
        action: 'Investigate and fix error sources'
      });
    }
    
    // Check for bottlenecks
    if (report.bottlenecks.length > 0) {
      recommendations.push({
        type: 'bottlenecks',
        priority: 'medium',
        message: `${report.bottlenecks.length} performance bottlenecks detected`,
        action: 'Optimize identified bottlenecks'
      });
    }
    
    return recommendations;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getCurrentMemoryUsage() {
    return process.memoryUsage().heapUsed;
  }

  average(numbers) {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }

  median(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  percentile(numbers, p) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getStats() {
    return {
      activeHooks: this.activeMetrics.size,
      totalAlerts: this.alertHistory.length,
      recentAlerts: this.alertHistory.filter(a => Date.now() - a.timestamp < 60 * 60 * 1000).length,
      memoryUsage: this.formatBytes(this.getCurrentMemoryUsage()),
      initialized: this.isInitialized
    };
  }

  async shutdown() {
    console.log('📊 Shutting down Performance Metrics Manager...');
    
    // Stop monitoring intervals
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.aggregationInterval) clearInterval(this.aggregationInterval);
    
    // Perform final aggregation
    await this.performHourlyAggregation();
    
    // Store final stats
    await this.memoryManager.store('metrics:final_stats', {
      shutdownTime: Date.now(),
      stats: this.getStats(),
      activeMetrics: Object.fromEntries(this.activeMetrics)
    }, {
      namespace: this.options.namespace,
      tags: ['shutdown', 'stats'],
      ttl: 30 * 24 * 60 * 60 * 1000
    });
    
    console.log('✅ Performance Metrics Manager shutdown complete');
  }
}

module.exports = { PerformanceMetricsManager };

// CLI usage
if (require.main === module) {
  const { MemoryPersistenceManager } = require('./memory-persistence-manager');
  
  async function testPerformanceMetrics() {
    console.log('🧪 Testing Performance Metrics Manager');
    console.log('=====================================');
    
    try {
      const memoryManager = new MemoryPersistenceManager({ logLevel: 'debug' });
      await memoryManager.initialize();
      
      const metricsManager = new PerformanceMetricsManager(memoryManager, { logLevel: 'debug' });
      await metricsManager.initialize();
      
      // Test hook execution recording
      console.log('\n1️⃣  Testing hook execution recording...');
      await metricsManager.recordHookExecution('post-edit', {
        executionTime: 250,
        success: true,
        filePath: '/test/component.tsx',
        operationType: 'write'
      });
      
      await metricsManager.recordHookExecution('pre-task', {
        executionTime: 1500,
        success: false,
        error: 'Test error',
        operationType: 'task-init'
      });
      
      console.log('✅ Hook executions recorded');
      
      // Test file operation recording
      console.log('\n2️⃣  Testing file operation recording...');
      await metricsManager.recordFileOperation('backup', '/test/file.js', {
        duration: 100,
        fileSize: 2048,
        success: true,
        compressionRatio: 0.7
      });
      
      console.log('✅ File operation recorded');
      
      // Test memory snapshot
      console.log('\n3️⃣  Testing memory snapshot...');
      const snapshot = await metricsManager.recordMemorySnapshot({ context: 'test' });
      console.log('✅ Memory snapshot recorded:', snapshot ? 'success' : 'failed');
      
      // Test bottleneck detection
      console.log('\n4️⃣  Testing bottleneck detection...');
      const bottlenecks = await metricsManager.detectBottlenecks();
      console.log(`✅ Bottleneck analysis complete: ${bottlenecks.length} issues found`);
      
      // Test performance report
      console.log('\n5️⃣  Testing performance report generation...');
      const report = await metricsManager.generatePerformanceReport(1);
      console.log('✅ Performance report generated:', report ? 'success' : 'failed');
      
      // Show stats
      console.log('\n6️⃣  Performance statistics:');
      const stats = metricsManager.getStats();
      console.log('📊 Stats:', JSON.stringify(stats, null, 2));
      
      await metricsManager.shutdown();
      await memoryManager.shutdown();
      
      console.log('\n🎉 Performance Metrics Manager Test Complete!');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  testPerformanceMetrics();
}