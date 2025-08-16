#!/usr/bin/env node

/**
 * Performance-Integrated Hook System
 * 
 * This module integrates the real-time performance monitor with the existing
 * hook system, replacing all simulated metrics with actual performance data.
 * 
 * It wraps the existing hook components with performance monitoring:
 * - ClaudeCodeFileHooks with real-time execution tracking
 * - RealPRDValidator with validation performance metrics
 * - RealErrorHandler with error handling performance data
 * - Loop prevention with attempt tracking and timing
 */

const { ClaudeCodeFileHooks } = require('../integration/claude-code-file-hooks');
const { RealTimePerformanceMonitor } = require('./real-time-performance-monitor');
const { randomUUID } = require('crypto');

class PerformanceIntegratedHooks extends ClaudeCodeFileHooks {
  constructor(options = {}) {
    super(options);
    
    this.performanceMonitor = new RealTimePerformanceMonitor({
      monitoringInterval: options.monitoringInterval || 2000,
      enableTrendAnalysis: true,
      enableAlerting: true,
      persistMetrics: options.persistMetrics !== false,
      alertThresholds: {
        hookExecutionTime: 1500, // 1.5 seconds
        memoryUsage: 0.80, // 80% memory usage
        cpuUsage: 0.75, // 75% CPU usage
        ...options.alertThresholds
      },
      ...options.performanceOptions
    });

    // Enhanced metrics tracking
    this.operationMetrics = new Map();
    this.performanceStats = {
      totalOperations: 0,
      operationsByType: new Map(),
      operationsByFile: new Map(),
      blockingStats: {
        totalBlocked: 0,
        blockingReasons: new Map(),
        averageGuidanceTime: 0
      },
      performanceAlerts: []
    };
  }

  async initialize() {
    console.log('🚀 Initializing Performance-Integrated Hook System...');
    console.log('=====================================================');
    
    // Initialize performance monitoring first
    await this.performanceMonitor.initialize();
    
    // Set up performance event handlers
    this.setupPerformanceEventHandlers();
    
    // Initialize parent hook system
    await super.initialize();
    
    console.log('✅ Performance-integrated hooks ready');
    console.log('📊 Real-time metrics collection active');
    console.log('🔔 Performance alerting enabled\n');
  }

  setupPerformanceEventHandlers() {
    // Handle performance alerts
    this.performanceMonitor.on('alert', (alert) => {
      this.handlePerformanceAlert(alert);
    });

    // Handle metric updates
    this.performanceMonitor.on('metricsUpdate', (metrics) => {
      this.updateHookPerformanceStats(metrics);
    });

    // Handle trend analysis
    this.performanceMonitor.on('trendsUpdated', (trends) => {
      this.analyzeTrendImpactOnHooks(trends);
    });
  }

  // ============================================================================
  // PERFORMANCE-MONITORED HOOK OPERATIONS
  // ============================================================================

