#!/usr/bin/env node

/**
 * Real-Time Performance Monitor - Replaces Simulated Metrics
 * 
 * This module provides comprehensive real-time monitoring of hook system performance:
 * - Real hook execution timing and resource usage
 * - Memory consumption tracking and optimization
 * - System resource utilization monitoring
 * - Performance trend analysis and alerting
 * - Bottleneck identification and recommendations
 * - Integration with Claude Flow memory system for persistence
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { performance } = require('perf_hooks');
const { EventEmitter } = require('events');

class RealTimePerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      monitoringInterval: options.monitoringInterval || 1000, // 1 second
      metricsRetention: options.metricsRetention || 3600000, // 1 hour in ms
      alertThresholds: {
        hookExecutionTime: options.alertThresholds?.hookExecutionTime || 2000, // 2 seconds
        memoryUsage: options.alertThresholds?.memoryUsage || 0.85, // 85% of heap limit
        cpuUsage: options.alertThresholds?.cpuUsage || 0.80, // 80% CPU
        diskUsage: options.diskUsage || 0.90, // 90% disk
        ...options.alertThresholds
      },
      enableTrendAnalysis: options.enableTrendAnalysis !== false,
      enableAlerting: options.enableAlerting !== false,
      persistMetrics: options.persistMetrics !== false,
      ...options
    };

    // Real-time metrics storage
    this.metrics = {
      hookExecutions: [],
      systemResources: [],
      performanceTrends: [],
      alerts: [],
      aggregatedStats: {
        totalHookExecutions: 0,
        averageExecutionTime: 0,
        peakExecutionTime: 0,
        totalBlockedOperations: 0,
        totalValidationsPassed: 0,
        systemHealth: 'healthy',
        lastUpdated: null
      }
    };

    // Performance tracking
    this.activeOperations = new Map();
    this.systemMonitorInterval = null;
    this.isMonitoring = false;
    this.startTime = Date.now();

    // Baseline measurements
    this.baselineMetrics = null;
  }

  async initialize() {
    console.log('📊 Initializing Real-Time Performance Monitor...');
    console.log('================================================');
    
    // Establish baseline metrics
    await this.establishBaseline();
    
    // Start system monitoring
    await this.startSystemMonitoring();
    
    // Set up metric persistence if enabled
    if (this.options.persistMetrics) {
      await this.setupMetricsPersistence();
    }

    // Set up alerting system
    if (this.options.enableAlerting) {
      this.setupAlertingSystem();
    }

    console.log('✅ Real-time performance monitoring active');
    console.log(`📈 Monitoring interval: ${this.options.monitoringInterval}ms`);
    console.log(`⚠️  Alert thresholds configured for execution time, memory, CPU`);
    console.log('');
  }

  async establishBaseline() {
    console.log('📏 Establishing performance baseline...');
    
    const measurements = [];
    
    // Take multiple baseline measurements
    for (let i = 0; i < 5; i++) {
      const measurement = await this.captureSystemSnapshot();
      measurements.push(measurement);
      await this.sleep(200); // 200ms between measurements
    }

    // Calculate baseline averages
    this.baselineMetrics = {
      memory: {
        heapUsed: this.average(measurements.map(m => m.memory.heapUsed)),
        heapTotal: this.average(measurements.map(m => m.memory.heapTotal)),
        external: this.average(measurements.map(m => m.memory.external)),
        rss: this.average(measurements.map(m => m.memory.rss))
      },
      cpu: {
        loadAverage: this.average(measurements.map(m => m.cpu.loadAverage)),
        usage: this.average(measurements.map(m => m.cpu.usage))
      },
      timestamp: Date.now()
    };

    console.log(`✅ Baseline established: ${Math.round(this.baselineMetrics.memory.heapUsed / 1024 / 1024)}MB heap, ${(this.baselineMetrics.cpu.loadAverage * 100).toFixed(1)}% CPU`);
  }

  async startSystemMonitoring() {
    if (this.isMonitoring) return;

    console.log('🔄 Starting continuous system monitoring...');
    
    this.isMonitoring = true;
    
    this.systemMonitorInterval = setInterval(async () => {
      try {
        await this.collectSystemMetrics();
        await this.analyzePerformanceTrends();
        await this.checkAlertConditions();
        
        // Emit monitoring update event
        this.emit('metricsUpdate', this.getLatestMetrics());
        
      } catch (error) {
        console.error('❌ Error in system monitoring cycle:', error.message);
      }
    }, this.options.monitoringInterval);

    console.log('✅ System monitoring started');
  }

  // ============================================================================
  // REAL-TIME HOOK PERFORMANCE TRACKING
  // ============================================================================

  startHookOperation(operationId, hookType, filePath, context = {}) {
    const operation = {
      id: operationId,
      hookType,
      filePath,
      context,
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
      startTimestamp: Date.now()
    };

    this.activeOperations.set(operationId, operation);
    
    return operation;
  }

  endHookOperation(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`⚠️  Operation ${operationId} not found in active operations`);
      return null;
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const executionTime = endTime - operation.startTime;

    const completedOperation = {
      ...operation,
      endTime,
      endMemory,
      endTimestamp: Date.now(),
      executionTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - operation.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - operation.startMemory.heapTotal,
        external: endMemory.external - operation.startMemory.external,
        rss: endMemory.rss - operation.startMemory.rss
      },
      result,
      success: result.success !== false,
      blocked: result.blocked || false,
      errorOccurred: !!result.error
    };

    // Store in metrics
    this.metrics.hookExecutions.push(completedOperation);
    this.updateAggregatedStats(completedOperation);

    // Remove from active operations
    this.activeOperations.delete(operationId);

    // Clean old metrics to prevent memory leaks
    this.cleanOldMetrics();

    return completedOperation;
  }

  updateAggregatedStats(operation) {
    const stats = this.metrics.aggregatedStats;
    
    stats.totalHookExecutions++;
    
    if (operation.success) {
      stats.totalValidationsPassed++;
    }
    
    if (operation.blocked) {
      stats.totalBlockedOperations++;
    }

    // Update execution time statistics
    const allExecutions = this.metrics.hookExecutions;
    const executionTimes = allExecutions.map(op => op.executionTime);
    
    stats.averageExecutionTime = this.average(executionTimes);
    stats.peakExecutionTime = Math.max(...executionTimes);
    stats.lastUpdated = Date.now();

    // Determine system health
    stats.systemHealth = this.calculateSystemHealth();
  }

  calculateSystemHealth() {
    const recentMetrics = this.metrics.systemResources.slice(-10); // Last 10 measurements
    if (recentMetrics.length === 0) return 'unknown';

    const avgMemoryUsage = this.average(recentMetrics.map(m => m.memory.heapUsed / m.memory.heapTotal));
    const avgCpuUsage = this.average(recentMetrics.map(m => m.cpu.usage));
    
    const recentExecutions = this.metrics.hookExecutions.slice(-20); // Last 20 hook executions
    const avgExecutionTime = recentExecutions.length > 0 ? 
      this.average(recentExecutions.map(op => op.executionTime)) : 0;

    // Health scoring
    let healthScore = 100;
    
    if (avgMemoryUsage > 0.8) healthScore -= 30;
    else if (avgMemoryUsage > 0.6) healthScore -= 15;
    
    if (avgCpuUsage > 0.7) healthScore -= 25;
    else if (avgCpuUsage > 0.5) healthScore -= 10;
    
    if (avgExecutionTime > 2000) healthScore -= 20; // Over 2 seconds
    else if (avgExecutionTime > 1000) healthScore -= 10; // Over 1 second

    if (healthScore >= 80) return 'excellent';
    if (healthScore >= 60) return 'good';
    if (healthScore >= 40) return 'degraded';
    return 'critical';
  }

  // ============================================================================
  // SYSTEM RESOURCE MONITORING
  // ============================================================================

  async collectSystemMetrics() {
    const snapshot = await this.captureSystemSnapshot();
    this.metrics.systemResources.push(snapshot);
    
    // Keep only recent metrics to prevent memory bloat
    const cutoffTime = Date.now() - this.options.metricsRetention;
    this.metrics.systemResources = this.metrics.systemResources.filter(
      metric => metric.timestamp > cutoffTime
    );
  }

  async captureSystemSnapshot() {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    
    // Calculate CPU percentage (approximation)
    const totalCPU = cpuUsage.user + cpuUsage.system;
    const cpuPercent = totalCPU / (1000000 * os.cpus().length); // Rough approximation
    
    return {
      timestamp: Date.now(),
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
        heapUtilization: memory.heapUsed / memory.heapTotal
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        usage: Math.min(cpuPercent, 1), // Cap at 100%
        loadAverage: loadAverage[0] // 1-minute load average
      },
      system: {
        uptime: process.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length
      },
      activeOperations: this.activeOperations.size
    };
  }

  // ============================================================================
  // PERFORMANCE TREND ANALYSIS
  // ============================================================================

  async analyzePerformanceTrends() {
    if (!this.options.enableTrendAnalysis) return;
    
    const recentExecutions = this.metrics.hookExecutions.slice(-50); // Last 50 operations
    const recentSystemMetrics = this.metrics.systemResources.slice(-20); // Last 20 system snapshots
    
    if (recentExecutions.length < 10 || recentSystemMetrics.length < 5) {
      return; // Not enough data for trend analysis
    }

    const trends = {
      timestamp: Date.now(),
      executionTime: this.calculateExecutionTimeTrend(recentExecutions),
      memoryUsage: this.calculateMemoryTrend(recentSystemMetrics),
      successRate: this.calculateSuccessRateTrend(recentExecutions),
      blockingRate: this.calculateBlockingRateTrend(recentExecutions),
      systemLoad: this.calculateSystemLoadTrend(recentSystemMetrics)
    };

    this.metrics.performanceTrends.push(trends);
    
    // Keep only recent trends
    const trendCutoff = Date.now() - (this.options.metricsRetention / 2); // Half retention for trends
    this.metrics.performanceTrends = this.metrics.performanceTrends.filter(
      trend => trend.timestamp > trendCutoff
    );

    // Emit trend analysis event
    this.emit('trendsUpdated', trends);
  }

  calculateExecutionTimeTrend(executions) {
    const times = executions.map(op => op.executionTime);
    const firstHalf = times.slice(0, Math.floor(times.length / 2));
    const secondHalf = times.slice(Math.floor(times.length / 2));
    
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      changePercent: change,
      currentAverage: secondAvg,
      previousAverage: firstAvg
    };
  }

  calculateMemoryTrend(systemMetrics) {
    const memoryUsages = systemMetrics.map(m => m.memory.heapUtilization);
    const firstHalf = memoryUsages.slice(0, Math.floor(memoryUsages.length / 2));
    const secondHalf = memoryUsages.slice(Math.floor(memoryUsages.length / 2));
    
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      direction: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
      changePercent: change,
      currentUtilization: secondAvg,
      previousUtilization: firstAvg
    };
  }

  calculateSuccessRateTrend(executions) {
    const firstHalf = executions.slice(0, Math.floor(executions.length / 2));
    const secondHalf = executions.slice(Math.floor(executions.length / 2));
    
    const firstSuccessRate = firstHalf.filter(op => op.success).length / firstHalf.length;
    const secondSuccessRate = secondHalf.filter(op => op.success).length / secondHalf.length;
    
    return {
      direction: secondSuccessRate > firstSuccessRate ? 'improving' : 
                secondSuccessRate < firstSuccessRate ? 'declining' : 'stable',
      currentRate: secondSuccessRate,
      previousRate: firstSuccessRate,
      changePercent: ((secondSuccessRate - firstSuccessRate) / firstSuccessRate) * 100
    };
  }

  calculateBlockingRateTrend(executions) {
    const firstHalf = executions.slice(0, Math.floor(executions.length / 2));
    const secondHalf = executions.slice(Math.floor(executions.length / 2));
    
    const firstBlockRate = firstHalf.filter(op => op.blocked).length / firstHalf.length;
    const secondBlockRate = secondHalf.filter(op => op.blocked).length / secondHalf.length;
    
    return {
      direction: secondBlockRate > firstBlockRate ? 'increasing' : 
                secondBlockRate < firstBlockRate ? 'decreasing' : 'stable',
      currentRate: secondBlockRate,
      previousRate: firstBlockRate,
      changePercent: firstBlockRate === 0 ? 0 : ((secondBlockRate - firstBlockRate) / firstBlockRate) * 100
    };
  }

  calculateSystemLoadTrend(systemMetrics) {
    const loadValues = systemMetrics.map(m => m.cpu.loadAverage);
    const firstHalf = loadValues.slice(0, Math.floor(loadValues.length / 2));
    const secondHalf = loadValues.slice(Math.floor(loadValues.length / 2));
    
    const firstAvg = this.average(firstHalf);
    const secondAvg = this.average(secondHalf);
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    return {
      direction: change > 15 ? 'increasing' : change < -15 ? 'decreasing' : 'stable',
      changePercent: change,
      currentLoad: secondAvg,
      previousLoad: firstAvg
    };
  }

  // ============================================================================
  // ALERTING SYSTEM
  // ============================================================================

  setupAlertingSystem() {
    console.log('🚨 Setting up performance alerting system...');
    
    this.on('metricsUpdate', (metrics) => {
      this.checkPerformanceAlerts(metrics);
    });

    this.on('trendsUpdated', (trends) => {
      this.checkTrendAlerts(trends);
    });

    console.log('✅ Alerting system active');
  }

  checkAlertConditions() {
    const latestMetrics = this.getLatestMetrics();
    this.checkPerformanceAlerts(latestMetrics);
  }

  checkPerformanceAlerts(metrics) {
    const alerts = [];
    const thresholds = this.options.alertThresholds;
    
    // Check hook execution time
    if (metrics.aggregatedStats.averageExecutionTime > thresholds.hookExecutionTime) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `Hook execution time averaging ${Math.round(metrics.aggregatedStats.averageExecutionTime)}ms (threshold: ${thresholds.hookExecutionTime}ms)`,
        metric: 'hookExecutionTime',
        value: metrics.aggregatedStats.averageExecutionTime,
        threshold: thresholds.hookExecutionTime,
        timestamp: Date.now()
      });
    }

    // Check memory usage
    const latestSystemMetric = metrics.systemResources[metrics.systemResources.length - 1];
    if (latestSystemMetric && latestSystemMetric.memory.heapUtilization > thresholds.memoryUsage) {
      alerts.push({
        type: 'resource',
        severity: 'warning',
        message: `High memory usage: ${(latestSystemMetric.memory.heapUtilization * 100).toFixed(1)}% (threshold: ${(thresholds.memoryUsage * 100).toFixed(1)}%)`,
        metric: 'memoryUsage',
        value: latestSystemMetric.memory.heapUtilization,
        threshold: thresholds.memoryUsage,
        timestamp: Date.now()
      });
    }

    // Check CPU usage
    if (latestSystemMetric && latestSystemMetric.cpu.usage > thresholds.cpuUsage) {
      alerts.push({
        type: 'resource',
        severity: 'warning',
        message: `High CPU usage: ${(latestSystemMetric.cpu.usage * 100).toFixed(1)}% (threshold: ${(thresholds.cpuUsage * 100).toFixed(1)}%)`,
        metric: 'cpuUsage',
        value: latestSystemMetric.cpu.usage,
        threshold: thresholds.cpuUsage,
        timestamp: Date.now()
      });
    }

    // Process alerts
    for (const alert of alerts) {
      this.processAlert(alert);
    }
  }

  checkTrendAlerts(trends) {
    const alerts = [];
    
    // Alert on deteriorating execution time trends
    if (trends.executionTime.direction === 'increasing' && trends.executionTime.changePercent > 25) {
      alerts.push({
        type: 'trend',
        severity: 'warning',
        message: `Hook execution time increasing by ${trends.executionTime.changePercent.toFixed(1)}%`,
        metric: 'executionTimeTrend',
        trend: trends.executionTime,
        timestamp: Date.now()
      });
    }

    // Alert on increasing memory usage trends
    if (trends.memoryUsage.direction === 'increasing' && trends.memoryUsage.changePercent > 20) {
      alerts.push({
        type: 'trend',
        severity: 'warning',
        message: `Memory usage trending upward by ${trends.memoryUsage.changePercent.toFixed(1)}%`,
        metric: 'memoryTrend',
        trend: trends.memoryUsage,
        timestamp: Date.now()
      });
    }

    // Alert on declining success rates
    if (trends.successRate.direction === 'declining' && Math.abs(trends.successRate.changePercent) > 15) {
      alerts.push({
        type: 'trend',
        severity: 'critical',
        message: `Hook success rate declining by ${Math.abs(trends.successRate.changePercent).toFixed(1)}%`,
        metric: 'successRateTrend',
        trend: trends.successRate,
        timestamp: Date.now()
      });
    }

    // Process trend alerts
    for (const alert of alerts) {
      this.processAlert(alert);
    }
  }

  processAlert(alert) {
    // Add to alerts collection
    this.metrics.alerts.push(alert);
    
    // Keep only recent alerts
    const alertCutoff = Date.now() - this.options.metricsRetention;
    this.metrics.alerts = this.metrics.alerts.filter(
      alertItem => alertItem.timestamp > alertCutoff
    );

    // Log alert
    const severityIcon = alert.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${severityIcon} ALERT [${alert.type}]: ${alert.message}`);
    
    // Emit alert event
    this.emit('alert', alert);
  }

  // ============================================================================
  // METRICS PERSISTENCE
  // ============================================================================

  async setupMetricsPersistence() {
    console.log('💾 Setting up metrics persistence...');
    
    // Create metrics directory
    const metricsDir = path.join(process.cwd(), '.claude_workspace/metrics');
    try {
      await fs.mkdir(metricsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Set up periodic saves
    setInterval(async () => {
      try {
        await this.saveMetricsToDisk();
      } catch (error) {
        console.error('❌ Failed to save metrics:', error.message);
      }
    }, 60000); // Save every minute

    console.log('✅ Metrics persistence configured');
  }

  async saveMetricsToDisk() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const metricsPath = path.join(
      process.cwd(), 
      '.claude_workspace/metrics', 
      `performance-metrics-${timestamp}.json`
    );

    const metricsData = {
      timestamp: Date.now(),
      monitoringDuration: Date.now() - this.startTime,
      baselineMetrics: this.baselineMetrics,
      currentMetrics: this.metrics,
      summary: this.generateMetricsSummary()
    };

    await fs.writeFile(metricsPath, JSON.stringify(metricsData, null, 2));
  }

  generateMetricsSummary() {
    const executions = this.metrics.hookExecutions;
    const systemMetrics = this.metrics.systemResources;
    
    if (executions.length === 0) {
      return { message: 'No hook executions recorded yet' };
    }

    const executionTimes = executions.map(op => op.executionTime);
    const memoryDeltas = executions.map(op => op.memoryDelta.heapUsed);

    return {
      totalExecutions: executions.length,
      executionTimes: {
        average: this.average(executionTimes),
        min: Math.min(...executionTimes),
        max: Math.max(...executionTimes),
        p95: this.percentile(executionTimes, 95),
        p99: this.percentile(executionTimes, 99)
      },
      memoryImpact: {
        averageDelta: this.average(memoryDeltas),
        maxDelta: Math.max(...memoryDeltas),
        minDelta: Math.min(...memoryDeltas)
      },
      successRate: executions.filter(op => op.success).length / executions.length,
      blockingRate: executions.filter(op => op.blocked).length / executions.length,
      systemHealth: this.metrics.aggregatedStats.systemHealth,
      alertCount: this.metrics.alerts.length,
      monitoringUptime: Date.now() - this.startTime
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getLatestMetrics() {
    return {
      hookExecutions: this.metrics.hookExecutions.slice(-10), // Last 10 executions
      systemResources: this.metrics.systemResources.slice(-5), // Last 5 system snapshots
      performanceTrends: this.metrics.performanceTrends.slice(-3), // Last 3 trend analyses
      aggregatedStats: { ...this.metrics.aggregatedStats },
      alerts: this.metrics.alerts.slice(-5), // Last 5 alerts
      activeOperations: this.activeOperations.size,
      baselineMetrics: this.baselineMetrics
    };
  }

  getPerformanceReport() {
    const summary = this.generateMetricsSummary();
    const latestMetrics = this.getLatestMetrics();
    
    return {
      timestamp: Date.now(),
      monitoringDuration: Date.now() - this.startTime,
      summary,
      currentMetrics: latestMetrics,
      recommendations: this.generatePerformanceRecommendations(summary)
    };
  }

  generatePerformanceRecommendations(summary) {
    const recommendations = [];
    
    if (summary.executionTimes && summary.executionTimes.average > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider optimizing PRD validation logic - average execution time exceeds 1 second',
        suggestion: 'Profile validation rules and implement caching for frequently validated patterns'
      });
    }

    if (summary.memoryImpact && summary.memoryImpact.averageDelta > 10 * 1024 * 1024) { // 10MB
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        message: 'High memory consumption per hook execution detected',
        suggestion: 'Review object retention and implement memory cleanup in validation logic'
      });
    }

    if (summary.successRate < 0.95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Hook success rate below 95% - investigate error patterns',
        suggestion: 'Review error logs and implement better error recovery mechanisms'
      });
    }

    if (summary.alertCount > 10) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        message: 'High number of performance alerts triggered',
        suggestion: 'Review alert thresholds and optimize system resources'
      });
    }

    return recommendations;
  }

  cleanOldMetrics() {
    const cutoffTime = Date.now() - this.options.metricsRetention;
    
    this.metrics.hookExecutions = this.metrics.hookExecutions.filter(
      execution => execution.endTimestamp > cutoffTime
    );
    
    // System resources are cleaned in collectSystemMetrics()
    // Performance trends are cleaned in analyzePerformanceTrends()
    // Alerts are cleaned in processAlert()
  }

  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  percentile(numbers, p) {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    console.log('🔌 Shutting down performance monitor...');
    
    this.isMonitoring = false;
    
    if (this.systemMonitorInterval) {
      clearInterval(this.systemMonitorInterval);
      this.systemMonitorInterval = null;
    }

    // Save final metrics if persistence is enabled
    if (this.options.persistMetrics) {
      await this.saveMetricsToDisk();
    }

    console.log('✅ Performance monitor shutdown complete');
  }
}

module.exports = { RealTimePerformanceMonitor };

// CLI usage
if (require.main === module) {
  const monitor = new RealTimePerformanceMonitor({
    monitoringInterval: 2000, // 2 seconds for demo
    enableTrendAnalysis: true,
    enableAlerting: true,
    persistMetrics: true
  });
  
  async function demo() {
    try {
      await monitor.initialize();
      
      console.log('🧪 Running performance monitoring demo...\n');
      
      // Simulate hook operations for testing
      for (let i = 0; i < 10; i++) {
        const operationId = `demo-op-${i}`;
        const operation = monitor.startHookOperation(
          operationId, 
          'pre-write', 
          `/test/component-${i}.tsx`
        );
        
        // Simulate hook execution time
        await monitor.sleep(Math.random() * 500 + 100); // 100-600ms
        
        const result = {
          success: Math.random() > 0.1, // 90% success rate
          blocked: Math.random() > 0.8, // 20% blocking rate
          validationsPassed: Math.floor(Math.random() * 5) + 1
        };
        
        monitor.endHookOperation(operationId, result);
        
        console.log(`📊 Operation ${i + 1}/10 completed (${Math.round(operation.executionTime)}ms)`);
      }
      
      // Wait for some monitoring cycles
      await monitor.sleep(5000);
      
      // Generate performance report
      const report = monitor.getPerformanceReport();
      console.log('\n📈 PERFORMANCE REPORT:');
      console.log('======================');
      console.log(`📊 Total Executions: ${report.summary.totalExecutions}`);
      console.log(`⏱️  Average Time: ${Math.round(report.summary.executionTimes.average)}ms`);
      console.log(`✅ Success Rate: ${(report.summary.successRate * 100).toFixed(1)}%`);
      console.log(`🚫 Blocking Rate: ${(report.summary.blockingRate * 100).toFixed(1)}%`);
      console.log(`🏥 System Health: ${report.summary.systemHealth}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n💡 RECOMMENDATIONS:');
        report.recommendations.forEach((rec, i) => {
          console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
    } finally {
      await monitor.shutdown();
    }
  }
  
  demo();
}