  async executePreReadHook(filePath, options = {}) {
    const operationId = randomUUID();
    const perfOp = this.performanceMonitor.startHookOperation(
      operationId,
      'pre-read',
      filePath,
      { options }
    );

    try {
      const result = await super.executePreReadHook(filePath, options);
      
      // End performance tracking
      this.performanceMonitor.endHookOperation(operationId, {
        success: result.allowed,
        operationType: 'read',
        filePath,
        ...result
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('pre-read', filePath, result, executionTime);
      
      return result;

    } catch (error) {
      this.performanceMonitor.endHookOperation(operationId, {
        success: false,
        error: error.message,
        operationType: 'read',
        filePath
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('pre-read', filePath, { error: error.message }, executionTime);
      throw error;
    }
  }

  async executePreWriteHook(filePath, content, options = {}) {
    const operationId = randomUUID();
    const perfOp = this.performanceMonitor.startHookOperation(
      operationId,
      'pre-write',
      filePath,
      { contentLength: content?.length || 0, options }
    );

    try {
      const result = await super.executePreWriteHook(filePath, content, options);
      
      // End performance tracking with detailed results
      this.performanceMonitor.endHookOperation(operationId, {
        success: result.allowed,
        blocked: !result.allowed,
        operationType: 'write',
        filePath,
        contentLength: content?.length || 0,
        prdValidation: result.prdValidation,
        blockingReason: result.blocked ? 'PRD validation failed' : null,
        ...result
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('pre-write', filePath, result, executionTime);
      
      // Track blocking statistics
      if (!result.allowed && result.blocked) {
        this.updateBlockingStats(result);
      }
      
      return result;

    } catch (error) {
      this.performanceMonitor.endHookOperation(operationId, {
        success: false,
        blocked: error.blocking || false,
        error: error.message,
        operationType: 'write',
        filePath,
        contentLength: content?.length || 0
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('pre-write', filePath, { error: error.message }, executionTime);
      
      // Track blocking from exceptions
      if (error.blocking) {
        this.updateBlockingStats({ 
          blockingError: error.blockingError,
          agentGuidance: error.agentGuidance
        });
      }

      throw error;
    }
  }

  async executePostWriteHook(filePath, content, writeResult, options = {}) {
    const operationId = randomUUID();
    const perfOp = this.performanceMonitor.startHookOperation(
      operationId,
      'post-write',
      filePath,
      { contentLength: content?.length || 0, writeResult, options }
    );

    try {
      const result = await super.executePostWriteHook(filePath, content, writeResult, options);
      
      this.performanceMonitor.endHookOperation(operationId, {
        success: result.success,
        operationType: 'post-write',
        filePath,
        contentLength: content?.length || 0,
        ...result
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('post-write', filePath, result, executionTime);
      
      return result;

    } catch (error) {
      this.performanceMonitor.endHookOperation(operationId, {
        success: false,
        error: error.message,
        operationType: 'post-write',
        filePath,
        contentLength: content?.length || 0
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('post-write', filePath, { error: error.message }, executionTime);
      throw error;
    }
  }

  async executePreEditHook(filePath, oldString, newString, options = {}) {
    const operationId = randomUUID();
    const perfOp = this.performanceMonitor.startHookOperation(
      operationId,
      'pre-edit',
      filePath,
      { 
        changeSize: (newString?.length || 0) - (oldString?.length || 0),
        oldLength: oldString?.length || 0,
        newLength: newString?.length || 0,
        options 
      }
    );

    try {
      const result = await super.executePreEditHook(filePath, oldString, newString, options);
      
      this.performanceMonitor.endHookOperation(operationId, {
        success: result.allowed,
        blocked: !result.allowed,
        operationType: 'edit',
        filePath,
        changeSize: (newString?.length || 0) - (oldString?.length || 0),
        prdValidation: result.prdValidation,
        blockingReason: result.blocked ? 'PRD validation failed' : null,
        ...result
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('pre-edit', filePath, result, executionTime);
      
      // Track blocking statistics for edits
      if (!result.allowed && result.blocked) {
        this.updateBlockingStats(result);
      }
      
      return result;

    } catch (error) {
      this.performanceMonitor.endHookOperation(operationId, {
        success: false,
        blocked: error.blocking || false,
        error: error.message,
        operationType: 'edit',
        filePath,
        changeSize: (newString?.length || 0) - (oldString?.length || 0)
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('pre-edit', filePath, { error: error.message }, executionTime);
      
      if (error.blocking) {
        this.updateBlockingStats({ 
          blockingError: error.blockingError,
          agentGuidance: error.agentGuidance
        });
      }

      throw error;
    }
  }

  async executePostEditHook(filePath, oldString, newString, editResult, options = {}) {
    const operationId = randomUUID();
    const perfOp = this.performanceMonitor.startHookOperation(
      operationId,
      'post-edit',
      filePath,
      { 
        changeSize: (newString?.length || 0) - (oldString?.length || 0),
        editResult,
        options 
      }
    );

    try {
      const result = await super.executePostEditHook(filePath, oldString, newString, editResult, options);
      
      this.performanceMonitor.endHookOperation(operationId, {
        success: result.success,
        operationType: 'post-edit',
        filePath,
        changeSize: (newString?.length || 0) - (oldString?.length || 0),
        ...result
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('post-edit', filePath, result, executionTime);
      
      return result;

    } catch (error) {
      this.performanceMonitor.endHookOperation(operationId, {
        success: false,
        error: error.message,
        operationType: 'post-edit',
        filePath,
        changeSize: (newString?.length || 0) - (oldString?.length || 0)
      });

      const executionTime = this.performanceMonitor.getOperationExecutionTime(operationId);
      this.updateOperationStats('post-edit', filePath, { error: error.message }, executionTime);
      throw error;
    }
  }

  // ============================================================================
  // PERFORMANCE STATISTICS TRACKING
  // ============================================================================

  updateOperationStats(operationType, filePath, result, executionTime) {
    this.performanceStats.totalOperations++;
    
    // Track by operation type
    const typeStats = this.performanceStats.operationsByType.get(operationType) || {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      successCount: 0,
      errorCount: 0,
      blockedCount: 0
    };
    
    typeStats.count++;
    typeStats.totalTime += executionTime || 0;
    typeStats.averageTime = typeStats.totalTime / typeStats.count;
    
    if (result.error) {
      typeStats.errorCount++;
    } else if (result.blocked || !result.allowed) {
      typeStats.blockedCount++;
    } else {
      typeStats.successCount++;
    }
    
    this.performanceStats.operationsByType.set(operationType, typeStats);
    
    // Track by file path
    const fileStats = this.performanceStats.operationsByFile.get(filePath) || {
      count: 0,
      operations: new Map(),
      lastAccess: null
    };
    
    fileStats.count++;
    fileStats.lastAccess = Date.now();
    
    const opCount = fileStats.operations.get(operationType) || 0;
    fileStats.operations.set(operationType, opCount + 1);
    
    this.performanceStats.operationsByFile.set(filePath, fileStats);
  }

  updateBlockingStats(result) {
    this.performanceStats.blockingStats.totalBlocked++;
    
    // Track blocking reasons
    if (result.blockingError && result.blockingError.violations) {
      for (const violation of result.blockingError.violations) {
        const category = violation.category || 'unknown';
        const count = this.performanceStats.blockingStats.blockingReasons.get(category) || 0;
        this.performanceStats.blockingStats.blockingReasons.set(category, count + 1);
      }
    }
    
    // Track agent guidance timing (if available)
    if (result.agentGuidance && result.agentGuidance.generateTime) {
      const currentAvg = this.performanceStats.blockingStats.averageGuidanceTime;
      const count = this.performanceStats.blockingStats.totalBlocked;
      this.performanceStats.blockingStats.averageGuidanceTime = 
        ((currentAvg * (count - 1)) + result.agentGuidance.generateTime) / count;
    }
  }

  handlePerformanceAlert(alert) {
    this.performanceStats.performanceAlerts.push(alert);
    
    // Keep only recent alerts (last 100)
    if (this.performanceStats.performanceAlerts.length > 100) {
      this.performanceStats.performanceAlerts = this.performanceStats.performanceAlerts.slice(-100);
    }
    
    // Handle critical alerts that affect hook operations
    if (alert.severity === 'critical') {
      console.log(`🚨 CRITICAL PERFORMANCE ALERT: ${alert.message}`);
      
      // Consider temporarily disabling non-essential hooks
      if (alert.metric === 'hookExecutionTime' && alert.value > 5000) { // Over 5 seconds
        console.log('⚠️  Consider temporarily disabling hooks due to severe performance degradation');
      }
    }
  }

  updateHookPerformanceStats(metrics) {
    // Update hook-specific statistics based on overall performance metrics
    const recentExecutions = metrics.hookExecutions.slice(-10);
    const hookExecutions = recentExecutions.filter(op => 
      op.result && typeof op.result === 'object'
    );
    
    if (hookExecutions.length > 0) {
      // Calculate hook-specific metrics
      const hookTimes = hookExecutions.map(op => op.executionTime);
      const avgHookTime = hookTimes.reduce((sum, time) => sum + time, 0) / hookTimes.length;
      
      // Emit hook performance update
      this.emit('hookPerformanceUpdate', {
        averageHookTime: avgHookTime,
        recentExecutions: hookExecutions.length,
        systemHealth: metrics.aggregatedStats.systemHealth,
        timestamp: Date.now()
      });
    }
  }

  analyzeTrendImpactOnHooks(trends) {
    // Analyze how system trends affect hook performance
    if (trends.executionTime.direction === 'increasing') {
      console.log(`📈 Hook execution time trending ${trends.executionTime.direction} by ${trends.executionTime.changePercent.toFixed(1)}%`);
      
      if (trends.executionTime.changePercent > 30) {
        console.log('⚠️  Consider optimizing PRD validation rules or enabling caching');
      }
    }
    
    if (trends.blockingRate && trends.blockingRate.direction === 'increasing') {
      console.log(`🚫 Blocking rate trending ${trends.blockingRate.direction} - more operations being blocked`);
      
      if (trends.blockingRate.currentRate > 0.3) { // Over 30% blocking
        console.log('💡 High blocking rate may indicate overly strict PRD rules or coding pattern changes');
      }
    }
  }

  // ============================================================================
  // ENHANCED REPORTING
  // ============================================================================

  getHookPerformanceReport() {
    const performanceReport = this.performanceMonitor.getPerformanceReport();
    const hookStats = this.performanceStats;
    
    return {
      timestamp: Date.now(),
      monitoringDuration: Date.now() - this.performanceMonitor.startTime,
      
      // Overall performance metrics
      systemPerformance: performanceReport,
      
      // Hook-specific metrics
      hookOperations: {
        total: hookStats.totalOperations,
        byType: Object.fromEntries(hookStats.operationsByType),
        byFile: Object.fromEntries(
          Array.from(hookStats.operationsByFile.entries()).slice(0, 20) // Top 20 files
        )
      },
      
      // Blocking analysis
      blockingAnalysis: {
        totalBlocked: hookStats.blockingStats.totalBlocked,
        blockingRate: hookStats.totalOperations > 0 ? 
          hookStats.blockingStats.totalBlocked / hookStats.totalOperations : 0,
        blockingReasons: Object.fromEntries(hookStats.blockingStats.blockingReasons),
        averageGuidanceTime: hookStats.blockingStats.averageGuidanceTime
      },
      
      // Performance trends
      recentAlerts: hookStats.performanceAlerts.slice(-10),
      
      // Recommendations
      recommendations: this.generateHookPerformanceRecommendations()
    };
  }

  generateHookPerformanceRecommendations() {
    const recommendations = [];
    const stats = this.performanceStats;
    
    // Check for slow operation types
    for (const [opType, opStats] of stats.operationsByType.entries()) {
      if (opStats.averageTime > 1000) { // Over 1 second
        recommendations.push({
          type: 'performance',
          priority: 'high',
          operation: opType,
          message: `${opType} operations averaging ${Math.round(opStats.averageTime)}ms`,
          suggestion: `Optimize ${opType} hook implementation - consider caching validation results`
        });
      }
    }
    
    // Check blocking rates
    const totalOps = stats.totalOperations;
    const totalBlocked = stats.blockingStats.totalBlocked;
    const blockingRate = totalOps > 0 ? totalBlocked / totalOps : 0;
    
    if (blockingRate > 0.25) { // Over 25% blocking
      recommendations.push({
        type: 'blocking',
        priority: 'medium',
        message: `High blocking rate: ${(blockingRate * 100).toFixed(1)}% of operations blocked`,
        suggestion: 'Review PRD validation rules for overly strict requirements'
      });
    }
    
    // Check for frequently accessed files
    const sortedFiles = Array.from(stats.operationsByFile.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    
    if (sortedFiles.length > 0 && sortedFiles[0][1].count > 20) {
      recommendations.push({
        type: 'optimization',
        priority: 'low',
        message: `File ${sortedFiles[0][0]} accessed ${sortedFiles[0][1].count} times`,
        suggestion: 'Consider implementing file-specific validation caching for frequently modified files'
      });
    }
    
    return recommendations;
  }

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

  async shutdown() {
    console.log('🔌 Shutting down performance-integrated hooks...');
    
    // Generate final performance report
    const finalReport = this.getHookPerformanceReport();
    console.log('\n📊 FINAL HOOK PERFORMANCE REPORT:');
    console.log('==================================');
    console.log(`📈 Total Operations: ${finalReport.hookOperations.total}`);
    console.log(`🚫 Total Blocked: ${finalReport.blockingAnalysis.totalBlocked}`);
    console.log(`📊 Blocking Rate: ${(finalReport.blockingAnalysis.blockingRate * 100).toFixed(1)}%`);
    console.log(`🏥 System Health: ${finalReport.systemPerformance.summary.systemHealth}`);
    
    if (finalReport.recommendations.length > 0) {
      console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
      finalReport.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      });
    }
    
    // Shutdown performance monitor
    await this.performanceMonitor.shutdown();
    
    console.log('✅ Performance-integrated hooks shutdown complete');
  }
}

module.exports = { PerformanceIntegratedHooks };

// CLI usage
if (require.main === module) {
  const integratedHooks = new PerformanceIntegratedHooks({
    logLevel: 'info',
    monitoringInterval: 1000,
    persistMetrics: true,
    enableAlerting: true
  });
  
  async function demo() {
    try {
      await integratedHooks.initialize();
      
      console.log('🧪 Testing Performance-Integrated Hooks...\n');
      
      // Test various hook operations with performance monitoring
      const testOperations = [
        {
          type: 'read',
          file: '/src/components/TestComponent.tsx',
          operation: () => integratedHooks.executePreReadHook('/src/components/TestComponent.tsx')
        },
        {
          type: 'write-compliant',
          file: '/src/components/CompliantComponent.tsx',
          operation: () => integratedHooks.executePreWriteHook(
            '/src/components/CompliantComponent.tsx',
            'import { Button } from "@/components/ui/button"; export default function Test() { return <Button>Test</Button>; }'
          )
        },
        {
          type: 'write-blocked',
          file: '/src/components/BlockedComponent.tsx',
          operation: () => integratedHooks.executePreWriteHook(
            '/src/components/BlockedComponent.tsx',
            'import { Button } from "react-bootstrap"; export default function Test() { return <Button>Test</Button>; }'
          )
        },
        {
          type: 'edit',
          file: '/src/components/EditComponent.tsx',
          operation: () => integratedHooks.executePreEditHook(
            '/src/components/EditComponent.tsx',
            'old code',
            'new code'
          )
        }
      ];
      
      for (const [index, testOp] of testOperations.entries()) {
        console.log(`📋 Test ${index + 1}/4: ${testOp.type} operation`);
        
        try {
          const result = await testOp.operation();
          const status = result.allowed !== false ? '✅ ALLOWED' : '🚫 BLOCKED';
          console.log(`   ${status}`);
          
        } catch (error) {
          if (error.blocking) {
            console.log('   🚫 BLOCKED (with comprehensive guidance)');
          } else {
            console.log(`   ❌ ERROR: ${error.message}`);
          }
        }
        
        // Brief pause between operations
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Wait for performance analysis
      console.log('\n⏱️  Waiting for performance analysis...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate and display performance report
      const report = integratedHooks.getHookPerformanceReport();
      console.log('\n📊 HOOK PERFORMANCE ANALYSIS:');
      console.log('==============================');
      
      Object.entries(report.hookOperations.byType).forEach(([type, stats]) => {
        console.log(`📈 ${type}: ${stats.count} ops, avg ${Math.round(stats.averageTime)}ms`);
      });
      
      console.log(`\n🚫 Blocking Analysis:`);
      console.log(`   Total Blocked: ${report.blockingAnalysis.totalBlocked}`);
      console.log(`   Blocking Rate: ${(report.blockingAnalysis.blockingRate * 100).toFixed(1)}%`);
      
      if (Object.keys(report.blockingAnalysis.blockingReasons).length > 0) {
        console.log(`   Blocking Reasons:`);
        Object.entries(report.blockingAnalysis.blockingReasons).forEach(([reason, count]) => {
          console.log(`     - ${reason}: ${count} times`);
        });
      }
      
      console.log(`\n🏥 System Health: ${report.systemPerformance.summary.systemHealth}`);
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
    } finally {
      await integratedHooks.shutdown();
    }
  }
  
  demo();
}